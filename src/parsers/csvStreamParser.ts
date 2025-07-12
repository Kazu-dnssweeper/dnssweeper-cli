/**
 * CSVストリーミングパーサー - 大規模ファイル対応
 * メモリ効率的にCloudflare形式のDNSレコードCSVを解析
 */

import Papa from 'papaparse';
import { createReadStream } from 'fs';
import { pipeline, Transform } from 'stream';
import { promisify } from 'util';
import { IAnalysisResult, IDNSRecord } from '../types/dns';
import { IPatternConfig } from '../types/dns';

const pipelineAsync = promisify(pipeline);

/**
 * ストリーミング処理のオプション
 */
export interface StreamOptions {
  chunkSize?: number; // 一度に処理するレコード数（デフォルト: 1000）
  onProgress?: (processed: number, percentage?: number) => void; // 進捗コールバック
  memoryLimit?: number; // メモリ制限（MB）（デフォルト: 100MB）
}

/**
 * DNSレコード処理用のTransformストリーム
 */
class IDNSRecordProcessor extends Transform {
  private buffer: IDNSRecord[] = [];
  private processedCount = 0;
  private readonly chunkSize: number;
  private readonly onProgress: ((processed: number, percentage?: number) => void) | undefined;
  private readonly processChunk: (records: IDNSRecord[]) => Promise<IAnalysisResult[]>;

  constructor(
    _patternConfig: IPatternConfig,
    processChunk: (records: IDNSRecord[]) => Promise<IAnalysisResult[]>,
    options: StreamOptions = {},
  ) {
    super({ objectMode: true });
    this.chunkSize = options.chunkSize || 1000;
    this.onProgress = options.onProgress;
    this.processChunk = processChunk;
  }

  async _transform(
    record: any,
    _encoding: string,
    callback: (error?: Error | null, data?: any) => void,
  ): Promise<void> {
    try {
      // レコードの変換
      const dnsRecord: IDNSRecord = {
        name: record.Name || '',
        type: record.Type || '',
        content: record.Content || '',
        ttl: parseInt(record.TTL) || 300,
        proxied: record.Proxied === 'true' || record.Proxied === true,
        created: record.Created || '',
        modified: record.Modified || '',
      };

      // バリデーション
      if (!dnsRecord.name || !dnsRecord.type) {
        callback(); // 無効なレコードはスキップ
        return;
      }

      this.buffer.push(dnsRecord);
      this.processedCount++;

      // バッファがチャンクサイズに達したら処理
      if (this.buffer.length >= this.chunkSize) {
        const chunk = this.buffer.splice(0, this.chunkSize);
        const results = await this.processChunk(chunk);
        
        // 結果を下流に流す
        results.forEach(result => this.push(result));
      }

      // 進捗報告
      if (this.onProgress && this.processedCount % 100 === 0) {
        this.onProgress(this.processedCount);
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
        const results = await this.processChunk(this.buffer);
        results.forEach(result => this.push(result));
      }

      if (this.onProgress) {
        this.onProgress(this.processedCount, 100);
      }

      callback();
    } catch (error) {
      callback(error as Error);
    }
  }
}

/**
 * メモリ使用量を監視するヘルパー関数
 */
export function getMemoryUsage(): { used: number; limit: number } {
  const usage = process.memoryUsage();
  return {
    used: Math.round(usage.heapUsed / 1024 / 1024), // MB
    limit: Math.round(usage.heapTotal / 1024 / 1024), // MB
  };
}

/**
 * ストリーミングでCSVファイルを処理
 * @param filePath - CSVファイルのパス
 * @param patternConfig - パターン設定
 * @param processChunk - チャンク処理関数
 * @param options - ストリーミングオプション
 * @returns 処理結果のストリーム
 */
export async function streamProcessCSV(
  filePath: string,
  patternConfig: IPatternConfig,
  processChunk: (records: IDNSRecord[]) => Promise<IAnalysisResult[]>,
  options: StreamOptions = {},
): Promise<IAnalysisResult[]> {
  const results: IAnalysisResult[] = [];
  const memoryLimit = options.memoryLimit || 100; // MB

  // メモリ監視
  const checkMemory = (): void => {
    const memory = getMemoryUsage();
    if (memory.used > memoryLimit) {
      console.warn(`⚠️  メモリ使用量が制限を超えています: ${memory.used}MB / ${memoryLimit}MB`);
    }
  };

  // 定期的なメモリチェック
  const memoryCheckInterval = setInterval(checkMemory, 1000);

  try {
    const readStream = createReadStream(filePath);
    const processor = new IDNSRecordProcessor(patternConfig, processChunk, options);

    // Papa Parse のストリーミングパーサー
    const parseStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
    });

    // 結果収集用のTransformストリーム
    const resultCollector = new Transform({
      objectMode: true,
      transform(result: IAnalysisResult, _encoding: any, callback: any) {
        results.push(result);
        callback();
      },
    });

    // ストリームパイプラインの構築
    await pipelineAsync(
      readStream,
      parseStream,
      processor,
      resultCollector,
    );

    return results;
  } finally {
    clearInterval(memoryCheckInterval);
  }
}

/**
 * 簡易版：レコードごとに処理するストリーミング関数
 * @param filePath - CSVファイルのパス
 * @param processRecord - レコード処理関数
 * @param options - ストリーミングオプション
 */
export async function streamProcessRecords(
  filePath: string,
  processRecord: (record: IDNSRecord) => Promise<void>,
  options: StreamOptions = {},
): Promise<void> {
  let processedCount = 0;
  const recordPromises: Promise<void>[] = [];

  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);

    Papa.parse(stream, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      step: (row) => {
        if (row.errors.length > 0) {
          console.warn('CSV解析エラー:', row.errors);
          return;
        }

        const data = row.data as Record<string, any>;
        const record: IDNSRecord = {
          name: data.Name || '',
          type: data.Type || '',
          content: data.Content || '',
          ttl: parseInt(data.TTL) || 300,
          proxied: data.Proxied === 'true' || data.Proxied === true,
          created: data.Created || '',
          modified: data.Modified || '',
        };

        // バリデーション
        if (!record.name || !record.type) {
          return;
        }

        // 非同期処理をPromise配列に追加
        const promise = processRecord(record)
          .then(() => {
            processedCount++;

            // 進捗報告
            if (options.onProgress && processedCount % 100 === 0) {
              options.onProgress(processedCount);
            }
          })
          .catch((error) => {
            console.error('レコード処理エラー:', error);
          });

        recordPromises.push(promise);
      },
      complete: async () => {
        try {
          // すべての非同期処理が完了するまで待機
          await Promise.all(recordPromises);

          if (options.onProgress) {
            options.onProgress(processedCount, 100);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * ファイルサイズを取得
 * @param filePath - ファイルパス
 * @returns ファイルサイズ（バイト）
 */
export async function getFileSize(filePath: string): Promise<number> {
  const { promises: fs } = await import('fs');
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * レコード数を推定（ファイルサイズベース）
 * @param filePath - ファイルパス
 * @returns 推定レコード数
 */
export async function estimateRecordCount(filePath: string): Promise<number> {
  const fileSize = await getFileSize(filePath);
  // 1レコードあたり平均100バイトと仮定
  return Math.ceil(fileSize / 100);
}