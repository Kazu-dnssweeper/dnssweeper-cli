/**
 * NamecheapProviderのテスト
 */

import { NamecheapProvider } from './NamecheapProvider';
import { DNSRecord } from '../types/dns';

describe('NamecheapProvider', () => {
  let provider: NamecheapProvider;

  beforeEach(() => {
    provider = new NamecheapProvider();
  });

  describe('detect', () => {
    it('Namecheapのヘッダーを検出できる', () => {
      const headers = ['Host', 'Type', 'Value', 'TTL', 'Priority'];
      expect(provider.detect(headers)).toBe(true);
    });

    it('小文字のヘッダーも検出できる', () => {
      const headers = ['host', 'type', 'value', 'ttl', 'priority'];
      expect(provider.detect(headers)).toBe(true);
    });

    it('Priorityがない場合は検出しない', () => {
      const headers = ['Host', 'Type', 'Value', 'TTL'];
      expect(provider.detect(headers)).toBe(false);
    });

    it('異なるプロバイダーのヘッダーは検出しない', () => {
      const headers = ['Name', 'Type', 'Content', 'Proxied'];
      expect(provider.detect(headers)).toBe(false);
    });
  });

  describe('parse', () => {
    const headers = ['Host', 'Type', 'Value', 'TTL', 'Priority'];

    it('Aレコードをパースできる', () => {
      const row = {
        'Host': 'www',
        'Type': 'A',
        'Value': '192.168.1.1',
        'TTL': '3600',
        'Priority': ''
      };

      const record = provider.parse(row, headers);
      expect(record).toEqual({
        name: 'www',
        type: 'A',
        value: '192.168.1.1',
        ttl: 3600,
        provider: 'namecheap'
      });
    });

    it('MXレコードをパースできる', () => {
      const row = {
        'Host': '@',
        'Type': 'MX',
        'Value': 'mail.example.com',
        'TTL': '1800',
        'Priority': '10'
      };

      const record = provider.parse(row, headers);
      expect(record).toEqual({
        name: '@',
        type: 'MX',
        value: 'mail.example.com',
        ttl: 1800,
        priority: 10,
        provider: 'namecheap'
      });
    });

    it('必須フィールドがない場合はnullを返す', () => {
      const row = {
        'Host': '',
        'Type': 'A',
        'Value': '192.168.1.1',
        'TTL': '3600',
        'Priority': ''
      };

      const record = provider.parse(row, headers);
      expect(record).toBeNull();
    });

    it('TTLがない場合はデフォルト値を使用', () => {
      const row = {
        'Host': 'www',
        'Type': 'A',
        'Value': '192.168.1.1',
        'TTL': '',
        'Priority': ''
      };

      const record = provider.parse(row, headers);
      expect(record?.ttl).toBe(1800);
    });
  });

  describe('validate', () => {
    it('正常なレコードはバリデーションを通過する', () => {
      const record: DNSRecord = {
        name: 'www',
        type: 'A',
        value: '192.168.1.1',
        ttl: 3600,
        provider: 'namecheap'
      };

      expect(provider.validate(record)).toBe(true);
    });

    it('@をホスト名として許可する', () => {
      const record: DNSRecord = {
        name: '@',
        type: 'A',
        value: '192.168.1.1',
        ttl: 3600,
        provider: 'namecheap'
      };

      expect(provider.validate(record)).toBe(true);
    });

    it('TTLが60未満の場合は無効', () => {
      const record: DNSRecord = {
        name: 'www',
        type: 'A',
        value: '192.168.1.1',
        ttl: 30,
        provider: 'namecheap'
      };

      expect(provider.validate(record)).toBe(false);
    });
  });

  describe('export', () => {
    it('レコードをCSV形式でエクスポートできる', () => {
      const records: DNSRecord[] = [
        {
          name: 'www',
          type: 'A',
          value: '192.168.1.1',
          ttl: 3600,
          provider: 'namecheap'
        },
        {
          name: '@',
          type: 'MX',
          value: 'mail.example.com',
          ttl: 1800,
          priority: 10,
          provider: 'namecheap'
        }
      ];

      const csv = provider.export(records);
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('Host,Type,Value,TTL,Priority');
      expect(lines[1]).toBe('www,A,192.168.1.1,3600,');
      expect(lines[2]).toBe('@,MX,mail.example.com,1800,10');
    });
  });
});