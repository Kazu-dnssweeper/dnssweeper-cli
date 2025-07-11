/**
 * analyzeコマンドのストリーミング実装
 * 大規模CSVファイルをメモリ効率的に分析
 */

import chalk from 'chalk';
import ora from 'ora';
import { 
  streamProcessCSV, 
  streamProcessRecords,
  getFileSize,
  estimateRecordCount,
  getMemoryUsage,
  StreamOptions, 
} from '../parsers/csvStreamParser';
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
import type { DNSRecord, AnalysisResult } from '../types/dns';
import { promises as fs } from 'fs';

interface AnalyzeStreamOptions {
  output: 'table' | 'json' | 'csv';
  english?: boolean;
  verbose?: boolean;
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  outputFile?: string;
  patterns?: string;
  stream?: boolean; // ストリーミングモードを有効化
  chunkSize?: number; // チャンクサイズ（デフォルト: 1000）
  memoryLimit?: number; // メモリ制限MB（デフォルト: 100）
}

/**
 * ファイルサイズをフォーマット
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * ストリーミング対応のanalyzeコマンド
 * @param files - 分析するCSVファイルのパス（複数可）
 * @param options - コマンドオプション
 */
export async function analyzeStreamCommand(
  files: string[],
  options: AnalyzeStreamOptions,
): Promise<void> {
  // 言語設定
  const language = options.english ? 'en' : 'ja';
  const messages = getMessages(language);

  // CI環境ではスピナーを無効化
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

    console.log(chalk.blue(messages.app.title));
    console.log(chalk.yellow('🚀 ストリーミングモードで実行中...'));
    
    // ファイルサイズチェック
    let totalSize = 0;
    for (const file of files) {
      const size = await getFileSize(file);
      totalSize += size;
      console.log(chalk.gray(`${file}: ${formatFileSize(size)}`));
    }
    console.log(chalk.gray(`合計サイズ: ${formatFileSize(totalSize)}`));

    // メモリ使用量の初期状態
    const initialMemory = getMemoryUsage();
    console.log(chalk.gray(`初期メモリ使用量: ${initialMemory.used}MB`));

    // パターン設定の読み込み
    if (!isCI) {
      spinner.text =
        language === 'ja'
          ? 'パターン設定を読み込み中...'
          : 'Loading pattern configuration...';
    }
    const patternConfig = await loadPatternConfig(options.patterns);

    // 全体の分析結果を保持
    let allResults: AnalysisResult[] = [];
    let totalProcessed = 0;

    // ストリーミングオプション
    const streamOptions: StreamOptions = {
      chunkSize: options.chunkSize || 1000,
      memoryLimit: options.memoryLimit || 100,
      onProgress: (processed: number, percentage?: number) => {
        if (!isCI) {
          const memory = getMemoryUsage();
          spinner.text = language === 'ja' 
            ? `処理中... ${processed}件完了 | メモリ: ${memory.used}MB${percentage ? ` (${percentage}%)` : ''}`
            : `Processing... ${processed} records | Memory: ${memory.used}MB${percentage ? ` (${percentage}%)` : ''}`;
        }
      },
    };

    // 各ファイルをストリーミング処理
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(chalk.cyan(`\n📂 ファイル ${i + 1}/${files.length}: ${file}`));

      // 推定レコード数
      const estimatedCount = await estimateRecordCount(file);
      console.log(chalk.gray(`推定レコード数: ${estimatedCount.toLocaleString()}`));

      // チャンク処理関数
      const processChunk = async (records: DNSRecord[]): Promise<AnalysisResult[]> => {
        const results = analyzeRecords(records, patternConfig);
        totalProcessed += records.length;
        return results;
      };

      // ストリーミング処理実行
      const fileResults = await streamProcessCSV(
        file,
        patternConfig,
        processChunk,
        streamOptions,
      );

      allResults = allResults.concat(fileResults);
    }

    // リスクレベルでフィルタリング
    let filteredResults = allResults;
    if (options.riskLevel) {
      filteredResults = filterByRiskLevel(allResults, options.riskLevel);
      const filterMsg = language === 'ja'
        ? `リスクレベル「${options.riskLevel}」以上でフィルタリング`
        : `Filtered by risk level: ${options.riskLevel} and above`;
      console.log(chalk.yellow(`\n🔍 ${filterMsg}`));
    }

    // リスクスコアでソート
    const sortedResults = sortByRiskScore(filteredResults);

    // 分析サマリーの生成
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    const summary = generateAnalysisSummary(sortedResults, processingTime);

    // 最終メモリ使用量
    const finalMemory = getMemoryUsage();
    console.log(chalk.gray(`\n最終メモリ使用量: ${finalMemory.used}MB (増加: ${finalMemory.used - initialMemory.used}MB)`));

    // 結果の出力
    if (options.outputFile) {
      // ファイル出力
      const csvOutput = language === 'ja' 
        ? formatAsDetailedCSV(sortedResults)
        : formatAsDetailedCSV(sortedResults, 'en');
      
      await fs.writeFile(options.outputFile, csvOutput, 'utf-8');
      
      const savedMsg = language === 'ja'
        ? `✅ 結果を ${options.outputFile} に保存しました`
        : `✅ Results saved to ${options.outputFile}`;
      console.log(chalk.green(savedMsg));
    }

    // コンソール出力
    switch (options.output) {
    case 'json':
      console.log(formatAsJSON(sortedResults, summary));
      break;
    case 'csv':
      console.log(formatAsCSV(sortedResults));
      break;
    case 'table':
    default:
      // サマリー表示
      printAnalysisSummary(summary, options.verbose, language);

      // 詳細表示オプション
      if (options.verbose && sortedResults.length > 0) {
        console.log(
          chalk.bold(
            `\n${language === 'ja' ? '🔍 高リスクレコード（上位5件）' : '🔍 High Risk Records (Top 5)'}`,
          ),
        );
        const topResults = sortedResults.slice(0, 5);
        printAnalysisTable(topResults, 5, 'low', language);

        if (sortedResults.length > 0) {
          console.log(
            chalk.bold(`\n${language === 'ja' ? '📊 詳細分析結果' : '📊 Detailed Analysis'}`),
          );
          printAnalysisTable(sortedResults, 20, 'low', language);
        }
      }
      break;
    }

    if (!isCI) {
      spinner.succeed();
    }

    // 実行完了メッセージ
    const completeMsg = language === 'ja' 
      ? `\n✅ ${messages.analysis.executionComplete} ${processingTime.toFixed(2)}秒`
      : `\n✅ ${messages.analysis.executionComplete} ${processingTime.toFixed(2)} seconds`;
    console.log(chalk.green(completeMsg));

    // ストリーミング統計
    console.log(chalk.blue('\n📊 ストリーミング統計:'));
    console.log(chalk.gray(`  - 処理レコード数: ${totalProcessed.toLocaleString()}`));
    console.log(chalk.gray(`  - 処理速度: ${Math.round(totalProcessed / processingTime).toLocaleString()} レコード/秒`));
    console.log(chalk.gray(`  - メモリ効率: ${((finalMemory.used - initialMemory.used) / totalProcessed * 1000).toFixed(2)} KB/1000レコード`));

  } catch (error) {
    if (!isCI) {
      spinner.fail();
    }
    
    const errorMsg = language === 'ja' 
      ? `エラー: ${error instanceof Error ? error.message : String(error)}`
      : `Error: ${error instanceof Error ? error.message : String(error)}`;
    
    console.error(chalk.red(errorMsg));
    throw error;
  }
}

/**
 * 非同期でレコードを処理（結果を保持しない軽量版）
 * @param files - ファイルパス配列
 * @param processRecord - レコード処理関数
 * @param options - ストリーミングオプション
 */
export async function processLargeFiles(
  files: string[],
  processRecord: (record: DNSRecord) => Promise<void>,
  options: StreamOptions = {},
): Promise<void> {
  for (const file of files) {
    console.log(chalk.cyan(`\n📂 処理中: ${file}`));
    await streamProcessRecords(file, processRecord, options);
  }
}