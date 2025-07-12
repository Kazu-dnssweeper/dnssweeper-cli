/**
 * パターンマッチング機能
 */

import {
  DNSRecord,
  PatternConfig,
  AnalysisResult,
  RiskLevel,
} from '../types/dns';
import { getMessages, formatMessage, Language } from '../utils/messages';

/**
 * DNSレコードをパターンマッチングして分析する
 * @param record - 分析対象のDNSレコード
 * @param config - パターン設定
 * @param language - 言語設定
 * @returns 分析結果
 */
export function analyzeRecord(
  record: DNSRecord,
  config: PatternConfig,
  language: Language = 'ja',
): AnalysisResult {
  const matchedPatterns: string[] = [];
  const reasons: string[] = [];
  let riskScore = config.scoring.base;
  const messages = getMessages(language);

  const recordName = record.name.toLowerCase();

  // プレフィックスのチェック
  for (const [riskLevel, patterns] of Object.entries(
    config.patterns.prefixes,
  )) {
    for (const pattern of patterns) {
      if (recordName.startsWith(pattern)) {
        matchedPatterns.push(`prefix:${pattern}`);
        reasons.push(
          formatMessage(messages.reasons.dangerousPrefix, { pattern }),
        );
        riskScore += config.scoring[riskLevel as keyof typeof config.scoring];
        break; // 同じリスクレベルでは1つのマッチで十分
      }
    }
  }

  // サフィックスのチェック（サブドメイン部分で判定）
  const subdomain = recordName.split('.')[0];
  for (const [riskLevel, patterns] of Object.entries(
    config.patterns.suffixes,
  )) {
    for (const pattern of patterns) {
      // パターンが '-' で始まる場合は、サブドメインがそのサフィックスで終わるかチェック
      const suffix = pattern.startsWith('-') ? pattern.substring(1) : pattern;
      if (subdomain.endsWith(suffix)) {
        matchedPatterns.push(`suffix:${pattern}`);
        reasons.push(
          formatMessage(messages.reasons.dangerousSuffix, { pattern }),
        );
        riskScore += config.scoring[riskLevel as keyof typeof config.scoring];
        break; // 同じリスクレベルでは1つのマッチで十分
      }
    }
  }

  // キーワードのチェック
  for (const [riskLevel, patterns] of Object.entries(
    config.patterns.keywords,
  )) {
    for (const pattern of patterns) {
      if (recordName.includes(pattern)) {
        matchedPatterns.push(`keyword:${pattern}`);
        reasons.push(
          formatMessage(messages.reasons.dangerousKeyword, { pattern }),
        );
        riskScore += config.scoring[riskLevel as keyof typeof config.scoring];
        break; // 同じリスクレベルでは1つのマッチで十分
      }
    }
  }

  // 最終更新日時による追加スコア計算
  if (record.modified) {
    const lastModified = new Date(record.modified);
    const now = new Date();
    const daysSinceModified =
      (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceModified > 365) {
      riskScore += 20;
      reasons.push(
        formatMessage(messages.reasons.lastModified, {
          days: Math.floor(daysSinceModified),
        }),
      );
    } else if (daysSinceModified > 180) {
      riskScore += 10;
      reasons.push(
        formatMessage(messages.reasons.lastModified, {
          days: Math.floor(daysSinceModified),
        }),
      );
    }
  }

  // レコードタイプによる調整
  if (record.type === 'CNAME') {
    riskScore += 5;
    reasons.push(messages.reasons.cnameWarning);
  }

  // リスクレベルの決定
  const riskLevel = determineRiskLevel(riskScore, config.thresholds);

  // 基本的な理由がない場合
  if (reasons.length === 0) {
    reasons.push(messages.reasons.noSpecialIssues);
  }

  return {
    record,
    riskScore,
    riskLevel,
    matchedPatterns,
    reasons,
  };
}

/**
 * スコアからリスクレベルを決定
 * @param score - リスクスコア
 * @param thresholds - 閾値設定
 * @returns リスクレベル
 */
function determineRiskLevel(
  score: number,
  thresholds: PatternConfig['thresholds'],
): RiskLevel {
  if (score >= thresholds.critical) return 'critical';
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  if (score >= thresholds.low) return 'low';
  return 'safe';
}

/**
 * 複数のDNSレコードをバッチ分析
 * @param records - 分析対象のDNSレコード配列
 * @param config - パターン設定
 * @param language - 言語設定
 * @returns 分析結果の配列
 */
export function analyzeRecords(
  records: DNSRecord[],
  config: PatternConfig,
  language: Language = 'ja',
): AnalysisResult[] {
  return records.map(record => analyzeRecord(record, config, language));
}

/**
 * 分析結果をリスクレベルでフィルタリング
 * @param results - 分析結果の配列
 * @param minRiskLevel - 最小リスクレベル
 * @returns フィルタリングされた分析結果
 */
export function filterByRiskLevel(
  results: AnalysisResult[],
  minRiskLevel: RiskLevel,
): AnalysisResult[] {
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
 * 分析結果をリスクスコアでソート
 * @param results - 分析結果の配列
 * @param descending - 降順でソートするか（デフォルト: true）
 * @returns ソートされた分析結果
 */
export function sortByRiskScore(
  results: AnalysisResult[],
  descending = true,
): AnalysisResult[] {
  return [...results].sort((a, b) => {
    return descending ? b.riskScore - a.riskScore : a.riskScore - b.riskScore;
  });
}

/**
 * 単一のDNSレコードを分析（ストリーミング用エクスポート）
 * @param record - DNSレコード
 * @param config - パターン設定
 * @param language - 言語設定
 * @returns 分析結果
 */
export function analyzeSingleRecord(
  record: DNSRecord,
  config: PatternConfig,
  language: Language = 'ja',
): AnalysisResult {
  return analyzeRecord(record, config, language);
}
