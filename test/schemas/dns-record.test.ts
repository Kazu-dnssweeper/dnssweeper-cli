/**
 * DNSレコードスキーマのテスト
 */

import { describe, it, expect } from 'vitest';
import { 
  DNSRecordSchema,
  AnalysisResultSchema,
  validateDNSRecord,
  parseCSVRow 
} from '../../src/schemas/dns-record.schema';

describe('DNSRecordSchema', () => {
  it('有効なDNSレコードを受け入れる', () => {
    const validRecord = {
      type: 'A',
      name: 'example.com',
      content: '192.168.1.1',
      ttl: 3600,
    };

    const result = DNSRecordSchema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });

  it('TTLがオプションである', () => {
    const recordWithoutTTL = {
      type: 'A',
      name: 'example.com',
      content: '192.168.1.1',
    };

    const result = DNSRecordSchema.safeParse(recordWithoutTTL);
    expect(result.success).toBe(true);
  });

  it('無効なレコードタイプを拒否する', () => {
    const invalidRecord = {
      type: 'INVALID',
      name: 'example.com',
      content: '192.168.1.1',
    };

    const result = DNSRecordSchema.safeParse(invalidRecord);
    expect(result.success).toBe(false);
  });

  it('範囲外のTTLを拒否する', () => {
    const invalidRecord = {
      type: 'A',
      name: 'example.com',
      content: '192.168.1.1',
      ttl: 100000,
    };

    const result = DNSRecordSchema.safeParse(invalidRecord);
    expect(result.success).toBe(false);
  });
});

describe('validateDNSRecord', () => {
  it('有効なレコードでsuccess: trueを返す', () => {
    const validRecord = {
      type: 'A',
      name: 'example.com',
      content: '192.168.1.1',
      ttl: 3600,
    };

    const result = validateDNSRecord(validRecord);
    expect(result.success).toBe(true);
  });

  it('無効なレコードでsuccess: falseとエラーを返す', () => {
    const invalidRecord = {
      type: 'INVALID',
      name: '',
      content: '192.168.1.1',
    };

    const result = validateDNSRecord(invalidRecord);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });
});

describe('parseCSVRow', () => {
  it('Cloudflare形式のCSVを正しくパースする', () => {
    const csvRow = {
      Type: 'A',
      Name: 'example.com',
      Content: '192.168.1.1',
      TTL: '3600',
      Proxied: 'false',
    };

    const result = parseCSVRow(csvRow, 'cloudflare');
    expect(result).toBeDefined();
    expect(result?.type).toBe('A');
    expect(result?.name).toBe('example.com');
    expect(result?.content).toBe('192.168.1.1');
    expect(result?.ttl).toBe(3600);
  });

  it('無効なCSVでnullを返す', () => {
    const invalidRow = {
      InvalidField: 'value',
    };

    const result = parseCSVRow(invalidRow, 'cloudflare');
    expect(result).toBeNull();
  });
});