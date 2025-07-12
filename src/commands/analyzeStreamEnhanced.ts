/**
 * 強化されたストリーミング分析コマンド
 * 非同期パイプライン、メモリプール、適応的チャンクサイズを活用
 */

import chalk from 'chalk';
import { performance } from 'perf_hooks';
import { EnhancedCSVStreamProcessor, PerformanceMetrics } from '../parsers/csvStreamParserEnhanced';
import { loadPatternConfig } from '../patterns/patternLoader';
import { analyzeRecord } from '../patterns/patternMatcher';
import { getMessages } from '../utils/messages';
import type { IAnalysisResult, IDNSRecord, RiskLevel } from '../types/dns';
import { createWriteStream } from 'fs';
import { getFileSize } from '../parsers/csvStreamParser';

interface StreamStatistics {
  totalRecords: number;
  riskDistribution: Record<RiskLevel, number>;
  highRiskRecords: IAnalysisResult[];
  averageProcessingTime: number;
  peakMemoryUsage: number;
  throughput: number;
}

interface EnhancedAnalyzeOptions {
  output: 'table' | 'json' | 'csv';
  english?: boolean;
  verbose?: boolean;
  riskLevel?: RiskLevel;
  outputFile?: string;
  patterns?: string;
  adaptiveChunking?: boolean;
  parallelism?: number;
  enableMetrics?: boolean;
}

/**
 * 強化されたストリーミング分析
 */
export async function analyzeStreamEnhancedCommand(
  files: string[],
  options: EnhancedAnalyzeOptions
): Promise<void> {
  const language = options.english ? 'en' : 'ja';
  const messages = getMessages(language);
  const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';

  console.log(chalk.blue(messages.app.title));
  console.log(chalk.magenta('⚡ 強化ストリーミングモード (Enhanced Streaming Mode)'));
  
  if (options.adaptiveChunking) {
    console.log(chalk.cyan('🔧 適応的チャンクサイズ: 有効'));
  }
  
  if (options.parallelism) {
    console.log(chalk.cyan(`🔧 並列度: ${options.parallelism}`));
  }

  try {
    const overallStartTime = performance.now();
    
    // ファイルサイズの確認
    let totalSize = 0;
    for (const file of files) {
      const size = await getFileSize(file);
      totalSize += size;
      console.log(chalk.gray(`📄 ${file}: ${formatFileSize(size)}`));
    }

    // パターン設定の読み込み
    const patternConfig = await loadPatternConfig(options.patterns);
    
    // 統計情報の初期化
    const statistics: StreamStatistics = {
      totalRecords: 0,
      riskDistribution: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        safe: 0,
      },
      highRiskRecords: [],
      averageProcessingTime: 0,
      peakMemoryUsage: 0,
      throughput: 0,
    };

    // 高リスクレコードの管理（上位100件のみ保持）
    const highRiskManager = new HighRiskRecordManager(100);
    
    // 出力ストリーム（オプション）
    let outputStream: NodeJS.WritableStream | null = null;
    let outputBuffer: string[] = [];
    const BUFFER_SIZE = 1000;

    if (options.outputFile) {
      outputStream = createWriteStream(options.outputFile);
      // CSVヘッダー
      outputStream.write('Name,Type,Content,TTL,RiskScore,RiskLevel,MatchedPatterns,Reasons\n');
    }

    // パフォーマンスモニタリング
    const performanceMonitor = new PerformanceMonitor();

    // 各ファイルを処理
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      console.log(chalk.blue(`\n━━━ ファイル ${fileIndex + 1}/${files.length}: ${file} ━━━`));

      const processor = new EnhancedCSVStreamProcessor({
        adaptiveChunking: options.adaptiveChunking !== false,
        parallelism: options.parallelism || 3,
        initialChunkSize: 2000,
        minChunkSize: 500,
        maxChunkSize: 10000,
        batchWriteSize: 100,
        onProgress: (metrics: PerformanceMetrics) => {
          if (!isCI && options.enableMetrics) {
            performanceMonitor.update(metrics);
            displayProgressBar(metrics, totalSize);
          }
        },
        onChunkProcessed: (chunkSize: number, processingTime: number) => {
          if (options.verbose) {
            console.log(chalk.gray(
              `  チャンク処理: ${chunkSize}件 in ${processingTime}ms ` +
              `(${Math.round(chunkSize / processingTime * 1000)} records/sec)`
            ));
          }
        },
      });

      // チャンク処理関数
      const processChunk = async (records: IDNSRecord[]): Promise<IAnalysisResult[]> => {
        const results: IAnalysisResult[] = [];
        
        for (const record of records) {
          if (!record.name || !record.type) {continue;}

          const result = analyzeRecord(record, patternConfig);
          
          // リスクレベルフィルタ
          if (options.riskLevel && !shouldIncludeRecord(result.riskLevel, options.riskLevel)) {
            continue;
          }

          // 統計更新
          statistics.totalRecords++;
          statistics.riskDistribution[result.riskLevel]++;

          // 高リスクレコード管理
          if (result.riskScore >= 50) {
            highRiskManager.add(result);
          }

          // 結果を保存（メモリ効率のため、高リスクのみ）
          if (result.riskScore >= 30) {
            results.push(result);
          }

          // バッファへの追加（CSV出力用）
          if (outputStream && result.riskScore > 0) {
            outputBuffer.push(formatCSVLine(result));
            
            // バッファがいっぱいになったらフラッシュ
            if (outputBuffer.length >= BUFFER_SIZE) {
              await flushBuffer(outputStream, outputBuffer);
              outputBuffer = [];
            }
          }
        }

        return results;
      };

      // ストリーム処理実行
      await processor.process(file, processChunk);
      
      const metrics = processor.getMetrics();
      statistics.peakMemoryUsage = Math.max(statistics.peakMemoryUsage, metrics.memoryUsage);
    }

    // 残りのバッファをフラッシュ
    if (outputStream && outputBuffer.length > 0) {
      await flushBuffer(outputStream, outputBuffer);
    }

    // 出力ストリームを閉じる
    if (outputStream) {
      await new Promise<void>(resolve => outputStream.end(() => resolve()));
      console.log(chalk.green(`\n✅ 詳細結果を ${options.outputFile} に保存しました`));
    }

    // 処理時間計算
    const overallTime = (performance.now() - overallStartTime) / 1000;
    statistics.throughput = statistics.totalRecords / overallTime;
    statistics.highRiskRecords = highRiskManager.getTop();

    // 結果表示
    displayEnhancedResults(statistics, overallTime, language);

    // パフォーマンスサマリー
    if (options.enableMetrics) {
      performanceMonitor.displaySummary();
    }

  } catch (error) {
    console.error(chalk.red(`エラー: ${error instanceof Error ? error.message : String(error)}`));
    throw error;
  }
}

/**
 * 高リスクレコード管理クラス
 */
class HighRiskRecordManager {
  private records: IAnalysisResult[] = [];
  private readonly maxSize: number;
  private minScore = 0;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  add(result: IAnalysisResult): void {
    if (this.records.length >= this.maxSize && result.riskScore <= this.minScore) {
      return;
    }

    this.records.push(result);

    if (this.records.length > this.maxSize) {
      this.records.sort((a, b) => b.riskScore - a.riskScore);
      this.records = this.records.slice(0, this.maxSize);
      this.minScore = this.records[this.records.length - 1].riskScore;
    }
  }

  getTop(n = 10): IAnalysisResult[] {
    return this.records
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, n);
  }
}

/**
 * パフォーマンスモニター
 */
class PerformanceMonitor {
  private samples: PerformanceMetrics[] = [];
  private startTime = performance.now();

  update(metrics: PerformanceMetrics): void {
    this.samples.push({ ...metrics });
    
    // サンプル数を制限
    if (this.samples.length > 100) {
      this.samples.shift();
    }
  }

  displaySummary(): void {
    if (this.samples.length === 0) {return;}

    const avgThroughput = this.samples.reduce((sum, s) => sum + s.throughput, 0) / this.samples.length;
    const peakMemory = Math.max(...this.samples.map(s => s.memoryUsage));
    const totalTime = (performance.now() - this.startTime) / 1000;

    console.log(chalk.blue('\n📊 パフォーマンスサマリー'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`  平均スループット: ${chalk.yellow(Math.round(avgThroughput).toLocaleString())} records/sec`);
    console.log(`  ピークメモリ使用: ${chalk.yellow(peakMemory)} MB`);
    console.log(`  総処理時間: ${chalk.yellow(totalTime.toFixed(2))} 秒`);
  }
}

/**
 * 結果表示
 */
function displayEnhancedResults(
  stats: StreamStatistics,
  totalTime: number,
  language: 'ja' | 'en'
): void {
  console.log(chalk.blue(`\n${'━'.repeat(60)}`));
  console.log(chalk.blue.bold('📊 分析結果サマリー'));
  console.log(chalk.blue(`${'━'.repeat(60)}`));

  // 基本統計
  console.log(`\n${chalk.bold('基本統計:')}`);
  console.log(`  総レコード数: ${chalk.yellow(stats.totalRecords.toLocaleString())}`);
  console.log(`  処理時間: ${chalk.yellow(totalTime.toFixed(2))} 秒`);
  console.log(`  スループット: ${chalk.yellow(Math.round(stats.throughput).toLocaleString())} records/sec`);
  console.log(`  ピークメモリ: ${chalk.yellow(stats.peakMemoryUsage)} MB`);

  // リスク分布
  console.log(`\n${chalk.bold('リスク分布:')}`);
  const levels: RiskLevel[] = ['critical', 'high', 'medium', 'low', 'safe'];
  
  for (const level of levels) {
    const count = stats.riskDistribution[level];
    const percentage = stats.totalRecords > 0 
      ? ((count / stats.totalRecords) * 100).toFixed(1)
      : '0.0';
    
    const icon = getRiskIcon(level);
    const color = getRiskColor(level);
    
    console.log(`  ${icon} ${color(level.padEnd(8))}: ${count.toLocaleString().padStart(8)} (${percentage}%)`);
  }

  // 高リスクレコード
  if (stats.highRiskRecords.length > 0) {
    console.log(`\n${chalk.bold('🔍 高リスクレコード (上位10件):')}`);
    stats.highRiskRecords.slice(0, 10).forEach((result, index) => {
      console.log(
        `  ${(index + 1).toString().padStart(2)}. ` +
        `${chalk.cyan(result.record.name.padEnd(40))} ` +
        `${result.riskLevel.padEnd(8)} ` +
        `スコア: ${chalk.yellow(result.riskScore.toString())}`
      );
    });
  }

  console.log(chalk.blue(`\n${'━'.repeat(60)}\n`));
}

// ユーティリティ関数
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function shouldIncludeRecord(recordLevel: RiskLevel, filterLevel: RiskLevel): boolean {
  const levels: RiskLevel[] = ['safe', 'low', 'medium', 'high', 'critical'];
  const recordIndex = levels.indexOf(recordLevel);
  const filterIndex = levels.indexOf(filterLevel);
  return recordIndex >= filterIndex;
}

function formatCSVLine(result: IAnalysisResult): string {
  const fields = [
    result.record.name,
    result.record.type,
    result.record.content,
    (result.record.ttl || 0).toString(),
    result.riskScore.toString(),
    result.riskLevel,
    result.matchedPatterns.join(';'),
    result.reasons.join(';'),
  ];
  
  return `${fields.map(f => `"${f.replace(/"/g, '""')}"`).join(',')  }\n`;
}

async function flushBuffer(stream: NodeJS.WritableStream, buffer: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.write(buffer.join(''), (error) => {
      if (error) {reject(error);}
      else {resolve();}
    });
  });
}

function displayProgressBar(metrics: PerformanceMetrics, totalSize: number): void {
  const percentage = Math.min(100, (metrics.bytesProcessed / totalSize) * 100);
  const barLength = 30;
  const filledLength = Math.round(barLength * percentage / 100);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  
  process.stdout.write(
    `\r  進捗: [${bar}] ${percentage.toFixed(1)}% | ` +
    `${metrics.recordsProcessed.toLocaleString()} records | ` +
    `${metrics.memoryUsage} MB | ` +
    `${Math.round(metrics.throughput)} rec/s`
  );
}

function getRiskIcon(level: RiskLevel): string {
  const icons: Record<RiskLevel, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
    safe: '⚪',
  };
  return icons[level] || '⚪';
}

function getRiskColor(level: RiskLevel): (text: string) => string {
  const colors: Record<RiskLevel, (text: string) => string> = {
    critical: chalk.red,
    high: chalk.rgb(255, 140, 0), // オレンジ
    medium: chalk.yellow,
    low: chalk.green,
    safe: chalk.gray,
  };
  return colors[level] || chalk.gray;
}