/**
 * DNSレコード分析ワーカー
 * 分散処理でチャンクを並列処理
 */

import { isMainThread, parentPort, workerData } from 'worker_threads';
import { IAnalysisResult, IDNSRecord, IPatternConfig, RiskLevel } from '../types/dns';
import { loadPatternConfig, PatternMatcher } from '../patterns/index';

// ワーカーメッセージ型
type WorkerMessage = 
  | { type: 'chunk'; data: IDNSRecord[]; chunkId: number }
  | { type: 'shutdown' };

// type WorkerResponse = 
//   | { type: 'result'; results: IAnalysisResult[]; stats: ChunkStats }
//   | { type: 'error'; error: string }
//   | { type: 'progress'; processed: number; chunkId: number }
//   | { type: 'ready' }
//   | { type: 'complete'; finalStats: WorkerStats };

interface IChunkStats {
  chunkId: number;
  recordCount: number;
  riskDistribution: Record<RiskLevel, number>;
  processingTime: number;
  memoryUsage: number;
}

interface IWorkerStats {
  workerId: number;
  totalProcessed: number;
  totalTime: number;
  peakMemory: number;
  errorCount: number;
}

/**
 * ワーカープロセスのメイン処理
 */
async function runWorker(): Promise<void> {
  if (isMainThread || !parentPort) {
    throw new Error('This file should be run as a worker thread');
  }

  const { workerId, patternConfig } = workerData as { workerId: number; patternConfig?: unknown };
  
  // パターンマッチャーの初期化
  let patternMatcher: PatternMatcher;
  try {
    const patterns = (typeof patternConfig !== 'undefined') ? patternConfig as IPatternConfig : await loadPatternConfig();
    patternMatcher = new PatternMatcher(patterns);
  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      error: `Failed to initialize pattern matcher: ${String(error)}`,
    });
    return;
  }

  // ワーカー統計
  const stats: IWorkerStats = {
    workerId,
    totalProcessed: 0,
    totalTime: 0,
    peakMemory: 0,
    errorCount: 0,
  };

  const startTime = Date.now();

  // 準備完了を通知
  parentPort.postMessage({ type: 'ready' });

  // メッセージ処理
  parentPort.on('message', (message: WorkerMessage) => {
    if (message.type === 'shutdown') {
      // 終了処理
      stats.totalTime = (Date.now() - startTime) / 1000;
      parentPort!.postMessage({
        type: 'complete',
        finalStats: stats,
      });
      process.exit(0);
    }

    if (message.type === 'chunk') {
      const chunkStartTime = Date.now();
      
      try {
        const results: IAnalysisResult[] = [];
        const riskDistribution: Record<RiskLevel, number> = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          safe: 0,
        };

        // 進捗通知用カウンター
        let processedInChunk = 0;
        const progressInterval = Math.floor(message.data.length / 10) || 100;

        // チャンクの各レコードを分析
        for (const record of message.data) {
          try {
            // パターンマッチング分析
            const result = patternMatcher.analyze(record);
            results.push(result);
            riskDistribution[result.riskLevel as RiskLevel]++;

            processedInChunk++;
            stats.totalProcessed++;

            // 定期的に進捗を報告
            if (processedInChunk % progressInterval === 0) {
              parentPort!.postMessage({
                type: 'progress',
                processed: processedInChunk,
                chunkId: message.chunkId,
              });
            }
          } catch (error) {
            stats.errorCount++;
            console.error(`Error analyzing record: ${String(error)}`);
          }
        }

        // メモリ使用量の記録
        const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        stats.peakMemory = Math.max(stats.peakMemory, currentMemory);

        // チャンク処理完了の統計
        const chunkStats: IChunkStats = {
          chunkId: message.chunkId,
          recordCount: message.data.length,
          riskDistribution,
          processingTime: Date.now() - chunkStartTime,
          memoryUsage: currentMemory,
        };

        // 結果を返送
        parentPort!.postMessage({
          type: 'result',
          results,
          stats: chunkStats,
        });

      } catch (error) {
        stats.errorCount++;
        parentPort!.postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  // エラーハンドリング
  process.on('uncaughtException', (error) => {
    console.error('Worker uncaught exception:', error);
    parentPort!.postMessage({
      type: 'error',
      error: `Uncaught exception: ${error.message}`,
    });
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Worker unhandled rejection:', reason);
    parentPort!.postMessage({
      type: 'error',
      error: `Unhandled rejection: ${String(reason)}`,
    });
  });
}

// ワーカーとして実行された場合のみ処理を開始
if (!isMainThread) {
  runWorker().catch(error => {
    console.error('Worker failed to start:', error);
    process.exit(1);
  });
}

export { runWorker };