/**
 * csvParser.ts のユニットテスト
 */

import { parseDNSRecordsFromCSV, validateDNSRecord } from './csvParser';
import { DNSRecord } from '../types/dns';
import { promises as fs } from 'fs';
import path from 'path';

// モックデータ
const mockCSVContent = `Name,Type,Content,TTL,Proxied,Created,Modified
example.com,A,192.168.1.1,300,true,2023-01-15T10:00:00Z,2024-12-01T15:30:00Z
www.example.com,A,192.168.1.1,300,true,2023-01-15T10:00:00Z,2024-12-15T09:00:00Z
`;

const mockInvalidCSV = `Name,Type,Content,TTL,Proxied,Created,Modified
,A,192.168.1.1,300,true,2023-01-15T10:00:00Z,2024-12-01T15:30:00Z
example.com,,192.168.1.1,300,true,2023-01-15T10:00:00Z,2024-12-15T09:00:00Z
valid.com,A,192.168.1.2,300,false,2023-01-15T10:00:00Z,2024-12-15T09:00:00Z
`;

describe('csvParser', () => {
  const tempDir = path.join(process.cwd(), 'test', 'temp');
  const tempFile = path.join(tempDir, 'test.csv');

  beforeAll(async () => {
    // テスト用の一時ディレクトリ作成
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // 一時ディレクトリのクリーンアップ
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      // エラーは無視
    }
  });

  describe('parseDNSRecordsFromCSV', () => {
    it('正常なCSVファイルを解析できる', async () => {
      // テスト用CSVファイルを作成
      await fs.writeFile(tempFile, mockCSVContent);

      const records = await parseDNSRecordsFromCSV(tempFile);

      expect(records).toHaveLength(2);
      expect(records[0]).toMatchObject({
        name: 'example.com',
        type: 'A',
        content: '192.168.1.1',
        ttl: 300,
        proxied: true,
      });
    });

    it('存在しないファイルでエラーが発生する', async () => {
      const nonExistentFile = path.join(tempDir, 'non-existent.csv');

      await expect(parseDNSRecordsFromCSV(nonExistentFile)).rejects.toThrow(
        'CSVファイル読み込みエラー',
      );
    });

    it('必須フィールドが不足しているレコードをフィルタリングする', async () => {
      await fs.writeFile(tempFile, mockInvalidCSV);

      const records = await parseDNSRecordsFromCSV(tempFile);

      // 最初の2レコード（Nameが空、Typeが空）はフィルタリングされる
      expect(records).toHaveLength(1);
      expect(records[0].name).toBe('valid.com');
    });

    it('空のCSVファイルで空の配列を返す', async () => {
      const emptyCSV = 'Name,Type,Content,TTL,Proxied,Created,Modified\n';
      await fs.writeFile(tempFile, emptyCSV);

      const records = await parseDNSRecordsFromCSV(tempFile);

      expect(records).toHaveLength(0);
    });

    it('CSVパースエラーが適切に処理される', async () => {
      const malformedCSV =
        'Name,Type,Content,TTL,Proxied,Created,Modified\n"Unclosed quote,A,192.168.1.1';
      await fs.writeFile(tempFile, malformedCSV);

      // Papa Parseは不正なCSVでもある程度パースしようとするため、
      // エラーが発生する場合は例外がスローされる
      await expect(parseDNSRecordsFromCSV(tempFile)).rejects.toThrow();
    });
  });

  describe('validateDNSRecord', () => {
    const validRecord: DNSRecord = {
      name: 'example.com',
      type: 'A',
      content: '192.168.1.1',
      ttl: 300,
      proxied: false,
      created: '2023-01-15T10:00:00Z',
      modified: '2024-12-01T15:30:00Z',
    };

    it('有効なDNSレコードを検証できる', () => {
      const result = validateDNSRecord(validRecord);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('名前がないレコードでエラーを返す', () => {
      const invalidRecord = { ...validRecord, name: '' };
      const result = validateDNSRecord(invalidRecord);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name フィールドが必須です');
    });

    it('タイプがないレコードでエラーを返す', () => {
      const invalidRecord = { ...validRecord, type: '' };
      const result = validateDNSRecord(invalidRecord);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Type フィールドが必須です');
    });

    it('サポートされていないタイプでエラーを返す', () => {
      const invalidRecord = { ...validRecord, type: 'INVALID' };
      const result = validateDNSRecord(invalidRecord);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'サポートされていないDNSレコードタイプ: INVALID',
      );
    });

    it('TTL値が範囲外でエラーを返す', () => {
      const invalidRecord = { ...validRecord, ttl: 100000 };
      const result = validateDNSRecord(invalidRecord);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('TTL値が範囲外です: 100000 (1-86400)');
    });

    it('複数のエラーを同時に検出できる', () => {
      const invalidRecord = { ...validRecord, name: '', type: '', ttl: 0 };
      const result = validateDNSRecord(invalidRecord);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });
});

// テスト終了後のクリーンアップ
afterAll(() => {
  // ファイルシステム関連のモックをクリア
  jest.restoreAllMocks();
});
