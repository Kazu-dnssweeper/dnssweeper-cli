/**
 * リスク分析機能
 */

import { IAnalysisResult, IAnalysisSummary, RiskLevel } from '../types/dns';

/**
 * 分析結果のサマリーを生成
 * @param results - 分析結果の配列
 * @param processingTime - 処理時間（秒）
 * @returns 分析サマリー
 */
export function generateAnalysisSummary(
  results: IAnalysisResult[],
  processingTime: number,
): IAnalysisSummary {
  const riskDistribution = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    safe: 0,
  };

  // リスクレベル別の集計
  for (const result of results) {
    riskDistribution[result.riskLevel]++;
  }

  // 高リスクレコードトップ10を取得
  const topRiskyRecords = results
    .filter(result => result.riskLevel !== 'safe')
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10);

  return {
    totalRecords: results.length,
    riskDistribution,
    topRiskyRecords,
    processingTime,
  };
}

/**
 * リスクレベルの色分け情報を取得
 * @param riskLevel - リスクレベル
 * @returns 色分け情報
 */
export function getRiskLevelColor(riskLevel: RiskLevel): {
  color: string;
  symbol: string;
  label: string;
} {
  switch (riskLevel) {
  case 'critical':
    return { color: 'red', symbol: '🔴', label: 'クリティカル' };
  case 'high':
    return { color: 'redBright', symbol: '🟠', label: '高リスク' };
  case 'medium':
    return { color: 'yellow', symbol: '🟡', label: '中リスク' };
  case 'low':
    return { color: 'blue', symbol: '🔵', label: '低リスク' };
  case 'safe':
    return { color: 'green', symbol: '🟢', label: '安全' };
  default:
    return { color: 'gray', symbol: '⚪', label: '不明' };
  }
}

/**
 * 削除推奨レコードを取得
 * @param results - 分析結果の配列
 * @param minRiskLevel - 削除推奨の最小リスクレベル
 * @returns 削除推奨レコード
 */
export function getRecommendedForDeletion(
  results: IAnalysisResult[],
  minRiskLevel: RiskLevel = 'high',
): IAnalysisResult[] {
  const riskLevelOrder: RiskLevel[] = [
    'safe',
    'low',
    'medium',
    'high',
    'critical',
  ];
  const minIndex = riskLevelOrder.indexOf(minRiskLevel);

  return results.filter(result => {
    const resultIndex = riskLevelOrder.indexOf(result.riskLevel);
    return resultIndex >= minIndex;
  });
}

/**
 * 統計情報を計算
 * @param results - 分析結果の配列
 * @returns 統計情報
 */
export function calculateStatistics(results: IAnalysisResult[]): {
  averageRiskScore: number;
  medianRiskScore: number;
  maxRiskScore: number;
  minRiskScore: number;
  riskScoreDistribution: { [key: string]: number };
} {
  if (results.length === 0) {
    return {
      averageRiskScore: 0,
      medianRiskScore: 0,
      maxRiskScore: 0,
      minRiskScore: 0,
      riskScoreDistribution: {},
    };
  }

  const scores = results.map(r => r.riskScore);
  const sortedScores = [...scores].sort((a, b) => a - b);

  // 基本統計
  const averageRiskScore =
    scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const medianRiskScore = sortedScores[Math.floor(sortedScores.length / 2)];
  const maxRiskScore = Math.max(...scores);
  const minRiskScore = Math.min(...scores);

  // スコア分布（10点刻み）
  const riskScoreDistribution: { [key: string]: number } = {};
  for (const score of scores) {
    const range = Math.floor(score / 10) * 10;
    const key = `${range}-${range + 9}`;
    riskScoreDistribution[key] = (riskScoreDistribution[key] || 0) + 1;
  }

  return {
    averageRiskScore: Math.round(averageRiskScore * 10) / 10,
    medianRiskScore,
    maxRiskScore,
    minRiskScore,
    riskScoreDistribution,
  };
}

/**
 * 最も一般的なリスクパターンを特定
 * @param results - 分析結果の配列
 * @returns 一般的なリスクパターン
 */
export function getCommonRiskPatterns(
  results: IAnalysisResult[],
): { pattern: string; count: number; percentage: number }[] {
  const patternCount: { [key: string]: number } = {};
  const totalRecords = results.length;

  for (const result of results) {
    for (const pattern of result.matchedPatterns) {
      patternCount[pattern] = (patternCount[pattern] || 0) + 1;
    }
  }

  return Object.entries(patternCount)
    .map(([pattern, count]) => ({
      pattern,
      count,
      percentage: Math.round((count / totalRecords) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * 時系列でのリスク分析
 * @param results - 分析結果の配列
 * @returns 時系列リスク分析
 */
export function analyzeRiskByTime(results: IAnalysisResult[]): {
  yearlyRiskDistribution: { [year: string]: { [riskLevel: string]: number } };
  oldestRecords: IAnalysisResult[];
  newestRecords: IAnalysisResult[];
} {
  const yearlyRiskDistribution: {
    [year: string]: { [riskLevel: string]: number };
  } = {};

  // 年別リスク分布
  for (const result of results) {
    if (result.record.modified) {
      const year = new Date(result.record.modified).getFullYear().toString();
      if (!yearlyRiskDistribution[year]) {
        yearlyRiskDistribution[year] = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          safe: 0,
        };
      }
      yearlyRiskDistribution[year][result.riskLevel]++;
    }
  }

  // 最も古いレコードと新しいレコード
  const recordsWithModified = results.filter(r => r.record.modified);
  const sortedByModified = [...recordsWithModified].sort(
    (a, b) =>
      new Date(a.record.modified || '').getTime() -
      new Date(b.record.modified || '').getTime(),
  );

  const oldestRecords = sortedByModified.slice(0, 5);
  const newestRecords = sortedByModified.slice(-5).reverse();

  return {
    yearlyRiskDistribution,
    oldestRecords,
    newestRecords,
  };
}
