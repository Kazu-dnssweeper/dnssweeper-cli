/**
 * 最適化版CSVストリーミングパーサー
 * パフォーマンスとメモリ効率を最大化
 */

import Papa from 'papaparse';
import { createReadStream } from 'fs';
import { Transform, pipeline } from 'stream';
import { promisify } from 'util';
import { DNSRecord, AnalysisResult } from '../types/dns';
import { PatternConfig } from '../types/dns';
import { PerformanceMonitor } from '../utils/performanceMonitor';
import { ObjectPool, PoolableRecord } from '../utils/objectPool';
import { analyzeRecord } from '../patterns/patternMatcher';

const pipelineAsync = promisify(pipeline);

// グローバルパフォーマンスモニター
const perfMonitor = new PerformanceMonitor();

// レコードオブジェクトプール（メモリ再利用）
const recordPool = new ObjectPool<PoolableRecord>(
  () => new PoolableRecord(),
  { initialSize: 100, maxSize: 1000 }
);

/**
 * 最適化されたストリーミングオプション
 */
export interface OptimizedStreamOptions {
  chunkSize?: number;
  onProgress?: (processed: number, percentage?: number) => void;
  memoryLimit?: number;
  enableProfiling?: boolean;
  parallelChunks?: number; // 並列処理チャンク数
}

/**
 * 最適化されたDNSレコードプロセッサー
 */
class OptimizedDNSProcessor extends Transform {
  private buffer: DNSRecord[] = [];
  private processedCount = 0;
  private readonly chunkSize: number;
  private readonly onProgress?: (processed: number, percentage?: number) => void;
  private readonly processChunk: (records: DNSRecord[]) => Promise<AnalysisResult[]>;
  private readonly parallelChunks: number;
  private processingPromises: Promise<void>[] = [];

  constructor(
    processChunk: (records: DNSRecord[]) => Promise<AnalysisResult[]>,
    options: OptimizedStreamOptions = {}
  ) {
    super({ 
      objectMode: true,
      highWaterMark: options.chunkSize || 1000 // バッファサイズ最適化
    });
    this.chunkSize = options.chunkSize || 1000;
    this.onProgress = options.onProgress;
    this.processChunk = processChunk;
    this.parallelChunks = options.parallelChunks || 3;
  }

  async _transform(
    record: any,
    _encoding: string,
    callback: (error?: Error | null) => void
  ): Promise<void> {
    try {
      // 高速バリデーション（早期リターン）
      if (!record.Name || !record.Type) {
        callback();
        return;
      }

      // レコードの変換（最小限の処理）
      const dnsRecord: DNSRecord = {
        name: record.Name,
        type: record.Type,
        content: record.Content || '',
        ttl: +record.TTL || 300, // 単項プラス演算子で高速変換
        proxied: record.Proxied === 'true' || record.Proxied === true,
        created: record.Created || '',
        modified: record.Modified || '',
      };

      this.buffer.push(dnsRecord);
      this.processedCount++;

      // バッファがチャンクサイズに達したら処理
      if (this.buffer.length >= this.chunkSize) {
        await this.flushBuffer();
      }

      // 進捗報告（100件ごと）
      if (this.onProgress && this.processedCount % 100 === 0) {
        setImmediate(() => this.onProgress!(this.processedCount));
      }

      callback();
    } catch (error) {
      callback(error as Error);
    }
  }

  async _flush(callback: (error?: Error | null) => void): Promise<void> {
    try {
      // 残りのバッファを処理
      if (this.buffer.length > 0) {
        await this.flushBuffer();
      }

      // すべての並列処理が完了するまで待機
      await Promise.all(this.processingPromises);

      if (this.onProgress) {
        this.onProgress(this.processedCount, 100);
      }

      callback();
    } catch (error) {
      callback(error as Error);
    }
  }

  private async flushBuffer(): Promise<void> {
    const chunk = this.buffer.splice(0, this.chunkSize);
    
    // 並列処理数を制限
    while (this.processingPromises.length >= this.parallelChunks) {
      await Promise.race(this.processingPromises);
    }

    // 非同期でチャンクを処理
    const promise = this.processChunkAsync(chunk).then(() => {
      // 完了したPromiseを配列から削除
      const index = this.processingPromises.indexOf(promise);
      if (index !== -1) {
        this.processingPromises.splice(index, 1);
      }
    });

    this.processingPromises.push(promise);
  }

  private async processChunkAsync(chunk: DNSRecord[]): Promise<void> {
    const results = await this.processChunk(chunk);
    results.forEach(result => this.push(result));
  }
}

/**
 * 最適化されたチャンク処理関数
 */
async function optimizedProcessChunk(
  records: DNSRecord[],
  patternConfig: PatternConfig,
  enableProfiling: boolean = false
): Promise<AnalysisResult[]> {
  const processFunc = async () => {
    const results: AnalysisResult[] = [];
    const pooledRecords = recordPool.acquireBatch(records.length);

    try {
      // バッチ処理で効率化
      for (let i = 0; i < records.length; i++) {
        const pooled = pooledRecords[i];
        Object.assign(pooled.data, records[i]);
        
        const result = analyzeRecord(pooled.data as DNSRecord, patternConfig);
        results.push(result);
      }
    } finally {
      // オブジェクトをプールに返却
      recordPool.releaseBatch(pooledRecords);
    }

    return results;
  };

  if (enableProfiling) {
    return perfMonitor.measure('processChunk', processFunc, { 
      recordCount: records.length 
    });
  }

  return processFunc();
}

/**
 * 最適化されたCSVストリーミング処理
 */
export async function streamProcessCSVOptimized(
  filePath: string,
  patternConfig: PatternConfig,
  options: OptimizedStreamOptions = {}
): Promise<{
  results: AnalysisResult[];
  stats?: {
    totalRecords: number;
    processingTime: number;
    memoryPeak: number;
    performance?: string;
  };
}> {
  const startTime = Date.now();
  const results: AnalysisResult[] = [];
  const memoryLimit = options.memoryLimit || 100;
  let memoryPeak = 0;

  // メモリ監視
  const checkMemory = (): number => {
    const usage = process.memoryUsage();
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    memoryPeak = Math.max(memoryPeak, usedMB);
    
    if (usedMB > memoryLimit) {
      console.warn(`⚠️  メモリ使用量が制限を超えています: ${usedMB}MB / ${memoryLimit}MB`);
      // ガベージコレクションを強制実行
      if (global.gc) {
        global.gc();
      }
    }
    
    return usedMB;
  };

  // 定期的なメモリチェック
  const memoryCheckInterval = setInterval(checkMemory, 500);

  try {
    const readStream = createReadStream(filePath, {
      highWaterMark: 64 * 1024 // 64KB読み込みバッファ
    });

    const processChunk = (records: DNSRecord[]) => 
      optimizedProcessChunk(records, patternConfig, options.enableProfiling);

    const processor = new OptimizedDNSProcessor(processChunk, options);

    // Papa Parse の最適化設定
    const parseStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      fastMode: true, // 高速モード
      chunk: undefined, // ストリーミングモード
    });

    // 結果収集用の最適化されたTransformストリーム
    const resultCollector = new Transform({
      objectMode: true,
      highWaterMark: 1000,
      transform(result: AnalysisResult, _encoding: any, callback: any) {
        results.push(result);
        callback();
      },
    });

    // ストリームパイプラインの構築
    await pipelineAsync(
      readStream,
      parseStream,
      processor,
      resultCollector
    );

    const processingTime = Date.now() - startTime;

    const stats = {
      totalRecords: results.length,
      processingTime,
      memoryPeak,
      performance: options.enableProfiling ? perfMonitor.generateReport() : undefined
    };

    return { results, stats };
  } finally {
    clearInterval(memoryCheckInterval);
    
    // パフォーマンスレポート出力
    if (options.enableProfiling) {
      console.log('\n=== Performance Report ===');
      console.log(perfMonitor.generateReport());
    }
  }
}

/**
 * ストリーミング処理の推奨設定を取得
 */
export function getOptimalStreamSettings(fileSize: number): OptimizedStreamOptions {
  const fileSizeMB = fileSize / (1024 * 1024);
  
  if (fileSizeMB < 10) {
    // 小さいファイル（10MB未満）
    return {
      chunkSize: 5000,
      parallelChunks: 1,
      memoryLimit: 50
    };
  } else if (fileSizeMB < 100) {
    // 中サイズファイル（10MB-100MB）
    return {
      chunkSize: 2000,
      parallelChunks: 2,
      memoryLimit: 100
    };
  } else {
    // 大きいファイル（100MB以上）
    return {
      chunkSize: 1000,
      parallelChunks: 3,
      memoryLimit: 200
    };
  }
}

/**
 * パフォーマンス統計をエクスポート
 */
export function exportPerformanceStats(): string {
  return perfMonitor.exportToCSV();
}

/**
 * オブジェクトプールの統計を取得
 */
export function getPoolStats() {
  return recordPool.getStats();
}