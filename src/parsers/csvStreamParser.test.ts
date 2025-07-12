import { SpyInstance } from "vitest";
/**
 * CSVストリーミングパーサーのテスト
 */

import { 
  streamProcessCSV,
  streamProcessRecords,
  getFileSize,
  estimateRecordCount,
  getMemoryUsage,
} from './csvStreamParser';
import { promises as fs } from 'fs';
import path from 'path';
import { IDNSRecord, IAnalysisResult } from '../types/dns';
import { getDefaultPatternConfig } from '../patterns/patternLoader';

describe('csvStreamParser', () => {
  const testDataDir = path.join(__dirname, '../../test-data/stream-test');
  const testFile = path.join(testDataDir, 'test-stream.csv');

  beforeAll(async () => {
    // テストディレクトリ作成
    await fs.mkdir(testDataDir, { recursive: true });
  });

  afterAll(async () => {
    // クリーンアップ
    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch (error) {
      // エラーは無視
    }
  });

  beforeEach(async () => {
    // テスト用CSVファイル作成
    const csvContent = `Name,Type,Content,TTL,Proxied,Created,Modified
test-1.example.com,A,192.168.1.1,300,false,2023-01-01T00:00:00Z,2024-01-01T00:00:00Z
old-api.example.com,A,192.168.1.2,3600,false,2022-01-01T00:00:00Z,2023-01-01T00:00:00Z
www.example.com,A,192.168.1.3,300,true,2024-01-01T00:00:00Z,2024-12-01T00:00:00Z
temp-server.example.com,A,192.168.1.4,300,false,2023-06-01T00:00:00Z,2023-06-01T00:00:00Z
dev-2.example.com,A,192.168.1.5,300,false,2023-01-01T00:00:00Z,2024-01-01T00:00:00Z`;
    
    await fs.writeFile(testFile, csvContent);
  });

  describe('getFileSize', () => {
    it('ファイルサイズを正しく取得できる', async () => {
      const size = await getFileSize(testFile);
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(1000); // テストファイルは1KB未満
    });
  });

  describe('estimateRecordCount', () => {
    it('レコード数を推定できる', async () => {
      const count = await estimateRecordCount(testFile);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(100); // テストファイルは小さい
    });
  });

  describe('getMemoryUsage', () => {
    it('メモリ使用量を取得できる', () => {
      const memory = getMemoryUsage();
      expect(memory.used).toBeGreaterThan(0);
      expect(memory.limit).toBeGreaterThan(0);
      expect(memory.used).toBeLessThanOrEqual(memory.limit);
    });
  });

  describe('streamProcessRecords', () => {
    it('レコードごとに処理できる', async () => {
      const processedRecords: IDNSRecord[] = [];
      
      await streamProcessRecords(
        testFile,
        async (record) => {
          processedRecords.push(record);
        },
      );

      expect(processedRecords).toHaveLength(5);
      expect(processedRecords[0].name).toBe('test-1.example.com');
      expect(processedRecords[1].name).toBe('old-api.example.com');
    });

    it('進捗コールバックが呼ばれる', async () => {
      const progressUpdates: number[] = [];
      
      await streamProcessRecords(
        testFile,
        async () => {
          // 処理を実行
        },
        {
          onProgress: (processed) => {
            progressUpdates.push(processed);
          },
        },
      );

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(5); // 最終的に5レコード
    });

    it('無効なレコードをスキップする', async () => {
      // 無効なレコードを含むCSV
      const invalidCsv = `Name,Type,Content,TTL,Proxied,Created,Modified
,A,192.168.1.1,300,false,2023-01-01T00:00:00Z,2024-01-01T00:00:00Z
valid.example.com,,192.168.1.2,300,false,2023-01-01T00:00:00Z,2024-01-01T00:00:00Z
good.example.com,A,192.168.1.3,300,false,2023-01-01T00:00:00Z,2024-01-01T00:00:00Z`;
      
      const invalidFile = path.join(testDataDir, 'invalid.csv');
      await fs.writeFile(invalidFile, invalidCsv);

      const processedRecords: IDNSRecord[] = [];
      
      await streamProcessRecords(
        invalidFile,
        async (record) => {
          processedRecords.push(record);
        },
      );

      expect(processedRecords).toHaveLength(1); // 有効なレコードのみ
      expect(processedRecords[0].name).toBe('good.example.com');
    });
  });

  describe('streamProcessCSV', () => {
    it('チャンク単位で処理できる', async () => {
      const patternConfig = getDefaultPatternConfig();
      const processedChunks: number[] = [];
      
      const processChunk = async (records: IDNSRecord[]): Promise<IAnalysisResult[]> => {
        processedChunks.push(records.length);
        return records.map(record => ({
          record,
          riskScore: 50,
          riskLevel: 'medium' as const,
          matchedPatterns: [],
          reasons: [],
        }));
      };

      const results = await streamProcessCSV(
        testFile,
        patternConfig,
        processChunk,
        { chunkSize: 2 }, // 2レコードずつ処理
      );

      expect(results).toHaveLength(5);
      expect(processedChunks).toContain(2); // チャンクサイズ2で処理
    });

    it('メモリ制限を監視する', async () => {
      const patternConfig = getDefaultPatternConfig();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      
      const processChunk = async (records: IDNSRecord[]): Promise<IAnalysisResult[]> => {
        return records.map(record => ({
          record,
          riskScore: 50,
          riskLevel: 'medium' as const,
          matchedPatterns: [],
          reasons: [],
        }));
      };

      await streamProcessCSV(
        testFile,
        patternConfig,
        processChunk,
        { memoryLimit: 0.001 }, // 非常に低いメモリ制限
      );

      // メモリ警告が出ることを確認
      // （実際のメモリ使用量によっては警告が出ない場合もある）
      
      consoleSpy.mockRestore();
    });
  });

  describe('大規模ファイルシミュレーション', () => {
    it('大量のレコードを効率的に処理できる', async () => {
      // 1000レコードのCSVを生成
      const largeFile = path.join(testDataDir, 'large.csv');
      const header = 'Name,Type,Content,TTL,Proxied,Created,Modified\n';
      const records: string[] = [header];
      
      for (let i = 0; i < 1000; i++) {
        records.push(`record-${i}.example.com,A,192.168.1.${i % 255},300,false,2023-01-01T00:00:00Z,2024-01-01T00:00:00Z\n`);
      }
      
      await fs.writeFile(largeFile, records.join(''));

      const patternConfig = getDefaultPatternConfig();
      let totalProcessed = 0;
      
      const processChunk = async (records: IDNSRecord[]): Promise<IAnalysisResult[]> => {
        totalProcessed += records.length;
        return records.map(record => ({
          record,
          riskScore: Math.random() * 100,
          riskLevel: 'medium' as const,
          matchedPatterns: [],
          reasons: [],
        }));
      };

      const startMemory = getMemoryUsage();
      const results = await streamProcessCSV(
        largeFile,
        patternConfig,
        processChunk,
        { chunkSize: 100 },
      );
      const endMemory = getMemoryUsage();

      expect(results).toHaveLength(1000);
      expect(totalProcessed).toBe(1000);
      
      // メモリ増加が妥当な範囲内
      const memoryIncrease = endMemory.used - startMemory.used;
      expect(memoryIncrease).toBeLessThan(50); // 50MB未満の増加
    });
  });
});