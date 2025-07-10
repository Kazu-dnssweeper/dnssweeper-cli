/**
 * 出力フォーマッター
 */

import chalk from 'chalk';
import { AnalysisResult, AnalysisSummary, RiskLevel } from '../types/dns';
import { getRiskLevelColor } from '../analyzers/riskAnalyzer';
import { getMessages, Language } from './messages';

/**
 * 分析サマリーをコンソールに出力
 * @param summary - 分析サマリー
 * @param verbose - 詳細出力フラグ
 * @param language - 言語設定
 */
export function printAnalysisSummary(
  summary: AnalysisSummary,
  verbose = false,
  language: Language = 'ja',
): void {
  const messages = getMessages(language);

  console.log(chalk.blue(`\n${messages.analysis.summary}`));
  console.log(chalk.gray('='.repeat(50)));

  // 基本情報
  console.log(
    `${chalk.white(messages.analysis.totalRecords)} ${chalk.yellow(summary.totalRecords)}`,
  );
  const timeUnit = language === 'ja' ? '秒' : ' seconds';
  console.log(
    `${chalk.white(messages.analysis.processingTime)} ${chalk.green(summary.processingTime.toFixed(2))}${timeUnit}`,
  );

  // リスク分布
  console.log(`\n${messages.analysis.riskDistribution}`);
  const { riskDistribution } = summary;

  for (const [level, count] of Object.entries(riskDistribution)) {
    const { color, symbol } = getRiskLevelColor(level as RiskLevel);
    const label =
      messages.riskLevels[level as keyof typeof messages.riskLevels];
    const percentage =
      summary.totalRecords > 0
        ? Math.round((count / summary.totalRecords) * 100)
        : 0;
    const colorFunc = (chalk as any)[color];
    console.log(`  ${symbol} ${label}: ${colorFunc(count)} (${percentage}%)`);
  }

  // 高リスクレコード数の強調表示
  const highRiskCount = riskDistribution.critical + riskDistribution.high;
  if (highRiskCount > 0) {
    const itemUnit = language === 'ja' ? '件' : ' items';
    console.log(
      `\n⚠️  ${chalk.red(messages.analysis.deleteRecommended)} ${chalk.redBright(highRiskCount)}${itemUnit}`,
    );
  } else {
    console.log(`\n✅ ${chalk.green(messages.analysis.noHighRisk)}`);
  }

  // 詳細情報（verboseモード）
  if (verbose && summary.topRiskyRecords.length > 0) {
    console.log(`\n${messages.analysis.topRiskyRecords}`);
    for (let i = 0; i < Math.min(5, summary.topRiskyRecords.length); i++) {
      const result = summary.topRiskyRecords[i];
      const { symbol } = getRiskLevelColor(result.riskLevel);
      const label = messages.riskLevels[result.riskLevel];
      const scoreLabel = language === 'ja' ? 'スコア' : 'Score';
      console.log(
        `  ${i + 1}. ${symbol} ${result.record.name} (${label}, ${scoreLabel}: ${result.riskScore})`,
      );
    }
  }
}

/**
 * 分析結果の詳細をテーブル形式で出力
 * @param results - 分析結果の配列
 * @param limit - 表示件数の制限
 * @param minRiskLevel - 最小リスクレベル
 * @param language - 言語設定
 */
export function printAnalysisTable(
  results: AnalysisResult[],
  limit = 20,
  minRiskLevel: RiskLevel = 'low',
  language: Language = 'ja',
): void {
  const messages = getMessages(language);

  // フィルタリング
  const filteredResults = filterResultsByRiskLevel(results, minRiskLevel);
  const displayResults = filteredResults.slice(0, limit);

  if (displayResults.length === 0) {
    const noResultsMsg =
      language === 'ja' ? '表示する結果がありません' : 'No results to display';
    console.log(chalk.gray(noResultsMsg));
    return;
  }

  console.log(chalk.blue(`\n${messages.analysis.detailedResults}`));
  console.log(chalk.gray('='.repeat(80)));

  // ヘッダー
  const headers =
    language === 'ja'
      ? `${'No'.padEnd(4)} ${'リスク'.padEnd(8)} ${'スコア'.padEnd(6)} ${'レコード名'.padEnd(30)} ${'タイプ'.padEnd(8)}`
      : `${'No'.padEnd(4)} ${'Risk'.padEnd(12)} ${'Score'.padEnd(6)} ${'Record Name'.padEnd(30)} ${'Type'.padEnd(8)}`;

  console.log(chalk.white(headers));
  console.log(chalk.gray('-'.repeat(80)));

  // データ行
  displayResults.forEach((result, index) => {
    const { symbol } = getRiskLevelColor(result.riskLevel);
    const localizedLabel = messages.riskLevels[result.riskLevel];
    const no = (index + 1).toString().padEnd(4);
    const risk = `${symbol}${localizedLabel}`.padEnd(
      language === 'ja' ? 8 : 12,
    );
    const score = result.riskScore.toString().padEnd(6);
    const name = result.record.name.padEnd(30);
    const type = result.record.type.padEnd(8);

    console.log(`${no} ${risk} ${score} ${name} ${type}`);
  });

  // フッター
  if (filteredResults.length > limit) {
    const moreMsg =
      language === 'ja'
        ? `... 他${filteredResults.length - limit}件（--verboseで全件表示）`
        : `... ${filteredResults.length - limit} more (use --verbose to show all)`;
    console.log(chalk.gray(`\n${moreMsg}`));
  }
}

/**
 * 分析結果をJSON形式で出力
 * @param results - 分析結果の配列
 * @param summary - 分析サマリー
 * @returns JSON文字列
 */
export function formatAsJSON(
  results: AnalysisResult[],
  summary: AnalysisSummary,
): string {
  const output = {
    summary,
    results: results.map(result => ({
      record: result.record,
      analysis: {
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        matchedPatterns: result.matchedPatterns,
        reasons: result.reasons,
      },
    })),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * 分析結果をCSV形式で出力
 * @param results - 分析結果の配列
 * @returns CSV文字列
 */
export function formatAsCSV(results: AnalysisResult[]): string {
  const headers = [
    'Name',
    'Type',
    'Content',
    'TTL',
    'Proxied',
    'Created',
    'Modified',
    'RiskScore',
    'RiskLevel',
    'MatchedPatterns',
    'Reasons',
  ];

  const rows = results.map(result => [
    result.record.name,
    result.record.type,
    result.record.content,
    result.record.ttl,
    result.record.proxied,
    result.record.created,
    result.record.modified,
    result.riskScore,
    result.riskLevel,
    result.matchedPatterns.join(';'),
    result.reasons.join(';'),
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * 分析結果を詳細CSVファイル形式で出力（運用フロー対応）
 * @param results - 分析結果の配列
 * @param language - 言語設定
 * @returns 詳細CSV文字列
 */
export function formatAsDetailedCSV(
  results: AnalysisResult[],
  language: Language = 'ja',
): string {
  const messages = getMessages(language);

  // 多言語対応ヘッダー
  const headers =
    language === 'ja'
      ? [
        'ドメイン名',
        'レコードタイプ',
        'コンテンツ',
        'TTL',
        'プロキシ設定',
        '作成日',
        '最終更新日',
        'リスクスコア',
        'リスクレベル',
        '検出パターン',
        '判定理由',
        '使用状況確認',
        '削除判断',
        '削除実行日',
        '備考',
      ]
      : [
        'Domain Name',
        'Record Type',
        'Content',
        'TTL',
        'Proxied',
        'Created',
        'Last Modified',
        'Risk Score',
        'Risk Level',
        'Detected Patterns',
        'Reasons',
        'Usage Check',
        'Delete Decision',
        'Deletion Date',
        'Notes',
      ];

  const rows = results.map(result => [
    `"${result.record.name}"`,
    result.record.type,
    `"${result.record.content}"`,
    result.record.ttl,
    result.record.proxied ? 'YES' : 'NO',
    result.record.created,
    result.record.modified,
    result.riskScore,
    messages.riskLevels[result.riskLevel],
    `"${result.matchedPatterns.join('; ')}"`,
    `"${result.reasons.join('; ')}"`,
    '', // 使用状況確認（手動入力用）
    '', // 削除判断（手動入力用）
    '', // 削除実行日（手動入力用）
    '', // 備考（手動入力用）
  ]);

  // ヘッダーコメント追加
  const headerComment =
    language === 'ja'
      ? '# DNSweeper分析結果 - 月次DNS棚卸し用'
      : '# DNSweeper Analysis Results - Monthly DNS Audit';
  const usageComment =
    language === 'ja'
      ? '# 使用方法: 1.Cloudflare UIで使用状況確認 2.削除判断記入 3.削除実行'
      : '# Usage: 1.Check usage in Cloudflare UI 2.Fill deletion decision 3.Execute deletion';

  return [
    headerComment,
    usageComment,
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
}

/**
 * リスクレベルでフィルタリング
 */
function filterResultsByRiskLevel(
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
 * 進捗バーの表示
 * @param current - 現在の進捗
 * @param total - 総数
 * @param message - メッセージ
 */
export function showProgress(
  current: number,
  total: number,
  message: string,
): void {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filledLength = Math.round((current / total) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

  process.stdout.write(
    `\r${message} [${bar}] ${percentage}% (${current}/${total})`,
  );

  if (current === total) {
    process.stdout.write('\n');
  }
}
