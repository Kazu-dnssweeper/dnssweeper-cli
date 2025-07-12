/**
 * 分散処理プロセッサー
 * 超大規模ファイル（10GB以上）を複数のワーカーで並列処理
 */

import { isMainThread, parentPort, Worker, workerData } from 'worker_threads';
import { createReadStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import os from 'os';
import { IAnalysisResult, IDNSRecord, RiskLevel } from '../types/dns';

const pipelineAsync = promisify(pipeline);

// ワーカーメッセージ型
type WorkerMessage = 
  | { type: 'chunk'; data: IDNSRecord[]; chunkId: number }
  | { type: 'result'; results: IAnalysisResult[]; stats: ChunkStats }
  | { type: 'error'; error: string }
  | { type: 'progress'; processed: number; chunkId: number }
  | { type: 'complete'; finalStats: WorkerStats };

// チャンク統計
interface ChunkStats {
  chunkId: number;
  recordCount: number;
  riskDistribution: Record<RiskLevel, number>;
  processingTime: number;
  memoryUsage: number;
}

// ワーカー統計
interface WorkerStats {
  workerId: number;
  totalProcessed: number;
  totalTime: number;
  peakMemory: number;
  errorCount: number;
}

// 分散処理オプション
export interface DistributedProcessingOptions {
  workerCount?: number;
  chunkSize?: number;
  maxQueueSize?: number;
  progressInterval?: number;
  onProgress?: (progress: DistributedProgress) => void;
  onWorkerStats?: (stats: WorkerStats) => void;
}

// 進捗情報
export interface DistributedProgress {
  totalProcessed: number;
  activeWorkers: number;
  queueSize: number;
  throughput: number;
  estimatedTimeRemaining: number;
}

/**
 * 分散処理コーディネーター（メインスレッド用）
 */
export class DistributedProcessor {
  private workers: Worker[] = [];
  private workerStats = new Map<number, WorkerStats>();
  private chunkQueue: Array<{ chunk: IDNSRecord[]; id: number }> = [];
  private activeChunks = new Map<number, number>(); // chunkId -> workerId
  private processedChunks = new Set<number>();
  private totalProcessed = 0;
  private startTime = Date.now();
  private options: Required<DistributedProcessingOptions>;

  constructor(options: DistributedProcessingOptions = {}) {
    this.options = {
      workerCount: options.workerCount || Math.max(1, os.cpus().length - 1),
      chunkSize: options.chunkSize || 5000,
      maxQueueSize: options.maxQueueSize || 100,
      progressInterval: options.progressInterval || 1000,
      onProgress: options.onProgress || (() => {}),
      onWorkerStats: options.onWorkerStats || (() => {}),
    };
  }

  /**
   * 分散処理の開始
   */
  async process(
    filePath: string,
    workerScriptPath: string,
    patternConfig: any
  ): Promise<{
    results: IAnalysisResult[];
    stats: {
      totalRecords: number;
      totalTime: number;
      avgThroughput: number;
      workerStats: WorkerStats[];
    };
  }> {
    console.log(`🚀 分散処理開始: ${this.options.workerCount}ワーカー`);
    
    try {
      // ワーカーの初期化
      await this.initializeWorkers(workerScriptPath, patternConfig);
      
      // ファイル読み込みと分散処理
      const results = await this.processFile(filePath);
      
      // 統計情報の集計
      const totalTime = (Date.now() - this.startTime) / 1000;
      const avgThroughput = this.totalProcessed / totalTime;
      const workerStatsArray = Array.from(this.workerStats.values());
      
      return {
        results,
        stats: {
          totalRecords: this.totalProcessed,
          totalTime,
          avgThroughput,
          workerStats: workerStatsArray,
        },
      };
      
    } finally {
      // ワーカーの終了
      await this.terminateWorkers();
    }
  }

  /**
   * ワーカーの初期化
   */
  private async initializeWorkers(scriptPath: string, patternConfig: any): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < this.options.workerCount; i++) {
      const promise = new Promise<void>((resolve, reject) => {
        const worker = new Worker(scriptPath, {
          workerData: {
            workerId: i,
            patternConfig,
          },
        });
        
        worker.on('message', (message: WorkerMessage) => {
          this.handleWorkerMessage(i, message);
        });
        
        worker.on('error', (error) => {
          console.error(`Worker ${i} error:`, error);
          reject(error);
        });
        
        worker.on('exit', (code) => {
          if (code !== 0) {
            console.error(`Worker ${i} exited with code ${code}`);
          }
        });
        
        this.workers.push(worker);
        
        // ワーカー統計の初期化
        this.workerStats.set(i, {
          workerId: i,
          totalProcessed: 0,
          totalTime: 0,
          peakMemory: 0,
          errorCount: 0,
        });
        
        resolve();
      });
      
      promises.push(promise);
    }
    
    await Promise.all(promises);
    console.log(`✅ ${this.workers.length}ワーカーを初期化しました`);
  }

  /**
   * ファイル処理
   */
  private async processFile(filePath: string): Promise<IAnalysisResult[]> {
    const results: IAnalysisResult[] = [];
    let currentChunk: IDNSRecord[] = [];
    let chunkId = 0;
    
    // 進捗レポートタイマー
    const progressTimer = setInterval(() => {
      this.reportProgress();
    }, this.options.progressInterval);
    
    try {
      // CSVパース（簡易実装）
      await new Promise((resolve, reject) => {
        const stream = createReadStream(filePath);
        let buffer = '';
        let headerProcessed = false;
        let headers: string[] = [];
        
        stream.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!headerProcessed) {
              headers = line.split(',').map(h => h.trim());
              headerProcessed = true;
              continue;
            }
            
            const values = line.split(',');
            if (values.length === headers.length) {
              const record: IDNSRecord = {
                name: values[headers.indexOf('Name')] || '',
                type: values[headers.indexOf('Type')] || '',
                content: values[headers.indexOf('Content')] || '',
                ttl: parseInt(values[headers.indexOf('TTL')] || '300'),
                proxied: values[headers.indexOf('Proxied')] === 'true',
                created: values[headers.indexOf('Created')] || '',
                modified: values[headers.indexOf('Modified')] || '',
              };
              
              currentChunk.push(record);
              
              // チャンクが満杯になったら処理
              if (currentChunk.length >= this.options.chunkSize) {
                this.enqueueChunk(currentChunk, chunkId++);
                currentChunk = [];
              }
            }
          }
        });
        
        stream.on('end', () => {
          // 最後のチャンクを処理
          if (currentChunk.length > 0) {
            this.enqueueChunk(currentChunk, chunkId++);
          }
          resolve(undefined);
        });
        
        stream.on('error', reject);
      });
      
      // すべてのチャンクの処理完了を待つ
      await this.waitForCompletion(chunkId);
      
      // 結果の集約
      // （実際の実装では、ワーカーからの結果を集約）
      
      return results;
      
    } finally {
      clearInterval(progressTimer);
    }
  }

  /**
   * チャンクをキューに追加
   */
  private async enqueueChunk(chunk: IDNSRecord[], id: number): Promise<void> {
    // キューサイズ制限
    while (this.chunkQueue.length >= this.options.maxQueueSize) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.chunkQueue.push({ chunk, id });
    this.distributeWork();
  }

  /**
   * ワークの分配
   */
  private distributeWork(): void {
    // アイドルワーカーを探す
    for (let i = 0; i < this.workers.length; i++) {
      if (this.isWorkerIdle(i) && this.chunkQueue.length > 0) {
        const work = this.chunkQueue.shift();
        if (work) {
          this.activeChunks.set(work.id, i);
          this.workers[i].postMessage({
            type: 'chunk',
            data: work.chunk,
            chunkId: work.id,
          });
        }
      }
    }
  }

  /**
   * ワーカーがアイドル状態かチェック
   */
  private isWorkerIdle(workerId: number): boolean {
    for (const [_, assignedWorkerId] of this.activeChunks) {
      if (assignedWorkerId === workerId) {
        return false;
      }
    }
    return true;
  }

  /**
   * ワーカーメッセージの処理
   */
  private handleWorkerMessage(workerId: number, message: WorkerMessage): void {
    switch (message.type) {
      case 'result':
        this.handleChunkResult(workerId, message.results, message.stats);
        break;
        
      case 'progress':
        this.updateWorkerProgress(workerId, message.processed);
        break;
        
      case 'error':
        console.error(`Worker ${workerId} error:`, message.error);
        const stats = this.workerStats.get(workerId);
        if (stats) {stats.errorCount++;}
        break;
        
      case 'complete':
        this.updateWorkerStats(workerId, message.finalStats);
        break;
    }
  }

  /**
   * チャンク結果の処理
   */
  private handleChunkResult(workerId: number, _results: IAnalysisResult[], stats: ChunkStats): void {
    // チャンクを完了としてマーク
    this.activeChunks.delete(stats.chunkId);
    this.processedChunks.add(stats.chunkId);
    
    // 統計更新
    this.totalProcessed += stats.recordCount;
    const workerStat = this.workerStats.get(workerId);
    if (workerStat) {
      workerStat.totalProcessed += stats.recordCount;
      workerStat.peakMemory = Math.max(workerStat.peakMemory, stats.memoryUsage);
    }
    
    // 次のワークを分配
    this.distributeWork();
  }

  /**
   * ワーカー進捗の更新
   */
  private updateWorkerProgress(_workerId: number, _processed: number): void {
    // 進捗情報の更新
  }

  /**
   * ワーカー統計の更新
   */
  private updateWorkerStats(workerId: number, finalStats: WorkerStats): void {
    this.workerStats.set(workerId, finalStats);
    this.options.onWorkerStats(finalStats);
  }

  /**
   * 進捗レポート
   */
  private reportProgress(): void {
    const elapsedTime = (Date.now() - this.startTime) / 1000;
    const throughput = this.totalProcessed / elapsedTime;
    const activeWorkers = Array.from(this.activeChunks.values()).length;
    
    const progress: DistributedProgress = {
      totalProcessed: this.totalProcessed,
      activeWorkers,
      queueSize: this.chunkQueue.length,
      throughput,
      estimatedTimeRemaining: 0, // TODO: 推定
    };
    
    this.options.onProgress(progress);
  }

  /**
   * すべてのチャンクの完了を待つ
   */
  private async waitForCompletion(totalChunks: number): Promise<void> {
    while (this.processedChunks.size < totalChunks) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * ワーカーの終了
   */
  private async terminateWorkers(): Promise<void> {
    const promises = this.workers.map(worker => worker.terminate());
    await Promise.all(promises);
    console.log('✅ すべてのワーカーを終了しました');
  }
}

/**
 * ワーカースレッド実装（別ファイルで使用）
 */
export function runWorker(): void {
  if (!isMainThread && parentPort) {
    const { workerId } = workerData;
    
    parentPort.on('message', async (message: any) => {
      if (message.type === 'chunk') {
        try {
          const startTime = Date.now();
          const results: IAnalysisResult[] = [];
          const riskDistribution: Record<RiskLevel, number> = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            safe: 0,
          };
          
          // チャンクの処理（実際の分析ロジックをここに実装）
          for (const record of message.data) {
            // 簡易的な分析（実際はpatternMatcherを使用）
            const result: IAnalysisResult = {
              record,
              riskScore: Math.random() * 100,
              riskLevel: 'low',
              matchedPatterns: [],
              reasons: [],
            };
            
            results.push(result);
            riskDistribution[result.riskLevel]++;
          }
          
          // 結果を返送
          const stats: ChunkStats = {
            chunkId: message.chunkId,
            recordCount: message.data.length,
            riskDistribution,
            processingTime: Date.now() - startTime,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
          };
          
          parentPort!.postMessage({
            type: 'result',
            results,
            stats,
          });
          
        } catch (error) {
          parentPort!.postMessage({
            type: 'error',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    });
  }
}