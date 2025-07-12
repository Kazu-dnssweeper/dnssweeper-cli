/**
 * formatter.ts のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, vi, type SpyInstance } from 'vitest';
import {
  formatAsJSON,
  formatAsCSV,
  formatAsDetailedCSV,
  printAnalysisSummary,
  printAnalysisTable,
} from './formatter';
import { IAnalysisResult, IAnalysisSummary, RiskLevel } from '../types/dns';

// モックデータ作成ヘルパー
const createMockResult = (
  name: string,
  riskScore: number,
  riskLevel: RiskLevel,
): IAnalysisResult => ({
  record: {
    name,
    type: 'A',
    content: '192.168.1.1',
    ttl: 300,
    proxied: false,
    created: '2023-01-01T00:00:00Z',
    modified: '2024-01-01T00:00:00Z',
  },
  riskScore,
  riskLevel,
  matchedPatterns: ['prefix:test-'],
  reasons: ['危険なプレフィックス「test-」が検出されました'],
});

const mockSummary: IAnalysisSummary = {
  totalRecords: 3,
  riskDistribution: {
    critical: 1,
    high: 1,
    medium: 0,
    low: 0,
    safe: 1,
  },
  topRiskyRecords: [
    createMockResult('critical.com', 100, 'critical'),
    createMockResult('high.com', 80, 'high'),
  ],
  processingTime: 1.5,
};

const mockResults: IAnalysisResult[] = [
  createMockResult('critical.com', 100, 'critical'),
  createMockResult('high.com', 80, 'high'),
  createMockResult('safe.com', 10, 'safe'),
];

describe('formatter', () => {
  // printIAnalysisSummaryとprintAnalysisTableのテストはconsole.logをモック
  let consoleSpy: SpyInstance;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('formatAsJSON', () => {
    it('正しいJSON形式で出力する', () => {
      const json = formatAsJSON(mockResults, mockSummary);
      const parsed = JSON.parse(json);

      expect(parsed.summary).toEqual(mockSummary);
      expect(parsed.results).toHaveLength(3);
      expect(parsed.results[0].record.name).toBe('critical.com');
      expect(parsed.results[0].analysis.riskScore).toBe(100);
      expect(parsed.results[0].analysis.riskLevel).toBe('critical');
    });

    it('空の結果でも正常に処理される', () => {
      const emptySummary: IAnalysisSummary = {
        totalRecords: 0,
        riskDistribution: { critical: 0, high: 0, medium: 0, low: 0, safe: 0 },
        topRiskyRecords: [],
        processingTime: 0.1,
      };

      const json = formatAsJSON([], emptySummary);
      const parsed = JSON.parse(json);

      expect(parsed.summary.totalRecords).toBe(0);
      expect(parsed.results).toHaveLength(0);
    });

    it('日本語の理由が正しくエンコードされる', () => {
      const json = formatAsJSON(mockResults, mockSummary);
      const parsed = JSON.parse(json);

      expect(parsed.results[0].analysis.reasons[0]).toContain(
        '危険なプレフィックス',
      );
      expect(parsed.results[0].analysis.reasons).toHaveLength(1);
    });

    it('複数のパターンと理由を正しく処理する', () => {
      const testResult = {
        ...mockResults[0],
        matchedPatterns: ['prefix:old-', 'suffix:-test', 'keyword:deprecated'],
        reasons: ['理由1', '理由2', '理由3'],
      };

      const json = formatAsJSON([testResult], mockSummary);
      const parsed = JSON.parse(json);

      expect(parsed.results[0].analysis.matchedPatterns).toHaveLength(3);
      expect(parsed.results[0].analysis.reasons).toHaveLength(3);
    });

    it('特殊文字を含むデータを正しく処理する', () => {
      const specialResult = {
        ...mockResults[0],
        record: {
          ...mockResults[0].record,
          name: 'test"quotes.com',
          content: 'content\\with\\backslashes',
        },
        reasons: ['理由「特殊文字」含む'],
      };

      const json = formatAsJSON([specialResult], mockSummary);
      const parsed = JSON.parse(json);

      expect(parsed.results[0].record.name).toBe('test"quotes.com');
      expect(parsed.results[0].record.content).toBe(
        'content\\with\\backslashes',
      );
    });

    it('大量のデータでも正しく処理される', () => {
      const manyResults = Array(500)
        .fill(0)
        .map((_, i) => createMockResult(`test${i}.com`, 60, 'high'));

      const json = formatAsJSON(manyResults, mockSummary);
      const parsed = JSON.parse(json);

      expect(parsed.results).toHaveLength(500);
      expect(parsed.results[0].record.name).toBe('test0.com');
      expect(parsed.results[499].record.name).toBe('test499.com');
    });
  });

  describe('formatAsCSV', () => {
    it('正しいCSV形式で出力する', () => {
      const csv = formatAsCSV(mockResults);
      const lines = csv.split('\n');

      // ヘッダー行をチェック
      expect(lines[0]).toBe(
        'Name,Type,Content,TTL,Proxied,Created,Modified,RiskScore,RiskLevel,MatchedPatterns,Reasons',
      );

      // データ行をチェック
      expect(lines[1]).toContain('critical.com,A,192.168.1.1,300,false');
      expect(lines[1]).toContain('100,critical');
      expect(lines[1]).toContain('prefix:test-');
      expect(lines[1]).toContain('危険なプレフィックス');
    });

    it('空の結果でヘッダーのみ出力する', () => {
      const csv = formatAsCSV([]);
      const lines = csv.split('\n');

      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe(
        'Name,Type,Content,TTL,Proxied,Created,Modified,RiskScore,RiskLevel,MatchedPatterns,Reasons',
      );
    });

    it('複数のパターンと理由をセミコロンで区切る', () => {
      const resultWithMultiple = {
        ...mockResults[0],
        matchedPatterns: ['prefix:old-', 'suffix:-test', 'keyword:deprecated'],
        reasons: ['理由1', '理由2', '理由3'],
      };

      const csv = formatAsCSV([resultWithMultiple]);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('prefix:old-;suffix:-test;keyword:deprecated');
      expect(lines[1]).toContain('理由1;理由2;理由3');
    });

    it('特殊文字を含むデータも正しく処理される', () => {
      const specialResult = {
        ...mockResults[0],
        record: {
          ...mockResults[0].record,
          name: 'test,with"comma.com',
          content: 'content;with:semicolon',
        },
        reasons: ['理由,カンマ付き', '理由"クォート付き'],
      };

      const csv = formatAsCSV([specialResult]);

      // CSVとして正常に処理されることを確認
      expect(csv).toContain('test,with"comma.com');
      expect(csv).toContain('content;with:semicolon');
    });

    it('異なるレコードタイプを正しく処理する', () => {
      const mixedResults = [
        {
          ...mockResults[0],
          record: { ...mockResults[0].record, type: 'A' },
        },
        {
          ...mockResults[1],
          record: { ...mockResults[1].record, type: 'CNAME' },
        },
        {
          ...mockResults[2],
          record: { ...mockResults[2].record, type: 'MX' },
        },
      ];

      const csv = formatAsCSV(mixedResults);

      expect(csv).toContain(',A,');
      expect(csv).toContain(',CNAME,');
      expect(csv).toContain(',MX,');
    });

    it('TTL値が正しく処理される', () => {
      const ttlResults = [
        {
          ...mockResults[0],
          record: { ...mockResults[0].record, ttl: 300 },
        },
        {
          ...mockResults[1],
          record: { ...mockResults[1].record, ttl: 3600 },
        },
        {
          ...mockResults[2],
          record: { ...mockResults[2].record, ttl: 86400 },
        },
      ];

      const csv = formatAsCSV(ttlResults);

      expect(csv).toContain(',300,');
      expect(csv).toContain(',3600,');
      expect(csv).toContain(',86400,');
    });

    it('プロキシ設定が正しく処理される', () => {
      const proxyResults = [
        {
          ...mockResults[0],
          record: { ...mockResults[0].record, proxied: true },
        },
        {
          ...mockResults[1],
          record: { ...mockResults[1].record, proxied: false },
        },
      ];

      const csv = formatAsCSV(proxyResults);

      expect(csv).toContain(',true,');
      expect(csv).toContain(',false,');
    });

    it('日付形式が正しく処理される', () => {
      const dateResults = [
        {
          ...mockResults[0],
          record: {
            ...mockResults[0].record,
            created: '2023-01-15T10:00:00Z',
            modified: '2024-01-15T10:00:00Z',
          },
        },
      ];

      const csv = formatAsCSV(dateResults);

      expect(csv).toContain('2023-01-15T10:00:00Z');
      expect(csv).toContain('2024-01-15T10:00:00Z');
    });

    it('大量のデータでも正しく処理される', () => {
      const manyResults = Array(1000)
        .fill(0)
        .map((_, i) => createMockResult(`test${i}.com`, 60, 'high'));

      const csv = formatAsCSV(manyResults);
      const lines = csv.split('\n');

      // ヘッダー + データ行数を確認
      expect(lines.length).toBe(1001); // ヘッダー1行 + データ1000行
      expect(lines[0]).toContain('Name,Type,Content');
      expect(lines[1]).toContain('test0.com');
      expect(lines[1000]).toContain('test999.com');
    });
  });

  describe('formatAsDetailedCSV', () => {
    it('運用フロー対応の詳細CSV（日本語）を正しく出力する', () => {
      const csv = formatAsDetailedCSV(mockResults, 'ja');
      const lines = csv.split('\n');

      // ヘッダーコメントを確認
      expect(lines[0]).toBe('# DNSweeper分析結果 - 月次DNS棚卸し用');
      expect(lines[1]).toBe(
        '# 使用方法: 1.Cloudflare UIで使用状況確認 2.削除判断記入 3.削除実行',
      );

      // ヘッダー行を確認
      expect(lines[2]).toContain('ドメイン名,レコードタイプ,コンテンツ');
      expect(lines[2]).toContain('使用状況確認,削除判断,削除実行日,備考');

      // データ行を確認
      expect(lines[3]).toContain('"critical.com",A,"192.168.1.1"');
      expect(lines[3]).toContain('クリティカル');
      expect(lines[3]).toContain(',,,,'); // 空の手動入力用フィールド
    });

    it('運用フロー対応の詳細CSV（英語）を正しく出力する', () => {
      const csv = formatAsDetailedCSV(mockResults, 'en');
      const lines = csv.split('\n');

      // ヘッダーコメントを確認
      expect(lines[0]).toBe('# DNSweeper Analysis Results - Monthly DNS Audit');
      expect(lines[1]).toBe(
        '# Usage: 1.Check usage in Cloudflare UI 2.Fill deletion decision 3.Execute deletion',
      );

      // ヘッダー行を確認（英語）
      expect(lines[2]).toContain('Domain Name,Record Type,Content');
      expect(lines[2]).toContain(
        'Usage Check,Delete Decision,Deletion Date,Notes',
      );

      // データ行を確認
      expect(lines[3]).toContain('"critical.com",A,"192.168.1.1"');
      expect(lines[3]).toContain('Critical');
    });

    it('空の結果配列でも正しくヘッダーを出力する', () => {
      const csv = formatAsDetailedCSV([], 'ja');
      const lines = csv.split('\n');

      expect(lines[0]).toBe('# DNSweeper分析結果 - 月次DNS棚卸し用');
      expect(lines[2]).toContain('ドメイン名,レコードタイプ');
      expect(lines).toHaveLength(3); // コメント2行 + ヘッダー1行
    });

    it('プロキシ設定を正しく変換する', () => {
      const testResult = {
        ...mockResults[0],
        record: { ...mockResults[0].record, proxied: true },
      };

      const csv = formatAsDetailedCSV([testResult], 'ja');
      expect(csv).toContain(',YES,');

      const testResult2 = {
        ...mockResults[0],
        record: { ...mockResults[0].record, proxied: false },
      };

      const csv2 = formatAsDetailedCSV([testResult2], 'ja');
      expect(csv2).toContain(',NO,');
    });

    it('複数のパターンと理由を正しく結合する', () => {
      const testResult = {
        ...mockResults[0],
        matchedPatterns: ['prefix:test-', 'suffix:-old'],
        reasons: ['理由1', '理由2', '理由3'],
      };

      const csv = formatAsDetailedCSV([testResult], 'ja');
      expect(csv).toContain('"prefix:test-; suffix:-old"');
      expect(csv).toContain('"理由1; 理由2; 理由3"');
    });

    it('特殊文字を含むドメイン名を正しく処理する', () => {
      const specialResult = createMockResult(
        'test-domain_with.special-chars.com',
        80,
        'high',
      );

      const csv = formatAsDetailedCSV([specialResult], 'ja');
      expect(csv).toContain('"test-domain_with.special-chars.com"');
    });

    it('長いreason文字列を正しく処理する', () => {
      const longReason = 'これは非常に長い理由の説明です。'.repeat(10);
      const testResult = {
        ...mockResults[0],
        reasons: [longReason],
      };

      const csv = formatAsDetailedCSV([testResult], 'ja');
      expect(csv).toContain(longReason);
    });

    it('HTMLエスケープが必要な文字を正しく処理する', () => {
      const testResult = {
        ...mockResults[0],
        record: {
          ...mockResults[0].record,
          content: '<script>alert("test")</script>',
        },
        reasons: ['HTMLタグ<script>が含まれています'],
      };

      const csv = formatAsDetailedCSV([testResult], 'ja');
      expect(csv).toContain('<script>alert("test")</script>');
      expect(csv).toContain('HTMLタグ<script>が含まれています');
    });

    it('すべてのリスクレベルを正しく表示する', () => {
      const allRiskResults = [
        createMockResult('critical.com', 100, 'critical'),
        createMockResult('high.com', 80, 'high'),
        createMockResult('medium.com', 60, 'medium'),
        createMockResult('low.com', 40, 'low'),
        createMockResult('safe.com', 10, 'safe'),
      ];

      const csv = formatAsDetailedCSV(allRiskResults, 'ja');
      expect(csv).toContain('クリティカル');
      expect(csv).toContain('高リスク');
      expect(csv).toContain('中リスク');
      expect(csv).toContain('低リスク');
      expect(csv).toContain('安全');
    });

    it('英語版ですべてのリスクレベルを正しく表示する', () => {
      const allRiskResults = [
        createMockResult('critical.com', 100, 'critical'),
        createMockResult('high.com', 80, 'high'),
        createMockResult('medium.com', 60, 'medium'),
        createMockResult('low.com', 40, 'low'),
        createMockResult('safe.com', 10, 'safe'),
      ];

      const csv = formatAsDetailedCSV(allRiskResults, 'en');
      expect(csv).toContain('Critical');
      expect(csv).toContain('High Risk');
      expect(csv).toContain('Medium Risk');
      expect(csv).toContain('Low Risk');
      expect(csv).toContain('Safe');
    });

    it('空のパターンと理由を正しく処理する', () => {
      const testResult = {
        ...mockResults[0],
        matchedPatterns: [],
        reasons: [],
      };

      const csv = formatAsDetailedCSV([testResult], 'ja');
      expect(csv).toContain('""'); // 空の文字列として出力
    });

    it('大量のデータでも正しく処理される', () => {
      const manyResults = Array(1000)
        .fill(0)
        .map((_, i) => createMockResult(`test${i}.example.com`, 60, 'high'));

      const csv = formatAsDetailedCSV(manyResults, 'ja');
      const lines = csv.split('\n');

      // ヘッダー + データ行数を確認
      expect(lines.length).toBe(1003); // コメント2行 + ヘッダー1行 + データ1000行
    });
  });

  describe('printAnalysisSummary', () => {
    it('日本語版で正しく出力される', () => {
      printAnalysisSummary(mockSummary, false, 'ja');

      expect(consoleSpy).toHaveBeenCalled();

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('分析結果サマリー');
      expect(calls).toContain('総レコード数');
      expect(calls).toContain('処理時間');
      expect(calls).toContain('リスク分布');
    });

    it('英語版で正しく出力される', () => {
      printAnalysisSummary(mockSummary, false, 'en');

      expect(consoleSpy).toHaveBeenCalled();

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('Analysis Summary');
      expect(calls).toContain('Total records');
      expect(calls).toContain('Processing time');
      expect(calls).toContain('Risk Distribution');
    });

    it('verboseモードで追加情報が出力される', () => {
      printAnalysisSummary(mockSummary, true, 'ja');

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('高リスクレコード');
    });

    it('高リスクレコードが0件の場合の表示', () => {
      const noHighRiskSummary: IAnalysisSummary = {
        totalRecords: 3,
        riskDistribution: { critical: 0, high: 0, medium: 2, low: 1, safe: 0 },
        topRiskyRecords: [],
        processingTime: 1.0,
      };

      printAnalysisSummary(noHighRiskSummary, false, 'ja');

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('✅');
    });

    it('空の結果でも正常に処理される', () => {
      const emptySummary: IAnalysisSummary = {
        totalRecords: 0,
        riskDistribution: { critical: 0, high: 0, medium: 0, low: 0, safe: 0 },
        topRiskyRecords: [],
        processingTime: 0.1,
      };

      printAnalysisSummary(emptySummary, false, 'ja');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('printAnalysisTable', () => {
    it('日本語版で正しく出力される', () => {
      printAnalysisTable(mockResults, 10, 'medium', 'ja');

      expect(consoleSpy).toHaveBeenCalled();

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('詳細分析結果');
      expect(calls).toContain('レコード名');
      expect(calls).toContain('リスク');
    });

    it('英語版で正しく出力される', () => {
      printAnalysisTable(mockResults, 10, 'medium', 'en');

      expect(consoleSpy).toHaveBeenCalled();

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('Detailed Analysis Results');
      expect(calls).toContain('Record Name');
      expect(calls).toContain('Risk');
    });

    it('limitが適用される', () => {
      const manyResults = Array(50)
        .fill(0)
        .map((_, i) => createMockResult(`test${i}.com`, 60, 'high'));

      printAnalysisTable(manyResults, 5, 'medium', 'ja');

      expect(consoleSpy).toHaveBeenCalled();

      const calls = consoleSpy.mock.calls.flat().join(' ');
      // 5件のレコードのみが表示されることを確認
      expect(calls.match(/test\d+\.com/g)?.length).toBeLessThanOrEqual(5);
    });

    it('minDisplayLevel未満のレコードは表示されない', () => {
      const mixedResults = [
        createMockResult('critical.com', 100, 'critical'),
        createMockResult('high.com', 80, 'high'),
        createMockResult('medium.com', 60, 'medium'),
        createMockResult('low.com', 40, 'low'),
        createMockResult('safe.com', 10, 'safe'),
      ];

      printAnalysisTable(mixedResults, 10, 'high', 'ja');

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('critical.com');
      expect(calls).toContain('high.com');
      expect(calls).not.toContain('medium.com');
      expect(calls).not.toContain('low.com');
      expect(calls).not.toContain('safe.com');
    });

    it('空の結果配列でも正常に処理される', () => {
      printAnalysisTable([], 10, 'medium', 'ja');

      expect(consoleSpy).toHaveBeenCalled();

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('表示する結果がありません');
    });
  });
});

// テスト終了後のクリーンアップ
afterAll(() => {
  // console.logモックの復元
  vi.restoreAllMocks();
});
