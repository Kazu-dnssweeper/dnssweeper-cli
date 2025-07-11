/**
 * riskAnalyzer.ts のユニットテスト（Vitest版）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateAnalysisSummary,
  getRiskLevelColor,
  getRecommendedForDeletion,
  calculateStatistics,
  getCommonRiskPatterns,
  analyzeRiskByTime,
} from './riskAnalyzer';
import { AnalysisResult, RiskLevel } from '../types/dns';
import { createMockDNSRecord } from '../../test/utils/test-helpers';

// モックデータ作成ヘルパー
const createMockResult = (
  name: string,
  riskScore: number,
  riskLevel: RiskLevel,
  patterns: string[] = [],
  modified: string = '2024-01-01T00:00:00Z',
): AnalysisResult => ({
  record: createMockDNSRecord({
    name,
    type: 'A',
    content: '192.168.1.1',
    ttl: 300,
    proxied: false,
    created: '2023-01-01T00:00:00Z',
    modified,
  }),
  riskScore,
  riskLevel,
  reasons: patterns.map(p => `パターンマッチ: ${p}`),
  patterns,
  isReservedIP: true,
});

describe('riskAnalyzer', () => {
  describe('generateAnalysisSummary', () => {
    it('空の結果配列でサマリーを生成できる', () => {
      const summary = generateAnalysisSummary([]);
      
      expect(summary).toEqual({
        totalRecords: 0,
        riskLevels: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        stats: {
          averageRiskScore: 0,
          recommendedForDeletion: 0,
          percentageByRisk: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
        },
        commonPatterns: [],
      });
    });

    it('複数の結果から正しいサマリーを生成できる', () => {
      const results: AnalysisResult[] = [
        createMockResult('test-api', 80, 'critical', ['test']),
        createMockResult('old-service', 65, 'high', ['old']),
        createMockResult('www', 30, 'medium'),
        createMockResult('mail', 10, 'low'),
      ];

      const summary = generateAnalysisSummary(results);
      
      expect(summary.totalRecords).toBe(4);
      expect(summary.riskLevels.critical).toBe(1);
      expect(summary.riskLevels.high).toBe(1);
      expect(summary.riskLevels.medium).toBe(1);
      expect(summary.riskLevels.low).toBe(1);
      expect(summary.stats.averageRiskScore).toBe(46.25);
      expect(summary.stats.recommendedForDeletion).toBe(2); // critical + high
    });
  });

  describe('getRiskLevelColor', () => {
    it.each([
      ['critical', 'red'],
      ['high', 'yellow'],
      ['medium', 'blue'],
      ['low', 'green'],
    ])('リスクレベル %s に対して色 %s を返す', (level, expectedColor) => {
      const mockChalk = {
        red: vi.fn((str: string) => `red(${str})`),
        yellow: vi.fn((str: string) => `yellow(${str})`),
        blue: vi.fn((str: string) => `blue(${str})`),
        green: vi.fn((str: string) => `green(${str})`),
      };

      // chalkのモックを一時的に置き換え
      vi.doMock('chalk', () => ({ default: mockChalk }));
      
      const color = getRiskLevelColor(level as RiskLevel);
      expect(color('test')).toContain(expectedColor);
    });
  });

  describe('getRecommendedForDeletion', () => {
    it('criticalとhighレベルのレコード数を返す', () => {
      const results: AnalysisResult[] = [
        createMockResult('test1', 80, 'critical'),
        createMockResult('test2', 65, 'high'),
        createMockResult('test3', 30, 'medium'),
        createMockResult('test4', 10, 'low'),
        createMockResult('test5', 90, 'critical'),
      ];

      expect(getRecommendedForDeletion(results)).toBe(3);
    });
  });

  describe('calculateStatistics', () => {
    it('統計情報を正しく計算する', () => {
      const results: AnalysisResult[] = [
        createMockResult('test1', 80, 'critical'),
        createMockResult('test2', 60, 'high'),
        createMockResult('test3', 40, 'medium'),
        createMockResult('test4', 20, 'low'),
      ];

      const stats = calculateStatistics(results);
      
      expect(stats.averageRiskScore).toBe(50);
      expect(stats.recommendedForDeletion).toBe(2);
      expect(stats.percentageByRisk.critical).toBe(25);
      expect(stats.percentageByRisk.high).toBe(25);
      expect(stats.percentageByRisk.medium).toBe(25);
      expect(stats.percentageByRisk.low).toBe(25);
    });
  });

  describe('getCommonRiskPatterns', () => {
    it('頻出パターンを正しく抽出する', () => {
      const results: AnalysisResult[] = [
        createMockResult('test1', 80, 'critical', ['test', 'old']),
        createMockResult('test2', 65, 'high', ['test', 'temp']),
        createMockResult('test3', 30, 'medium', ['test']),
        createMockResult('test4', 10, 'low', ['old']),
      ];

      const patterns = getCommonRiskPatterns(results);
      
      expect(patterns).toHaveLength(3);
      expect(patterns[0]).toEqual({ pattern: 'test', count: 3 });
      expect(patterns[1]).toEqual({ pattern: 'old', count: 2 });
      expect(patterns[2]).toEqual({ pattern: 'temp', count: 1 });
    });
  });

  describe('analyzeRiskByTime', () => {
    beforeEach(() => {
      // 現在時刻を固定
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('古いレコードに高いリスクスコアを付ける', () => {
      const results: AnalysisResult[] = [
        createMockResult('recent', 50, 'medium', [], '2023-12-01T00:00:00Z'), // 1ヶ月前
        createMockResult('old', 70, 'high', [], '2023-01-01T00:00:00Z'), // 1年前
        createMockResult('very-old', 90, 'critical', [], '2022-01-01T00:00:00Z'), // 2年前
      ];

      const analysis = analyzeRiskByTime(results);
      
      expect(analysis.averageAge).toBeGreaterThan(0);
      expect(analysis.oldestRecord?.record.name).toBe('very-old');
      expect(analysis.staleRecords).toBe(2); // 1年以上古いレコード
    });
  });
});