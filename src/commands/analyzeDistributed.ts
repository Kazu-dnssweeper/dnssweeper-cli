/**
 * 分散処理モードでのDNSレコード分析コマンド
 * 超大規模ファイル（10GB以上）対応
 */

import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { DistributedProcessor, DistributedProgress } from '../parsers/distributedProcessor';
import { loadPatternConfig } from '../patterns/patternLoader';
import { formatResults } from '../utils/formatter';
import { RiskLevel } from '../types/dns';

// コマンドオプション
export interface AnalyzeDistributedOptions {
  output?: 'table' | 'json' | 'csv';
  english?: boolean;
  verbose?: boolean;
  riskLevel?: string;
  outputFile?: string;
  patterns?: string;
  workers?: number;
  chunkSize?: number;
  showMetrics?: boolean;
}

/**
 * 分散処理による分析コマンドの実行
 */
export async function analyzeDistributedCommand(
  files: string[],
  options: AnalyzeDistributedOptions
): Promise<void> {
  const startTime = Date.now();
  
  // オプションの処理
  const language = options.english ? 'en' : 'ja';
  const messages = {
    ja: {
      title: '🔍 DNSweeper CLI - 分散処理モード',
      analyzing: '分析中...',
      workers: 'ワーカー',
      fileNotFound: 'ファイルが見つかりません',
      loadingPatterns: 'パターンファイルを読み込み中...',
      error: 'エラー',
      complete: '分析完了',
      totalTime: '総処理時間',
      totalRecords: '総レコード数',
      throughput: '平均スループット',
      workerStats: 'ワーカー統計',
      processed: '処理済み',
      peakMemory: 'ピークメモリ',
      errors: 'エラー',
    },
    en: {
      title: '🔍 DNSweeper CLI - Distributed Processing Mode',
      analyzing: 'Analyzing...',
      workers: 'workers',
      fileNotFound: 'File not found',
      loadingPatterns: 'Loading pattern file...',
      error: 'Error',
      complete: 'Analysis complete',
      totalTime: 'Total time',
      totalRecords: 'Total records',
      throughput: 'Average throughput',
      workerStats: 'Worker Statistics',
      processed: 'Processed',
      peakMemory: 'Peak memory',
      errors: 'Errors',
    },
  };

  const msg = messages[language];
  
  console.log(chalk.bold.blue(msg.title));
  console.log(chalk.gray('='.repeat(50)));
  console.log();

  // パターンの読み込み
  let patternConfig: any;
  if (options.patterns) {
    const spinner = ora(msg.loadingPatterns).start();
    try {
      const patternContent = await fs.readFile(options.patterns, 'utf-8');
      patternConfig = JSON.parse(patternContent);
      spinner.succeed();
    } catch (error) {
      spinner.fail(`${msg.error}: ${error}`);
      process.exit(1);
    }
  } else {
    patternConfig = await loadPatternConfig();
  }

  // ワーカースクリプトのパス
  const workerScriptPath = path.join(__dirname, '../workers/dnsAnalysisWorker.js');

  // 各ファイルを処理
  for (const file of files) {
    console.log(chalk.bold(`\n📁 ${file}`));
    
    // ファイルの存在確認
    try {
      await fs.access(file);
    } catch {
      console.error(chalk.red(`${msg.error}: ${msg.fileNotFound} - ${file}`));
      continue;
    }

    // ファイルサイズの取得
    const stats = await fs.stat(file);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(chalk.gray(`   Size: ${fileSizeMB} MB`));

    // 分散プロセッサーの設定
    const processor = new DistributedProcessor({
      workerCount: options.workers,
      chunkSize: options.chunkSize,
      onProgress: options.showMetrics ? (progress: DistributedProgress) => {
        displayProgress(progress, language);
      } : undefined,
      onWorkerStats: options.verbose ? (stats) => {
        console.log(chalk.gray(`Worker ${stats.workerId}: ${stats.totalProcessed} records`));
      } : undefined,
    });

    // プログレスバー
    const spinner = ora({
      text: `${msg.analyzing} (${options.workers || 'auto'} ${msg.workers})`,
      spinner: 'dots',
    }).start();

    try {
      // 分散処理実行
      const { results, stats } = await processor.process(
        file,
        workerScriptPath,
        patternConfig
      );

      spinner.succeed();

      // 結果のフィルタリング
      let filteredResults = results;
      if (options.riskLevel) {
        const minLevel = options.riskLevel as RiskLevel;
        const levelOrder: RiskLevel[] = ['safe', 'low', 'medium', 'high', 'critical'];
        const minIndex = levelOrder.indexOf(minLevel);
        
        if (minIndex !== -1) {
          filteredResults = results.filter(result => {
            const resultIndex = levelOrder.indexOf(result.riskLevel);
            return resultIndex >= minIndex;
          });
        }
      }

      // 結果の表示
      const formattedOutput = formatResults(filteredResults, {
        format: options.output || 'table',
        language,
        verbose: options.verbose,
      });

      console.log(formattedOutput);

      // 統計情報の表示
      if (options.showMetrics || options.verbose) {
        console.log(chalk.bold.blue(`\n📊 ${msg.workerStats}:`));
        stats.workerStats.forEach(ws => {
          console.log(chalk.gray(
            `   Worker ${ws.workerId}: ${msg.processed}: ${ws.totalProcessed.toLocaleString()}, ` +
            `${msg.peakMemory}: ${ws.peakMemory.toFixed(1)}MB, ` +
            `${msg.errors}: ${ws.errorCount}`
          ));
        });
        
        console.log(chalk.bold(`\n⚡ Performance:`));
        console.log(chalk.gray(`   ${msg.totalTime}: ${stats.totalTime.toFixed(2)}s`));
        console.log(chalk.gray(`   ${msg.totalRecords}: ${stats.totalRecords.toLocaleString()}`));
        console.log(chalk.gray(`   ${msg.throughput}: ${Math.round(stats.avgThroughput).toLocaleString()} records/s`));
      }

      // ファイル出力
      if (options.outputFile) {
        await fs.writeFile(options.outputFile, formattedOutput, 'utf-8');
        console.log(chalk.green(`\n💾 Results saved to: ${options.outputFile}`));
      }

    } catch (error) {
      spinner.fail();
      console.error(chalk.red(`${msg.error}:`, error));
      process.exit(1);
    }
  }

  // 総処理時間
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(chalk.green(`\n✅ ${msg.complete}: ${totalElapsed}s`));
}

/**
 * 進捗表示
 */
function displayProgress(progress: DistributedProgress, language: string): void {
  const msg = language === 'ja' ? {
    processed: '処理済み',
    active: 'アクティブ',
    queue: 'キュー',
    throughput: 'スループット',
  } : {
    processed: 'Processed',
    active: 'Active',
    queue: 'Queue',
    throughput: 'Throughput',
  };

  // 1行で進捗を更新（改行なし）
  process.stdout.write(
    `\r${chalk.cyan(msg.processed)}: ${progress.totalProcessed.toLocaleString()} | ` +
    `${chalk.yellow(msg.active)}: ${progress.activeWorkers} | ` +
    `${chalk.blue(msg.queue)}: ${progress.queueSize} | ` +
    `${chalk.green(msg.throughput)}: ${Math.round(progress.throughput).toLocaleString()}/s`
  );
}