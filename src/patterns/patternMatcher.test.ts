/**
 * patternMatcher.ts のユニットテスト
 */

import {
  analyzeRecord,
  analyzeRecords,
  filterByRiskLevel,
  sortByRiskScore,
} from './patternMatcher';
import { DNSRecord, PatternConfig, RiskLevel } from '../types/dns';

// モックパターン設定
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
    low: 30,
    base: 10,
  },
  thresholds: {
    critical: 90,
    high: 70,
    medium: 50,
    low: 30,
    safe: 0,
  },
};

// モックDNSレコード（最近の日付を使用して日付ペナルティを回避）
const mockDNSRecord: DNSRecord = {
  name: 'example.com',
  type: 'A',
  content: '192.168.1.1',
  ttl: 300,
  proxied: false,
  created: '2023-01-15T10:00:00Z',
  modified: new Date().toISOString(), // 現在の日付を使用
};

describe('patternMatcher', () => {
  describe('analyzeRecord', () => {
    it('パターンにマッチしないレコードのリスクスコアは基本スコアのみ', () => {
      const result = analyzeRecord(mockDNSRecord, mockPatternConfig);

      expect(result.riskScore).toBe(10); // base score only (最近の日付なので追加スコアなし)
      expect(result.riskLevel).toBe('safe');
      expect(result.matchedPatterns).toHaveLength(0);
    });

    it('高リスクプレフィックスを検出する', () => {
      const record = { ...mockDNSRecord, name: 'old-api.example.com' };
      const result = analyzeRecord(record, mockPatternConfig);

      expect(result.riskScore).toBe(90); // base(10) + high(80)
      expect(result.riskLevel).toBe('critical');
      expect(result.matchedPatterns).toContain('prefix:old-');
      expect(result.reasons).toContain(
        '危険なプレフィックス「old-」が検出されました',
      );
    });

    it('中リスクサフィックスを検出する', () => {
      const record = { ...mockDNSRecord, name: 'api-backup.example.com' };
      const result = analyzeRecord(record, mockPatternConfig);

      expect(result.riskScore).toBe(60); // base(10) + medium(50)
      expect(result.riskLevel).toBe('medium');
      expect(result.matchedPatterns).toContain('suffix:-backup');
    });

    it('低リスクキーワードを検出する', () => {
      const record = { ...mockDNSRecord, name: 'upcoming-feature.example.com' };
      const result = analyzeRecord(record, mockPatternConfig);

      expect(result.riskScore).toBe(40); // base(10) + low(30)
      expect(result.riskLevel).toBe('low');
      expect(result.matchedPatterns).toContain('keyword:upcoming');
    });

    it('複数のパターンマッチでスコアが累積する', () => {
      const record = {
        ...mockDNSRecord,
        name: 'old-system-backup.example.com',
      };
      const result = analyzeRecord(record, mockPatternConfig);

      // base(10) + high prefix(80) + medium suffix(50) = 140
      expect(result.riskScore).toBe(140);
      expect(result.riskLevel).toBe('critical');
      expect(result.matchedPatterns).toHaveLength(2);
    });

    it('1年以上更新されていないレコードに追加スコアを付与', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);
      const record = { ...mockDNSRecord, modified: oldDate.toISOString() };
      const result = analyzeRecord(record, mockPatternConfig);

      expect(result.riskScore).toBeGreaterThan(10); // base + age penalty
      expect(result.reasons.some(r => r.includes('最終更新から'))).toBe(true);
    });

    it('CNAMEレコードに追加スコアを付与', () => {
      const record = { ...mockDNSRecord, type: 'CNAME' };
      const result = analyzeRecord(record, mockPatternConfig);

      expect(result.riskScore).toBe(15); // base(10) + CNAME(5)
      expect(result.reasons).toContain(
        'CNAMEレコードは参照先の変更に注意が必要です',
      );
    });

    it('大文字小文字を区別せずにマッチング', () => {
      const record = { ...mockDNSRecord, name: 'OLD-API.EXAMPLE.COM' };
      const result = analyzeRecord(record, mockPatternConfig);

      expect(result.matchedPatterns).toContain('prefix:old-');
    });
  });

  describe('analyzeRecords', () => {
    it('複数のレコードを一度に分析できる', () => {
      const records = [
        mockDNSRecord,
        { ...mockDNSRecord, name: 'old-api.example.com' },
        { ...mockDNSRecord, name: 'backup-db.example.com' },
      ];

      const results = analyzeRecords(records, mockPatternConfig);

      expect(results).toHaveLength(3);
      expect(results[0].riskScore).toBe(10); // safe
      expect(results[1].riskScore).toBe(90); // critical
      expect(results[2].riskScore).toBe(60); // medium
    });
  });

  describe('filterByRiskLevel', () => {
    const results = [
      { riskLevel: 'safe' as RiskLevel, riskScore: 10 },
      { riskLevel: 'low' as RiskLevel, riskScore: 40 },
      { riskLevel: 'medium' as RiskLevel, riskScore: 60 },
      { riskLevel: 'high' as RiskLevel, riskScore: 80 },
      { riskLevel: 'critical' as RiskLevel, riskScore: 100 },
    ].map(r => ({
      ...r,
      record: mockDNSRecord,
      matchedPatterns: [],
      reasons: [],
    }));

    it('指定したリスクレベル以上のレコードをフィルタリング', () => {
      const filtered = filterByRiskLevel(results, 'medium');

      expect(filtered).toHaveLength(3); // medium, high, critical
      expect(
        filtered.every(r =>
          ['medium', 'high', 'critical'].includes(r.riskLevel),
        ),
      ).toBe(true);
    });

    it('criticalを指定した場合はcriticalのみ', () => {
      const filtered = filterByRiskLevel(results, 'critical');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].riskLevel).toBe('critical');
    });

    it('safeを指定した場合はすべて含む', () => {
      const filtered = filterByRiskLevel(results, 'safe');

      expect(filtered).toHaveLength(5);
    });
  });

  describe('sortByRiskScore', () => {
    const results = [
      { riskScore: 50 },
      { riskScore: 100 },
      { riskScore: 30 },
      { riskScore: 80 },
    ].map(r => ({
      ...r,
      record: mockDNSRecord,
      riskLevel: 'medium' as RiskLevel,
      matchedPatterns: [],
      reasons: [],
    }));

    it('デフォルトで降順ソート', () => {
      const sorted = sortByRiskScore(results);

      expect(sorted[0].riskScore).toBe(100);
      expect(sorted[1].riskScore).toBe(80);
      expect(sorted[2].riskScore).toBe(50);
      expect(sorted[3].riskScore).toBe(30);
    });

    it('昇順ソートも可能', () => {
      const sorted = sortByRiskScore(results, false);

      expect(sorted[0].riskScore).toBe(30);
      expect(sorted[1].riskScore).toBe(50);
      expect(sorted[2].riskScore).toBe(80);
      expect(sorted[3].riskScore).toBe(100);
    });

    it('元の配列を変更しない', () => {
      const originalLength = results.length;
      sortByRiskScore(results);

      expect(results).toHaveLength(originalLength);
      expect(results[0].riskScore).toBe(50); // 元の順序を保持
    });
  });
});

// テスト終了後のクリーンアップ
afterAll(() => {
  // モックをクリア
  jest.clearAllMocks();
});
