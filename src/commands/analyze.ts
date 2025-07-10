/**
 * analyzeコマンドの実装
 * CSVファイルを分析して未使用DNSレコードを検出
 */

import chalk from 'chalk';
import ora from 'ora';
import { parseDNSRecordsFromCSV } from '../parsers/csvParser';
import { loadPatternConfig } from '../patterns/patternLoader';
import { analyzeRecords, sortByRiskScore } from '../patterns/patternMatcher';
import { generateAnalysisSummary } from '../analyzers/riskAnalyzer';
import {
  printAnalysisSummary,
  printAnalysisTable,
  formatAsJSON,
  formatAsCSV,
  formatAsDetailedCSV,
} from '../utils/formatter';
import { getMessages } from '../utils/messages';
import { filterByRiskLevel } from '../patterns/patternMatcher';
import { promises as fs } from 'fs';

interface AnalyzeOptions {
  output: 'table' | 'json' | 'csv';
  english?: boolean;
  verbose?: boolean;
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  outputFile?: string;
}

/**
 * analyzeコマンドのメイン実装
 * @param file - 分析するCSVファイルのパス
 * @param options - コマンドオプション
 */
export async function analyzeCommand(
  file: string,
  options: AnalyzeOptions,
): Promise<void> {
  // 言語設定
  const language = options.english ? 'en' : 'ja';
  const messages = getMessages(language);

  const spinner = ora(messages.app.analyzing).start();

  try {
    // 実行時間の計測開始
    const startTime = Date.now();

    console.log(chalk.blue(messages.app.title));
    console.log(chalk.gray(`${messages.app.target}: ${file}`));
    console.log(chalk.gray(`${messages.app.outputFormat}: ${options.output}`));

    // パターン設定の読み込み
    spinner.text =
      language === 'ja'
        ? 'パターン設定を読み込み中...'
        : 'Loading pattern configuration...';
    const patternConfig = await loadPatternConfig();

    // CSVファイルの解析
    spinner.text =
      language === 'ja' ? 'CSVファイルを解析中...' : 'Parsing CSV file...';
    const records = await parseDNSRecordsFromCSV(file);

    // DNSレコードの分析
    spinner.text =
      language === 'ja' ? 'DNSレコードを分析中...' : 'Analyzing DNS records...';
    const analysisResults = analyzeRecords(records, patternConfig, language);

    // 結果をリスクスコア順でソート
    let sortedResults = sortByRiskScore(analysisResults);

    // リスクレベルでフィルタリング
    if (options.riskLevel) {
      sortedResults = filterByRiskLevel(sortedResults, options.riskLevel);
      if (language === 'ja') {
        spinner.text = `${options.riskLevel}以上のリスクレコードをフィルタリング中...`;
      } else {
        spinner.text = `Filtering ${options.riskLevel}+ risk records...`;
      }
    }

    spinner.succeed(messages.app.analysisComplete);

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
    case 'json':
      console.log(formatAsJSON(sortedResults, summary));
      break;

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
    spinner.fail(messages.errors.analysisFailure);
    throw error;
  }
}
