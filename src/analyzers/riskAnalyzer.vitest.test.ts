import { SpyInstance } from "vitest";
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
import { IAnalysisResult, RiskLevel } from '../types/dns';
import { createMockDNSRecord } from '../../test/utils/test-helpers';

// モックデータ作成ヘルパー
const createMockResult = (
  name: string,
  riskScore: number,
  riskLevel: RiskLevel,
  patterns: string[] = [],
  modified: string = '2024-01-01T00:00:00Z',
): IAnalysisResult => ({
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
  matchedPatterns: patterns,
});

describe('riskAnalyzer', () => {
  describe('generateAnalysisSummary', () => {
    it('空の結果配列でサマリーを生成できる', () => {
      const summary = generateAnalysisSummary([], 0);
      
      expect(summary).toEqual({
        totalRecords: 0,
        riskDistribution: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          safe: 0,
        },
        topRiskyRecords: [],
        processingTime: 0,
      });
    });

    it('複数の結果から正しいサマリーを生成できる', () => {
      const results: IAnalysisResult[] = [
        createMockResult('test-api', 80, 'critical', ['test']),
        createMockResult('old-service', 65, 'high', ['old']),
        createMockResult('www', 30, 'medium'),
        createMockResult('mail', 10, 'low'),
      ];

      const summary = generateAnalysisSummary(results, 1.5);
      
      expect(summary.totalRecords).toBe(4);
      expect(summary.riskDistribution.critical).toBe(1);
      expect(summary.riskDistribution.high).toBe(1);
      expect(summary.riskDistribution.medium).toBe(1);
      expect(summary.riskDistribution.low).toBe(1);
      expect(summary.processingTime).toBe(1.5);
      expect(summary.topRiskyRecords).toHaveLength(4);
    });
  });

  describe('getRiskLevelColor', () => {
    it.each([
      ['critical', 'red'],
      ['high', 'redBright'],
      ['medium', 'yellow'],
      ['low', 'blue'],
    ])('リスクレベル %s に対して色 %s を返す', (level, expectedColor) => {
      const colorInfo = getRiskLevelColor(level as RiskLevel);
      expect(colorInfo.color).toBe(expectedColor);
      expect(colorInfo.symbol).toBeDefined();
      expect(colorInfo.label).toBeDefined();
    });
  });

  describe('getRecommendedForDeletion', () => {
    it('criticalとhighレベルのレコード数を返す', () => {
      const results: IAnalysisResult[] = [
        createMockResult('test1', 80, 'critical'),
        createMockResult('test2', 65, 'high'),
        createMockResult('test3', 30, 'medium'),
        createMockResult('test4', 10, 'low'),
        createMockResult('test5', 90, 'critical'),
      ];

      expect(getRecommendedForDeletion(results)).toHaveLength(3);
    });
  });

  describe('calculateStatistics', () => {
    it('統計情報を正しく計算する', () => {
      const results: IAnalysisResult[] = [
        createMockResult('test1', 80, 'critical'),
        createMockResult('test2', 60, 'high'),
        createMockResult('test3', 40, 'medium'),
        createMockResult('test4', 20, 'low'),
      ];

      const stats = calculateStatistics(results);
      
      expect(stats.averageRiskScore).toBe(50);
      expect(stats.medianRiskScore).toBeDefined();
      expect(stats.maxRiskScore).toBe(80);
      expect(stats.minRiskScore).toBe(20);
      expect(stats.riskScoreDistribution).toBeDefined();
    });
  });

  describe('getCommonRiskPatterns', () => {
    it('頻出パターンを正しく抽出する', () => {
      const results: IAnalysisResult[] = [
        createMockResult('test1', 80, 'critical', ['test', 'old']),
        createMockResult('test2', 65, 'high', ['test', 'temp']),
        createMockResult('test3', 30, 'medium', ['test']),
        createMockResult('test4', 10, 'low', ['old']),
      ];

      const patterns = getCommonRiskPatterns(results);
      
      expect(patterns).toHaveLength(3);
      expect(patterns[0]).toEqual({ pattern: 'test', count: 3, percentage: 75 });
      expect(patterns[1]).toEqual({ pattern: 'old', count: 2, percentage: 50 });
      expect(patterns[2]).toEqual({ pattern: 'temp', count: 1, percentage: 25 });
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
      const results: IAnalysisResult[] = [
        createMockResult('recent', 50, 'medium', [], '2023-12-01T00:00:00Z'), // 1ヶ月前
        createMockResult('old', 70, 'high', [], '2023-01-01T00:00:00Z'), // 1年前
        createMockResult('very-old', 90, 'critical', [], '2022-01-01T00:00:00Z'), // 2年前
      ];

      const analysis = analyzeRiskByTime(results);
      
      expect(analysis.oldestRecords).toHaveLength(3);
      expect(analysis.newestRecords).toHaveLength(3);
      expect(analysis.yearlyRiskDistribution).toBeDefined();
    });
  });
});