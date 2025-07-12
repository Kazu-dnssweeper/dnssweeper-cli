/**
 * analyzeコマンドのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi, type SpyInstance } from 'vitest';
import { analyzeCommand } from './analyze';
import { parseDNSRecordsFromCSV } from '../parsers/csvParser';
import { loadPatternConfig } from '../patterns/patternLoader';
import { analyzeRecords, sortByRiskScore, filterByRiskLevel } from '../patterns/patternMatcher';
import { generateAnalysisSummary } from '../analyzers/riskAnalyzer';
import * as formatter from '../utils/formatter';
import { getMessages } from '../utils/messages';
import { promises as fs } from 'fs';
import path from 'path';

// モック
vi.mock('../parsers/csvParser');
vi.mock('../patterns/patternLoader');
vi.mock('../patterns/patternMatcher');
vi.mock('../analyzers/riskAnalyzer');
// formatterは後でspyOnするため、ここではモックしない
vi.mock('../utils/messages');

// 型付きモック
const mockParseDNSRecordsFromCSV = parseDNSRecordsFromCSV as vi.MockedFunction<typeof parseDNSRecordsFromCSV>;
const mockLoadPatternConfig = loadPatternConfig as vi.MockedFunction<typeof loadPatternConfig>;
const mockAnalyzeRecords = analyzeRecords as vi.MockedFunction<typeof analyzeRecords>;
const mockSortByRiskScore = sortByRiskScore as vi.MockedFunction<typeof sortByRiskScore>;
const mockFilterByRiskLevel = filterByRiskLevel as vi.MockedFunction<typeof filterByRiskLevel>;
const mockGenerateAnalysisSummary = generateAnalysisSummary as vi.MockedFunction<typeof generateAnalysisSummary>;
const mockGetMessages = getMessages as vi.MockedFunction<typeof getMessages>;

describe('analyzeCommand', () => {
  const testFile = path.join(__dirname, '../../../test/temp/test.csv');
  const outputFile = path.join(__dirname, '../../../test/temp/output.csv');

  beforeEach(async () => {
    // テスト用ディレクトリ作成
    await fs.mkdir(path.dirname(testFile), { recursive: true });
    
    // テスト用CSVファイル作成
    await fs.writeFile(testFile, 'Name,Type,Content,TTL\ntest.example.com,A,192.168.1.1,300\napi.example.com,A,192.168.1.2,300');

    // モックの設定
    mockGetMessages.mockReturnValue({
      app: {
        title: '🔍 DNSweeper CLI - DNS レコード分析ツール',
        target: '分析対象',
        outputFormat: '出力形式',
        analyzing: '分析中...',
        analysisComplete: '分析完了',
        executionTime: '実行時間',
      },
      analysis: {
        executionComplete: '✅ 実行完了:',
        summary: '分析結果サマリー',
        totalRecords: '総レコード数',
        processingTime: '処理時間',
        riskDistribution: 'リスク分布',
        deleteRecommended: '削除推奨',
        noHighRisk: '高リスクなし',
        topRiskyRecords: '高リスクレコード',
        detailedResults: '詳細結果',
      },
      riskLevels: {
        critical: 'クリティカル',
        high: '高',
        medium: '中',
        low: '低',
        safe: '安全',
      },
      errors: {
        analysisFailure: '分析失敗',
        fileNotFound: 'ファイルが見つかりません',
        invalidFormat: '不正な形式',
        processingError: '処理エラー',
      },
      reasons: {
        dangerousPrefix: '危険なプレフィックス',
        dangerousSuffix: '危険なサフィックス',
        dangerousKeyword: '危険なキーワード',
        lastModified: '最終更新',
        cnameWarning: 'CNAME警告',
        noSpecialIssues: '特別な問題なし',
        obsoleteSuffix: '古いサフィックス',
        deprecatedKeyword: '非推奨キーワード',
        longUnused: '長期未使用',
        recentCreation: '最近作成',
        activelyUsed: 'アクティブ使用中',
      },
      fileOperations: {
        resultsSaved: '結果を保存しました',
        savingResults: '結果を保存中',
        saveError: '保存エラー',
      },
      tableHeaders: {
        name: '名前',
        type: 'タイプ',
        riskScore: 'リスクスコア',
        riskLevel: 'リスクレベル',
        matchedPatterns: 'パターン',
        reasons: '理由',
      },
    });

    mockParseDNSRecordsFromCSV.mockResolvedValue([
      { name: 'test.example.com', type: 'A', content: '192.168.1.1', ttl: 300, proxied: false, created: '', modified: '' },
      { name: 'api.example.com', type: 'A', content: '192.168.1.2', ttl: 300, proxied: false, created: '', modified: '' },
    ]);

    mockLoadPatternConfig.mockResolvedValue({
      version: '1.0.0',
      description: 'テストパターン',
      patterns: {
        prefixes: { high: ['test-'], medium: ['dev-'], low: ['new-'] },
        suffixes: { high: ['-test'], medium: ['-dev'], low: ['-new'] },
        keywords: { high: ['test'], medium: ['dev'], low: ['new'] },
      },
      scoring: { high: 80, medium: 50, low: 30, base: 10 },
      thresholds: { critical: 90, high: 70, medium: 50, low: 30, safe: 0 },
    });

    mockAnalyzeRecords.mockReturnValue([
      {
        record: { name: 'test.example.com', type: 'A', content: '192.168.1.1', ttl: 300, proxied: false, created: '', modified: '' },
        riskScore: 90,
        matchedPatterns: ['test-'],
        reasons: ['危険なプレフィックス「test-」が検出されました'],
        riskLevel: 'critical',
      },
      {
        record: { name: 'api.example.com', type: 'A', content: '192.168.1.2', ttl: 300, proxied: false, created: '', modified: '' },
        riskScore: 10,
        matchedPatterns: [],
        reasons: [],
        riskLevel: 'low',
      },
    ]);

    mockSortByRiskScore.mockImplementation((results) => [...results].sort((a, b) => b.riskScore - a.riskScore));
    mockFilterByRiskLevel.mockImplementation((results) => results);

    mockGenerateAnalysisSummary.mockReturnValue({
      totalRecords: 2,
      riskDistribution: { critical: 1, high: 0, medium: 0, low: 1, safe: 0 },
      topRiskyRecords: [],
      processingTime: 0.1,
    });

    // formatterのモック設定
    vi.spyOn(formatter, 'printAnalysisSummary').mockImplementation(() => {});
    vi.spyOn(formatter, 'printAnalysisTable').mockImplementation(() => {});
    vi.spyOn(formatter, 'formatAsJSON').mockReturnValue('{}');
    vi.spyOn(formatter, 'formatAsCSV').mockReturnValue('CSV出力');
    vi.spyOn(formatter, 'formatAsDetailedCSV').mockReturnValue('詳細CSV');
  });

  afterEach(async () => {
    // モックをリストア
    vi.restoreAllMocks();
  });

  describe('基本機能', () => {
    it('正常な分析が実行される', async () => {
      const options = { output: 'table' as const };

      await expect(analyzeCommand([testFile], options)).resolves.not.toThrow();
    });

    it('英語オプションが動作する', async () => {
      const options = { output: 'table' as const, english: true };

      await expect(analyzeCommand([testFile], options)).resolves.not.toThrow();
    });

    it('verboseオプションが動作する', async () => {
      const options = { output: 'table' as const, verbose: true };

      await expect(analyzeCommand([testFile], options)).resolves.not.toThrow();
    });
  });

  describe('リスクレベルフィルタリング', () => {
    it('risk-levelオプションでフィルタリングが実行される', async () => {
      const options = { output: 'table' as const, riskLevel: 'high' as const };

      await expect(analyzeCommand([testFile], options)).resolves.not.toThrow();
    });

    it('各リスクレベルでフィルタリングできる', async () => {
      const riskLevels = ['critical', 'high', 'medium', 'low'] as const;

      for (const riskLevel of riskLevels) {
        const options = { output: 'table' as const, riskLevel };
        await expect(analyzeCommand([testFile], options)).resolves.not.toThrow();
      }
    });
  });

  describe('ファイル出力機能', () => {
    it('output-fileオプションでCSVファイルが出力される', async () => {
      const options = {
        output: 'table' as const,
        outputFile: outputFile,
      };

      await analyzeCommand([testFile], options);

      // ファイルが作成されたことを確認
      const fileExists = await fs.access(outputFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('英語モードでoutput-file出力ができる', async () => {
      const options = {
        output: 'table' as const,
        english: true,
        outputFile: path.join(__dirname, '../../../test/temp/output-en.csv'),
      };

      await analyzeCommand([testFile], options);

      // ファイルが作成されたことを確認
      const fileExists = await fs.access(options.outputFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('risk-levelとoutput-fileを組み合わせて使用できる', async () => {
      const options = {
        output: 'table' as const,
        riskLevel: 'high' as const,
        outputFile: path.join(__dirname, '../../../test/temp/high-risk.csv'),
      };

      await analyzeCommand([testFile], options);

      // ファイルが作成されたことを確認
      const fileExists = await fs.access(options.outputFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });
  });

  describe('出力形式', () => {
    it('JSON形式で出力できる', async () => {
      const options = { output: 'json' as const };

      await expect(analyzeCommand([testFile], options)).resolves.not.toThrow();
    });

    it('CSV形式で出力できる', async () => {
      const options = { output: 'csv' as const };

      await expect(analyzeCommand([testFile], options)).resolves.not.toThrow();
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないファイルでエラーが発生する', async () => {
      mockParseDNSRecordsFromCSV.mockRejectedValue(new Error('ファイルが見つかりません'));
      
      const options = { output: 'table' as const };

      await expect(
        analyzeCommand(['nonexistent.csv'], options),
      ).rejects.toThrow('ファイルが見つかりません');
    });

    it('不正なCSVファイルでエラーが発生する', async () => {
      await fs.writeFile('invalid.csv', 'invalid,csv,data');
      mockParseDNSRecordsFromCSV.mockRejectedValue(new Error('CSVパースエラー'));

      const options = { output: 'table' as const };

      await expect(
        analyzeCommand(['invalid.csv'], options),
      ).rejects.toThrow('CSVパースエラー');
    });
  });

  describe('複数ファイル対応', () => {
    it('複数のCSVファイルを同時に分析できる', async () => {
      const testFile2 = path.join(__dirname, '../../../test/temp/test2.csv');
      await fs.writeFile(testFile2, 'Name,Type,Content,TTL\ndev.example.com,A,192.168.1.3,300');

      const options = { output: 'table' as const };

      await expect(analyzeCommand([testFile, testFile2], options)).resolves.not.toThrow();
      
      // parseIDNSRecordsFromCSVが2回呼ばれたことを確認
      expect(mockParseDNSRecordsFromCSV).toHaveBeenCalledTimes(2);
    });
  });

  describe('カスタムパターン対応', () => {
    it('カスタムパターンファイルを指定できる', async () => {
      const customPatternFile = path.join(__dirname, '../../../test/temp/custom-patterns.json');
      await fs.writeFile(customPatternFile, JSON.stringify({
        version: '1.0.0',
        description: 'カスタムパターン',
        patterns: {
          prefixes: { high: ['custom-'], medium: [], low: [] },
          suffixes: { high: [], medium: [], low: [] },
          keywords: { high: [], medium: [], low: [] },
        },
        scoring: { high: 90, medium: 60, low: 30, base: 10 },
        thresholds: { critical: 90, high: 70, medium: 50, low: 30, safe: 0 },
      }));

      const options = { 
        output: 'table' as const,
        patterns: customPatternFile,
      };

      await expect(analyzeCommand([testFile], options)).resolves.not.toThrow();
      
      // loadIPatternConfigがカスタムファイルパスで呼ばれたことを確認
      expect(mockLoadPatternConfig).toHaveBeenCalledWith(customPatternFile);
    });
  });
});