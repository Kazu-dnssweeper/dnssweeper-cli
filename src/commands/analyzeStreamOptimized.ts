/**
 * 最適化されたストリーミング分析コマンド
 * 結果を全て保持せず、統計情報のみを保持してメモリ効率を改善
 */

import chalk from 'chalk';
import ora from 'ora';
import { createReadStream } from 'fs';
import Papa from 'papaparse';
import { loadPatternConfig } from '../patterns/patternLoader';
import { analyzeRecord } from '../patterns/patternMatcher';
import { getMessages } from '../utils/messages';
import type { IDNSRecord, RiskLevel } from '../types/dns';
import { createWriteStream } from 'fs';

interface StreamStats {
  totalRecords: number;
  riskDistribution: Record<RiskLevel, number>;
  processingTime: number;
  peakMemory: number;
  topRiskyRecords: Array<{
    record: IDNSRecord;
    riskScore: number;
    riskLevel: RiskLevel;
  }>;
}

interface AnalyzeStreamOptimizedOptions {
  output: 'table' | 'json' | 'csv';
  english?: boolean;
  verbose?: boolean;
  riskLevel?: RiskLevel;
  outputFile?: string;
  patterns?: string;
  stream?: boolean;
  chunkSize?: number;
  memoryLimit?: number;
  topN?: number; // 上位N件のみ保持（デフォルト: 100）
}

/**
 * リスクレベルの優先度を数値化
 */
function getRiskLevelPriority(level: RiskLevel): number {
  const priorities: Record<RiskLevel, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    safe: 1,
  };
  return priorities[level] || 0;
}

/**
 * メモリ効率的なトップN管理クラス
 */
class TopRecordsManager {
  private records: Array<{
    record: IDNSRecord;
    riskScore: number;
    riskLevel: RiskLevel;
  }> = [];
  private readonly maxSize: number;
  private minScore = 0;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  add(record: IDNSRecord, riskScore: number, riskLevel: RiskLevel): void {
    // 最小スコアより低い場合はスキップ
    if (this.records.length >= this.maxSize && riskScore <= this.minScore) {
      return;
    }

    this.records.push({ record, riskScore, riskLevel });
    
    // ソートして上位のみ保持
    if (this.records.length > this.maxSize) {
      this.records.sort((a, b) => b.riskScore - a.riskScore);
      this.records = this.records.slice(0, this.maxSize);
      this.minScore = this.records[this.records.length - 1].riskScore;
    }
  }

  getTop(n?: number): typeof this.records {
    const sorted = this.records.sort((a, b) => b.riskScore - a.riskScore);
    return n ? sorted.slice(0, n) : sorted;
  }
}

/**
 * 最適化されたストリーミング分析コマンド
 */
export async function analyzeStreamOptimizedCommand(
  files: string[],
  options: AnalyzeStreamOptimizedOptions,
): Promise<void> {
  const language = options.english ? 'en' : 'ja';
  const messages = getMessages(language);
  const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';
  
  const spinner = isCI 
    ? { 
      start: (): any => ({ text: '', succeed: (): void => {}, fail: (): void => {} }), 
      text: '',
      succeed: (): void => {},
      fail: (): void => {},
    }
    : ora(messages.app.analyzing).start();

  try {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    console.log(chalk.blue(messages.app.title));
    console.log(chalk.yellow('🚀 最適化ストリーミングモード'));
    
    // パターン設定の読み込み
    const patternConfig = await loadPatternConfig(options.patterns);
    
    // 統計情報の初期化
    const stats: StreamStats = {
      totalRecords: 0,
      riskDistribution: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        safe: 0,
      },
      processingTime: 0,
      peakMemory: initialMemory,
      topRiskyRecords: [],
    };

    // トップレコード管理
    const topRecords = new TopRecordsManager(options.topN || 100);
    
    // 出力ファイルストリーム（オプション）
    let outputStream: any = null;
    if (options.outputFile && options.output === 'csv') {
      outputStream = createWriteStream(options.outputFile);
      outputStream.write('Name,Type,Content,TTL,Proxied,Created,Modified,RiskScore,RiskLevel,MatchedPatterns,Reasons\n');
    }

    // 各ファイルを処理
    for (const file of files) {
      console.log(chalk.cyan(`\n📂 処理中: ${file}`));
      
      await new Promise<void>((resolve, reject) => {
        const stream = createReadStream(file);
        let localCount = 0;

        Papa.parse(stream, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          transform: (value: string) => value.trim(),
          step: (row: any) => {
            if (row.errors.length > 0) {return;}

            const data = row.data as Record<string, any>;
            const record: IDNSRecord = {
              name: data.Name || '',
              type: data.Type || '',
              content: data.Content || '',
              ttl: parseInt(data.TTL) || 300,
              proxied: String(data.Proxied) === 'true',
              created: data.Created || '',
              modified: data.Modified || '',
            };

            // バリデーション
            if (!record.name || !record.type) {return;}

            // レコード分析
            const result = analyzeRecord(record, patternConfig);
            
            // リスクレベルフィルタ
            if (options.riskLevel) {
              const priority = getRiskLevelPriority(result.riskLevel);
              const minPriority = getRiskLevelPriority(options.riskLevel);
              if (priority < minPriority) {return;}
            }

            // 統計更新
            stats.totalRecords++;
            stats.riskDistribution[result.riskLevel]++;
            localCount++;

            // トップレコード更新
            topRecords.add(record, result.riskScore, result.riskLevel);

            // CSVストリーム出力
            if (outputStream && result.riskScore > 0) {
              const csvLine = `"${record.name}","${record.type}","${record.content}",${record.ttl},${record.proxied},"${record.created}","${record.modified}",${result.riskScore},"${result.riskLevel}","${result.matchedPatterns.join(';')}","${result.reasons.join(';')}"\n`;
              outputStream.write(csvLine);
            }

            // 進捗表示
            if (!isCI && localCount % 1000 === 0) {
              const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
              stats.peakMemory = Math.max(stats.peakMemory, currentMemory);
              spinner.text = `処理中... ${stats.totalRecords}件 | メモリ: ${Math.round(currentMemory)}MB`;
            }
          },
          complete: () => resolve(),
          error: (error: any) => reject(error),
        });
      });
    }

    // 出力ストリームを閉じる
    if (outputStream) {
      await new Promise(resolve => outputStream.end(resolve));
    }

    // 処理完了
    const endTime = Date.now();
    stats.processingTime = (endTime - startTime) / 1000;
    stats.topRiskyRecords = topRecords.getTop(10);

    if (!isCI) {
      spinner.succeed();
    }

    // 結果表示
    displayStreamResults(stats, options, language);

    // メモリ使用量の最終報告
    const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(chalk.gray(`\n最終メモリ使用量: ${Math.round(finalMemory)}MB (ピーク: ${Math.round(stats.peakMemory)}MB)`));
    console.log(chalk.green(`✅ 処理完了: ${stats.processingTime.toFixed(2)}秒`));

  } catch (error) {
    if (!isCI) {
      spinner.fail();
    }
    console.error(chalk.red(`エラー: ${error instanceof Error ? error.message : String(error)}`));
    throw error;
  }
}

/**
 * ストリーミング結果の表示
 */
function displayStreamResults(
  stats: StreamStats,
  options: AnalyzeStreamOptimizedOptions,
  language: 'ja' | 'en',
): void {
  const messages = getMessages(language);

  console.log(chalk.blue(`\n${messages.analysis.summary}`));
  console.log(chalk.gray('='.repeat(50)));
  
  // 基本統計
  console.log(`${messages.analysis.totalRecords} ${chalk.yellow(stats.totalRecords.toLocaleString())}`);
  console.log(`${messages.analysis.processingTime} ${chalk.yellow(stats.processingTime.toFixed(2))}秒`);
  console.log(`処理速度: ${chalk.yellow(Math.round(stats.totalRecords / stats.processingTime).toLocaleString())} レコード/秒`);
  
  // リスク分布
  console.log(`\n${messages.analysis.riskDistribution}`);
  const levels: RiskLevel[] = ['critical', 'high', 'medium', 'low', 'safe'];
  for (const level of levels) {
    const count = stats.riskDistribution[level];
    const percentage = stats.totalRecords > 0 
      ? ((count / stats.totalRecords) * 100).toFixed(1)
      : '0.0';
    console.log(`  ${level}: ${count.toLocaleString()} (${percentage}%)`);
  }

  // 高リスクレコード
  if (stats.topRiskyRecords.length > 0) {
    console.log(chalk.bold(`\n🔍 高リスクレコード（上位${Math.min(10, stats.topRiskyRecords.length)}件）:`));
    stats.topRiskyRecords.slice(0, 10).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.record.name} (${item.riskLevel}, スコア: ${item.riskScore})`);
    });
  }

  // ファイル出力の通知
  if (options.outputFile) {
    console.log(chalk.green(`\n✅ 詳細結果を ${options.outputFile} に保存しました`));
  }
}