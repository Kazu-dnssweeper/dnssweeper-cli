/**
 * analyzeコマンドの実装
 * CSVファイルを分析して未使用DNSレコードを検出
 */

import chalk from 'chalk';
import ora from 'ora';
import { parseDNSRecordsFromCSV } from '../parsers/csvParser';
import { loadPatternConfig } from '../patterns/patternLoader';
import { analyzeRecords, filterByRiskLevel, sortByRiskScore } from '../patterns/patternMatcher';
import { generateAnalysisSummary } from '../analyzers/riskAnalyzer';
import {
  formatAsCSV,
  formatAsDetailedCSV,
  formatAsJSON,
  printAnalysisSummary,
  printAnalysisTable,
} from '../utils/formatter';
import { getMessages } from '../utils/messages';
import type { IDNSRecord } from '../types/dns';
import { promises as fs } from 'fs';

interface IAnalyzeOptions {
  output: 'table' | 'json' | 'csv';
  english?: boolean;
  verbose?: boolean;
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  outputFile?: string;
  patterns?: string;
  provider?: string;
}

/**
 * analyzeコマンドのメイン実装
 * @param files - 分析するCSVファイルのパス（複数可）
 * @param options - コマンドオプション
 */
export async function analyzeCommand(
  files: string[],
  options: IAnalyzeOptions,
): Promise<void> {
  // 言語設定
  const language = options.english ? 'en' : 'ja';
  const messages = getMessages(language);

  // CI環境ではスピナーを無効化（stderrへの出力を防ぐ）
  const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';
  const spinner = isCI 
    ? { 
      start: (): { text: string; succeed: () => void; fail: () => void } => ({ 
        text: '', 
        succeed: (): void => {}, 
        fail: (): void => {}, 
      }), 
      text: '',
      succeed: (): void => {},
      fail: (): void => {},
    }
    : ora(messages.app.analyzing).start();

  try {
    // 実行時間の計測開始
    const startTime = Date.now();

    // JSON出力時は余計な出力を抑制
    if (options.output !== 'json') {
      console.log(chalk.blue(messages.app.title));
      const targetMsg = files.length > 1 
        ? `${messages.app.target}: ${files.length}個のファイル`
        : `${messages.app.target}: ${files[0]}`;
      console.log(chalk.gray(targetMsg));
      console.log(chalk.gray(`${messages.app.outputFormat}: ${options.output}`));
    }

    // パターン設定の読み込み
    if (!isCI) {
      spinner.text =
        language === 'ja'
          ? 'パターン設定を読み込み中...'
          : 'Loading pattern configuration...';
    }
    const patternConfig = await loadPatternConfig(options.patterns);

    // 全ファイルからレコードを読み込み
    let allRecords: IDNSRecord[] = [];
    const detectedProviders: Set<string> = new Set();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!isCI) {
        spinner.text =
          language === 'ja' 
            ? `CSVファイルを解析中... (${i + 1}/${files.length}): ${file}` 
            : `Parsing CSV file... (${i + 1}/${files.length}): ${file}`;
      }
      const records = await parseDNSRecordsFromCSV(file, options.provider);
      
      // プロバイダー情報を記録
      if (records.length > 0 && records[0].provider) {
        detectedProviders.add(records[0].provider);
      }
      
      allRecords = allRecords.concat(records);
    }

    // DNSレコードの分析
    if (!isCI) {
      spinner.text =
        language === 'ja' 
          ? `${allRecords.length}件のDNSレコードを分析中...` 
          : `Analyzing ${allRecords.length} DNS records...`;
    }
    const analysisResults = analyzeRecords(allRecords, patternConfig, language);

    // 結果をリスクスコア順でソート
    let sortedResults = sortByRiskScore(analysisResults);

    // リスクレベルでフィルタリング
    if (options.riskLevel) {
      sortedResults = filterByRiskLevel(sortedResults, options.riskLevel);
      if (!isCI) {
        if (language === 'ja') {
          spinner.text = `${options.riskLevel}以上のリスクレコードをフィルタリング中...`;
        } else {
          spinner.text = `Filtering ${options.riskLevel}+ risk records...`;
        }
      }
    }

    if (!isCI) {
      spinner.succeed(messages.app.analysisComplete);
    }

    // 実行時間の計算
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;

    // サマリー生成（フィルタリング後の結果で）
    const summary = generateAnalysisSummary(sortedResults, processingTime);

    // ファイル出力が指定されている場合
    if (options.outputFile) {
      const detailedCSV = formatAsDetailedCSV(sortedResults, language);
      await fs.writeFile(options.outputFile, detailedCSV);
      const savedMsg =
        language === 'ja'
          ? `✅ 結果を ${options.outputFile} に保存しました`
          : `✅ Results saved to ${options.outputFile}`;
      console.log(chalk.green(savedMsg));
    }

    // 出力形式に応じた結果表示
    switch (options.output) {
    case 'json': {
      // JSON出力時はサマリーにプロバイダー情報を追加
      const summaryWithProvider: any = {
        ...summary,
        detectedProvider: detectedProviders.size > 0 ? Array.from(detectedProviders)[0] : undefined,
      };
      console.log(formatAsJSON(sortedResults, summaryWithProvider));
      break;
    }

    case 'csv':
      console.log(formatAsCSV(sortedResults));
      break;

    case 'table':
    default: {
      // サマリー表示
      printAnalysisSummary(summary, options.verbose, language);

      // 詳細テーブル表示（リスクレベルフィルタリングを考慮）
      const limit = options.verbose ? 50 : 20;
      const minDisplayLevel = options.riskLevel || 'medium';
      printAnalysisTable(sortedResults, limit, minDisplayLevel, language);

      // 実行時間の表示
      const timeUnit = language === 'ja' ? '秒' : ' seconds';
      console.log(
        chalk.green(
          `\n${messages.analysis.executionComplete} ${processingTime.toFixed(2)}${timeUnit}`,
        ),
      );
      break;
    }
    }
  } catch (error) {
    if (!isCI) {
      spinner.fail(messages.errors.analysisFailure);
    }
    throw error;
  }
}
