/**
 * 最適化されたCSVストリームパーサー
 * メモリプール、非同期パイプライン、適応的チャンクサイズを実装
 */

import { createReadStream, createWriteStream } from 'fs';
import { pipeline, Transform } from 'stream';
import Papa from 'papaparse';
import { promisify } from 'util';
import { IDNSRecord } from '../types/dns';

// const pipelineAsync = promisify(pipeline);

// メモリプール設定
interface MemoryPool<T> {
  pool: T[];
  factory: () => T;
  reset: (item: T) => void;
  acquire(): T;
  release(item: T): void;
}

// パフォーマンスメトリクス
export interface PerformanceMetrics {
  recordsProcessed: number;
  bytesProcessed: number;
  processingTime: number;
  averageRecordSize: number;
  throughput: number; // records/second
  memoryUsage: number;
}

// 強化されたストリームオプション
export interface EnhancedStreamOptions {
  initialChunkSize?: number;
  minChunkSize?: number;
  maxChunkSize?: number;
  memoryLimit?: number;
  adaptiveChunking?: boolean;
  parallelism?: number;
  batchWriteSize?: number;
  onProgress?: (metrics: PerformanceMetrics) => void;
  onChunkProcessed?: (chunkSize: number, processingTime: number) => void;
}

/**
 * DNSレコードのメモリプールを作成
 */
function createRecordPool(size: number = 1000): MemoryPool<IDNSRecord> {
  const pool: IDNSRecord[] = [];
  
  const factory = (): IDNSRecord => ({
    name: '',
    type: '',
    content: '',
    ttl: 300,
    proxied: false,
    created: '',
    modified: '',
  });

  const reset = (item: IDNSRecord): void => {
    item.name = '';
    item.type = '';
    item.content = '';
    item.ttl = 300;
    item.proxied = false;
    item.created = '';
    item.modified = '';
  };

  // プールを事前に埋める
  for (let i = 0; i < size; i++) {
    pool.push(factory());
  }

  return {
    pool,
    factory,
    reset,
    acquire(): IDNSRecord {
      return pool.pop() || factory();
    },
    release(item: IDNSRecord): void {
      reset(item);
      if (pool.length < size) {
        pool.push(item);
      }
    },
  };
}

/**
 * 適応的チャンクサイズ計算機
 */
class AdaptiveChunkSizer {
  private currentSize: number;
  private readonly minSize: number;
  private readonly maxSize: number;
  private readonly targetProcessingTime = 100; // ミリ秒
  private history: Array<{ size: number; time: number }> = [];

  constructor(initialSize = 1000, minSize = 100, maxSize = 10000) {
    this.currentSize = initialSize;
    this.minSize = minSize;
    this.maxSize = maxSize;
  }

  recordPerformance(chunkSize: number, processingTime: number): void {
    this.history.push({ size: chunkSize, time: processingTime });
    
    // 履歴を最新10件に制限
    if (this.history.length > 10) {
      this.history.shift();
    }

    // 適応的調整
    this.adjustSize();
  }

  private adjustSize(): void {
    if (this.history.length < 3) {return;}

    const recent = this.history.slice(-3);
    const avgTime = recent.reduce((sum, h) => sum + h.time, 0) / recent.length;
    const avgSize = recent.reduce((sum, h) => sum + h.size, 0) / recent.length;

    // 処理時間に基づいてサイズを調整
    if (avgTime < this.targetProcessingTime * 0.5) {
      // 処理が速すぎる場合は増やす
      this.currentSize = Math.min(this.maxSize, Math.floor(avgSize * 1.5));
    } else if (avgTime > this.targetProcessingTime * 1.5) {
      // 処理が遅すぎる場合は減らす
      this.currentSize = Math.max(this.minSize, Math.floor(avgSize * 0.7));
    }
  }

  getSize(): number {
    return this.currentSize;
  }
}

/**
 * 強化されたCSVストリーム処理
 */
export class EnhancedCSVStreamProcessor {
  private recordPool: MemoryPool<IDNSRecord>;
  private chunkSizer: AdaptiveChunkSizer;
  private metrics: PerformanceMetrics;
  private startTime: number = 0;

  constructor(private options: EnhancedStreamOptions = {}) {
    this.recordPool = createRecordPool(options.maxChunkSize || 10000);
    this.chunkSizer = new AdaptiveChunkSizer(
      options.initialChunkSize || 1000,
      options.minChunkSize || 100,
      options.maxChunkSize || 10000
    );
    this.metrics = {
      recordsProcessed: 0,
      bytesProcessed: 0,
      processingTime: 0,
      averageRecordSize: 0,
      throughput: 0,
      memoryUsage: 0,
    };
  }

  /**
   * 高性能ストリーム処理
   */
  async process<T>(
    inputFile: string,
    processChunk: (records: IDNSRecord[]) => Promise<T[]>,
    outputFile?: string
  ): Promise<T[]> {
    this.startTime = Date.now();
    const results: T[] = [];
    const chunk: IDNSRecord[] = [];
    let chunkStartTime = Date.now();

    // 非同期処理キュー
    const processingQueue: Promise<T[]>[] = [];
    const maxConcurrent = this.options.parallelism || 3;

    // 出力バッファ（バッチ書き込み用）
    const outputBuffer: string[] = [];
    // const batchWriteSize = this.options.batchWriteSize || 100;
    const outputStream = outputFile ? createWriteStream(outputFile) : null;

    // カスタム変換ストリーム
    const self = this;
    const transformStream = new Transform({
      objectMode: true,
      async transform(row: any, _encoding, callback) {
        try {
          const record = self.recordPool.acquire();
          
          // レコードの初期化（メモリプールから）
          record.name = row.Name || '';
          record.type = row.Type || '';
          record.content = row.Content || '';
          record.ttl = parseInt(row.TTL) || 300;
          record.proxied = String(row.Proxied) === 'true';
          record.created = row.Created || '';
          record.modified = row.Modified || '';

          chunk.push(record);

          // チャンクサイズに達したら処理
          const currentChunkSize = self.options.adaptiveChunking 
            ? self.chunkSizer.getSize() 
            : (self.options.initialChunkSize || 1000);

          if (chunk.length >= currentChunkSize) {
            const chunkToProcess = [...chunk];
            chunk.length = 0;

            // 並列処理の管理
            if (processingQueue.length >= maxConcurrent) {
              await Promise.race(processingQueue);
            }

            const processPromise = self.processChunkAsync(
              chunkToProcess,
              processChunk,
              chunkStartTime
            ).then(chunkResults => {
              // メモリプールに返却
              chunkToProcess.forEach(r => self.recordPool.release(r));
              return chunkResults;
            });

            processingQueue.push(processPromise);
            chunkStartTime = Date.now();
          }

          callback();
        } catch (error) {
          callback(error as Error);
        }
      }
    });

    return new Promise((resolve, reject) => {
      const readStream = createReadStream(inputFile);
      const parseStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim(),
      });

      readStream
        .pipe(parseStream)
        .pipe(transformStream)
        .on('data', () => {
          this.updateMetrics();
        })
        .on('end', async () => {
          try {
            // 残りのチャンクを処理
            if (chunk.length > 0) {
              const lastResults = await processChunk(chunk);
              results.push(...lastResults);
              chunk.forEach(r => this.recordPool.release(r));
            }

            // すべての並列処理を待つ
            const pendingResults = await Promise.all(processingQueue);
            pendingResults.forEach(r => results.push(...r));

            // 出力ストリームを閉じる
            if (outputStream) {
              await this.flushOutputBuffer(outputBuffer, outputStream);
              outputStream.end();
            }

            this.metrics.processingTime = (Date.now() - this.startTime) / 1000;
            this.metrics.throughput = this.metrics.recordsProcessed / this.metrics.processingTime;

            if (this.options.onProgress) {
              this.options.onProgress(this.metrics);
            }

            resolve(results);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  /**
   * 非同期チャンク処理
   */
  private async processChunkAsync<T>(
    chunk: IDNSRecord[],
    processChunk: (records: IDNSRecord[]) => Promise<T[]>,
    chunkStartTime: number
  ): Promise<T[]> {
    const results = await processChunk(chunk);
    
    const processingTime = Date.now() - chunkStartTime;
    this.metrics.recordsProcessed += chunk.length;

    // 適応的チャンクサイズの更新
    if (this.options.adaptiveChunking) {
      this.chunkSizer.recordPerformance(chunk.length, processingTime);
    }

    if (this.options.onChunkProcessed) {
      this.options.onChunkProcessed(chunk.length, processingTime);
    }

    return results;
  }

  /**
   * メトリクスの更新
   */
  private updateMetrics(): void {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    if (this.metrics.recordsProcessed > 0 && this.metrics.bytesProcessed > 0) {
      this.metrics.averageRecordSize = Math.round(
        this.metrics.bytesProcessed / this.metrics.recordsProcessed
      );
    }
  }

  /**
   * バッチ出力のフラッシュ
   */
  private async flushOutputBuffer(
    buffer: string[],
    stream: NodeJS.WritableStream
  ): Promise<void> {
    if (buffer.length === 0) {return;}

    return new Promise((resolve, reject) => {
      stream.write(buffer.join(''), (error) => {
        if (error) {reject(error);}
        else {resolve();}
      });
    });
  }

  /**
   * メトリクスを取得
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}