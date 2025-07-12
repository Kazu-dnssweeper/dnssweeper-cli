import { SpyInstance } from "vitest";
/**
 * riskAnalyzer.ts のユニットテスト
 */

import {
  generateAnalysisSummary,
  getRiskLevelColor,
  getRecommendedForDeletion,
  calculateStatistics,
  getCommonRiskPatterns,
  analyzeRiskByTime,
} from './riskAnalyzer';
import { IAnalysisResult, RiskLevel } from '../types/dns';

// モックデータ作成ヘルパー
const createMockResult = (
  name: string,
  riskScore: number,
  riskLevel: RiskLevel,
  patterns: string[] = [],
  modified: string = '2024-01-01T00:00:00Z',
): IAnalysisResult => ({
  record: {
    name,
    type: 'A',
    content: '192.168.1.1',
    ttl: 300,
    proxied: false,
    created: '2023-01-01T00:00:00Z',
    modified,
  },
  riskScore,
  riskLevel,
  matchedPatterns: patterns,
  reasons: ['テスト理由'],
});

describe('riskAnalyzer', () => {
  describe('generateAnalysisSummary', () => {
    const mockResults: IAnalysisResult[] = [
      createMockResult('critical.com', 100, 'critical'),
      createMockResult('high1.com', 80, 'high'),
      createMockResult('high2.com', 75, 'high'),
      createMockResult('medium.com', 60, 'medium'),
      createMockResult('low.com', 40, 'low'),
      createMockResult('safe1.com', 10, 'safe'),
      createMockResult('safe2.com', 5, 'safe'),
    ];

    it('正しいサマリーを生成する', () => {
      const summary = generateAnalysisSummary(mockResults, 1.5);

      expect(summary.totalRecords).toBe(7);
      expect(summary.processingTime).toBe(1.5);
      expect(summary.riskDistribution).toEqual({
        critical: 1,
        high: 2,
        medium: 1,
        low: 1,
        safe: 2,
      });
    });

    it('高リスクレコードのトップ10を抽出する', () => {
      const summary = generateAnalysisSummary(mockResults, 1.0);

      expect(summary.topRiskyRecords).toHaveLength(5); // safe以外の5件
      expect(summary.topRiskyRecords[0].riskScore).toBe(100);
      expect(summary.topRiskyRecords[1].riskScore).toBe(80);
    });

    it('空の結果でもエラーが発生しない', () => {
      const summary = generateAnalysisSummary([], 0.1);

      expect(summary.totalRecords).toBe(0);
      expect(summary.topRiskyRecords).toHaveLength(0);
      expect(summary.riskDistribution).toEqual({
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        safe: 0,
      });
    });
  });

  describe('getRiskLevelColor', () => {
    it('各リスクレベルに対して正しい色情報を返す', () => {
      const critical = getRiskLevelColor('critical');
      expect(critical.color).toBe('red');
      expect(critical.symbol).toBe('🔴');
      expect(critical.label).toBe('クリティカル');

      const safe = getRiskLevelColor('safe');
      expect(safe.color).toBe('green');
      expect(safe.symbol).toBe('🟢');
      expect(safe.label).toBe('安全');
    });
  });

  describe('getRecommendedForDeletion', () => {
    const mockResults: IAnalysisResult[] = [
      createMockResult('critical.com', 100, 'critical'),
      createMockResult('high.com', 80, 'high'),
      createMockResult('medium.com', 60, 'medium'),
      createMockResult('low.com', 40, 'low'),
      createMockResult('safe.com', 10, 'safe'),
    ];

    it('デフォルトでhigh以上を削除推奨として返す', () => {
      const recommended = getRecommendedForDeletion(mockResults);

      expect(recommended).toHaveLength(2);
      expect(
        recommended.every(r => ['high', 'critical'].includes(r.riskLevel)),
      ).toBe(true);
    });

    it('指定したリスクレベル以上を返す', () => {
      const recommended = getRecommendedForDeletion(mockResults, 'medium');

      expect(recommended).toHaveLength(3);
      expect(
        recommended.every(r =>
          ['medium', 'high', 'critical'].includes(r.riskLevel),
        ),
      ).toBe(true);
    });
  });

  describe('calculateStatistics', () => {
    const mockResults: IAnalysisResult[] = [
      createMockResult('r1', 100, 'critical'),
      createMockResult('r2', 80, 'high'),
      createMockResult('r3', 60, 'medium'),
      createMockResult('r4', 40, 'low'),
      createMockResult('r5', 20, 'safe'),
    ];

    it('正しい統計情報を計算する', () => {
      const stats = calculateStatistics(mockResults);

      expect(stats.averageRiskScore).toBe(60);
      expect(stats.medianRiskScore).toBe(60);
      expect(stats.maxRiskScore).toBe(100);
      expect(stats.minRiskScore).toBe(20);
    });

    it('スコア分布を正しく計算する', () => {
      const stats = calculateStatistics(mockResults);

      expect(stats.riskScoreDistribution['20-29']).toBe(1);
      expect(stats.riskScoreDistribution['40-49']).toBe(1);
      expect(stats.riskScoreDistribution['60-69']).toBe(1);
      expect(stats.riskScoreDistribution['80-89']).toBe(1);
      expect(stats.riskScoreDistribution['100-109']).toBe(1);
    });

    it('空の結果でも安全に処理される', () => {
      const stats = calculateStatistics([]);

      expect(stats.averageRiskScore).toBe(0);
      expect(stats.medianRiskScore).toBe(0);
      expect(stats.maxRiskScore).toBe(0);
      expect(stats.minRiskScore).toBe(0);
      expect(stats.riskScoreDistribution).toEqual({});
    });
  });

  describe('getCommonRiskPatterns', () => {
    const mockResults: IAnalysisResult[] = [
      createMockResult('r1', 100, 'critical', ['prefix:old-', 'suffix:-test']),
      createMockResult('r2', 80, 'high', ['prefix:old-']),
      createMockResult('r3', 60, 'medium', [
        'prefix:old-',
        'keyword:deprecated',
      ]),
      createMockResult('r4', 40, 'low', ['suffix:-test']),
    ];

    it('最も一般的なパターンを抽出する', () => {
      const patterns = getCommonRiskPatterns(mockResults);

      expect(patterns[0].pattern).toBe('prefix:old-');
      expect(patterns[0].count).toBe(3);
      expect(patterns[0].percentage).toBe(75.0);

      expect(patterns[1].pattern).toBe('suffix:-test');
      expect(patterns[1].count).toBe(2);
      expect(patterns[1].percentage).toBe(50.0);
    });

    it('最大10件まで返す', () => {
      const manyPatterns: IAnalysisResult[] = [];
      for (let i = 0; i < 15; i++) {
        manyPatterns.push(
          createMockResult(`r${i}`, 50, 'medium', [`pattern${i}`]),
        );
      }

      const patterns = getCommonRiskPatterns(manyPatterns);
      expect(patterns.length).toBeLessThanOrEqual(10);
    });
  });

  describe('analyzeRiskByTime', () => {
    const mockResults: IAnalysisResult[] = [
      createMockResult('r1', 100, 'critical', [], '2022-01-01T00:00:00Z'),
      createMockResult('r2', 80, 'high', [], '2022-06-01T00:00:00Z'),
      createMockResult('r3', 60, 'medium', [], '2023-01-01T00:00:00Z'),
      createMockResult('r4', 40, 'low', [], '2023-06-01T00:00:00Z'),
      createMockResult('r5', 20, 'safe', [], '2024-01-01T00:00:00Z'),
    ];

    it('年別のリスク分布を計算する', () => {
      const analysis = analyzeRiskByTime(mockResults);

      expect(analysis.yearlyRiskDistribution['2022']).toEqual({
        critical: 1,
        high: 1,
        medium: 0,
        low: 0,
        safe: 0,
      });

      expect(analysis.yearlyRiskDistribution['2023']).toEqual({
        critical: 0,
        high: 0,
        medium: 1,
        low: 1,
        safe: 0,
      });
    });

    it('最も古いレコードと新しいレコードを抽出する', () => {
      const analysis = analyzeRiskByTime(mockResults);

      expect(analysis.oldestRecords).toHaveLength(5);
      expect(analysis.oldestRecords[0].record.modified).toBe(
        '2022-01-01T00:00:00Z',
      );

      expect(analysis.newestRecords).toHaveLength(5);
      expect(analysis.newestRecords[0].record.modified).toBe(
        '2024-01-01T00:00:00Z',
      );
    });
  });
});

// テスト終了後のクリーンアップ
afterAll(() => {
  // モックをクリア
  vi.clearAllMocks();
});
