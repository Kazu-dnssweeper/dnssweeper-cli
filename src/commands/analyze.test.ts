/**
 * analyzeコマンドのテスト
 */

import { analyzeCommand } from './analyze';
import { promises as fs } from 'fs';
import { jest } from '@jest/globals';
import path from 'path';
import { PatternConfig } from '../types/dns';

// パターン設定のモック
const mockPatternConfig: PatternConfig = {
  version: '1.0.0',
  description: 'テスト用パターン',
  patterns: {
    prefixes: {
      high: ['old-', 'temp-', 'test-'],
      medium: ['backup-', 'legacy-'],
      low: ['new-', 'beta-'],
    },
    suffixes: {
      high: ['-old', '-temp', '-test'],
      medium: ['-backup', '-legacy'],
      low: ['-new', '-beta'],
    },
    keywords: {
      high: ['obsolete', 'deprecated'],
      medium: ['archive'],
      low: ['upcoming'],
    },
  },
  scoring: {
    high: 80,
    medium: 50,
    low: 20,
    base: 10,
  },
  thresholds: {
    critical: 90,
    high: 70,
    medium: 40,
    low: 10,
    safe: 0,
  },
};

jest.mock('../patterns/patternLoader');

// テスト用のCSVコンテンツ生成
const createTestCSVContent = (records: any[]) => {
  const header = 'Name,Type,Content,TTL,Proxied,Created,Modified';
  const rows = records.map(
    record =>
      `${record.name},${record.type},${record.content},${record.ttl},${record.proxied},${record.created},${record.modified}`,
  );
  return [header, ...rows].join('\n');
};

// テスト用データ
const testRecords = [
  {
    name: 'test.example.com',
    type: 'A',
    content: '192.168.1.1',
    ttl: 300,
    proxied: false,
    created: '2023-01-15T10:00:00Z',
    modified: new Date().toISOString(),
  },
  {
    name: 'api.example.com',
    type: 'A',
    content: '192.168.1.2',
    ttl: 300,
    proxied: true,
    created: '2023-01-15T10:00:00Z',
    modified: new Date().toISOString(),
  },
];

describe('analyzeCommand', () => {
  const tempDir = path.join(__dirname, '../../test/temp');
  const testFile = path.join(tempDir, 'test.csv');
  const outputFile = path.join(tempDir, 'output.csv');

  beforeEach(async () => {
    // モック関数をリセット
    jest.clearAllMocks();

    // fs操作をモック
    const csvContent = createTestCSVContent(testRecords);
    jest.spyOn(fs, 'access').mockResolvedValue(undefined);
    jest.spyOn(fs, 'readFile').mockResolvedValue(csvContent);
    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

    // パターン設定をモック
    const { loadPatternConfig } = require('../patterns/patternLoader');
    loadPatternConfig.mockResolvedValue(mockPatternConfig);
  });

  afterEach(async () => {
    // モックをリストア
    jest.restoreAllMocks();
  });

  describe('基本機能', () => {
    it('正常な分析が実行される', async () => {
      const options = { output: 'table' as const };

      await expect(analyzeCommand(testFile, options)).resolves.not.toThrow();
    });

    it('英語オプションが動作する', async () => {
      const options = { output: 'table' as const, english: true };

      await expect(analyzeCommand(testFile, options)).resolves.not.toThrow();
    });

    it('verboseオプションが動作する', async () => {
      const options = { output: 'table' as const, verbose: true };

      await expect(analyzeCommand(testFile, options)).resolves.not.toThrow();
    });
  });

  describe('リスクレベルフィルタリング', () => {
    it('risk-levelオプションでフィルタリングが実行される', async () => {
      const options = { output: 'table' as const, riskLevel: 'high' as const };

      await expect(analyzeCommand(testFile, options)).resolves.not.toThrow();
    });

    it('各リスクレベルでフィルタリングできる', async () => {
      const riskLevels = ['critical', 'high', 'medium', 'low'] as const;

      for (const riskLevel of riskLevels) {
        const options = { output: 'table' as const, riskLevel };
        await expect(analyzeCommand(testFile, options)).resolves.not.toThrow();
      }
    });
  });

  describe('ファイル出力機能', () => {
    it('output-fileオプションでCSVファイルが出力される', async () => {
      const options = {
        output: 'table' as const,
        outputFile: outputFile,
      };

      await analyzeCommand(testFile, options);

      expect(fs.writeFile).toHaveBeenCalledWith(
        outputFile,
        expect.stringContaining('DNSweeper分析結果'),
      );
    });

    it('英語モードでの出力ファイルが正しく生成される', async () => {
      const outputFileEn = path.join(tempDir, 'output-en.csv');
      const options = {
        output: 'table' as const,
        outputFile: outputFileEn,
        english: true,
      };

      await analyzeCommand(testFile, options);

      expect(fs.writeFile).toHaveBeenCalledWith(
        outputFileEn,
        expect.stringContaining('DNSweeper Analysis Results'),
      );
    });

    it('リスクレベルフィルタリングと出力ファイルの組み合わせが動作する', async () => {
      const highRiskFile = path.join(tempDir, 'high-risk.csv');
      const options = {
        output: 'table' as const,
        riskLevel: 'high' as const,
        outputFile: highRiskFile,
      };

      await analyzeCommand(testFile, options);

      expect(fs.writeFile).toHaveBeenCalledWith(
        highRiskFile,
        expect.stringContaining('DNSweeper分析結果'),
      );
    });
  });

  describe('出力形式', () => {
    it('JSON出力が動作する', async () => {
      const options = { output: 'json' as const };

      await expect(analyzeCommand(testFile, options)).resolves.not.toThrow();
    });

    it('CSV出力が動作する', async () => {
      const options = { output: 'csv' as const };

      await expect(analyzeCommand(testFile, options)).resolves.not.toThrow();
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないファイルでエラーが発生する', async () => {
      // fs.accessをリジェクトするようにオーバーライド
      jest
        .spyOn(fs, 'access')
        .mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const options = { output: 'table' as const };

      await expect(
        analyzeCommand('nonexistent.csv', options),
      ).rejects.toThrow();
    });

    it('不正なCSVファイルでも処理が続行される', async () => {
      // 不正なCSVコンテンツを返すようにオーバーライド（必須フィールドが不足）
      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest
        .spyOn(fs, 'readFile')
        .mockResolvedValue('invalid,csv,content\nwithout,proper,headers');

      const options = { output: 'table' as const };

      // CSVパーサーは不正なレコードを警告してフィルタリングし、処理を続行する
      await expect(
        analyzeCommand('invalid.csv', options),
      ).resolves.not.toThrow();
    });
  });
});

// テスト終了後のクリーンアップ
afterAll(() => {
  // ファイルシステム関連のモックをクリア
  jest.restoreAllMocks();
  
  // 一時ファイルのクリーンアップ
  const tempDir = path.join(process.cwd(), 'test', 'temp');
  fs.rmdir(tempDir, { recursive: true }).catch(() => {
    // エラーは無視（ディレクトリが存在しない場合）
  });
});
