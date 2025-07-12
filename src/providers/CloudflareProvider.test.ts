/**
 * CloudflareProviderのテスト
 */

import { CloudflareProvider } from './CloudflareProvider';
import { DNSRecord } from '../types/dns';

describe('CloudflareProvider', () => {
  let provider: CloudflareProvider;

  beforeEach(() => {
    provider = new CloudflareProvider();
  });

  describe('detect', () => {
    it('Cloudflare特有のヘッダーを検出できる', () => {
      const headers = ['Name', 'Type', 'Content', 'TTL', 'Proxied'];
      expect(provider.detect(headers)).toBe(true);
    });

    it('Proxy Statusヘッダーでも検出できる', () => {
      const headers = ['Name', 'Type', 'Content', 'TTL', 'Proxy Status'];
      expect(provider.detect(headers)).toBe(true);
    });

    it('Cloudflare以外のヘッダーでは検出できない', () => {
      const headers = ['Name', 'Type', 'Value', 'TTL'];
      expect(provider.detect(headers)).toBe(false);
    });
  });

  describe('parse', () => {
    const headers = ['Name', 'Type', 'Content', 'TTL', 'Proxied', 'Comment'];

    it('正常なレコードをパースできる', () => {
      const row = ['example.com', 'A', '192.168.1.1', '300', 'true', 'Production server'];
      const record = provider.parse(row, headers);

      expect(record).toEqual({
        name: 'example.com',
        type: 'A',
        content: '192.168.1.1',
        ttl: 300,
        proxied: true,
        proxiable: false,
        comment: 'Production server',
      });
    });

    it('MXレコードの優先度を処理できる', () => {
      const headers = ['Name', 'Type', 'Content', 'TTL', 'Priority'];
      const row = ['example.com', 'MX', 'mail.example.com', '3600', '10'];
      const record = provider.parse(row, headers);

      expect(record).toEqual({
        name: 'example.com',
        type: 'MX',
        content: 'mail.example.com',
        ttl: 3600,
        proxied: false,
        proxiable: false,
        comment: undefined,
        priority: 10,
      });
    });

    it('必須フィールドが欠けている場合はnullを返す', () => {
      const row = ['', 'A', '192.168.1.1', '300', 'false', ''];
      const record = provider.parse(row, headers);

      expect(record).toBeNull();
    });

    it('@をルートドメインとして処理する', () => {
      const row = ['@', 'A', '192.168.1.1', '300', 'true', ''];
      const record = provider.parse(row, headers);

      expect(record).not.toBeNull();
      expect(record?.name).toBe('@');
    });

    it('異なるヘッダー名でも対応できる', () => {
      const altHeaders = ['hostname', 'record_type', 'value', 'ttl', 'proxy_status'];
      const row = ['www.example.com', 'CNAME', 'example.com', '300', 'true'];
      const record = provider.parse(row, altHeaders);

      expect(record).toEqual({
        name: 'www.example.com',
        type: 'CNAME',
        content: 'example.com',
        ttl: 300,
        proxied: true,
        proxiable: false,
        comment: undefined,
      });
    });
  });

  describe('validate', () => {
    it('正常なレコードは検証を通過する', () => {
      const record: DNSRecord = {
        name: 'example.com',
        type: 'A',
        content: '192.168.1.1',
        ttl: 300,
      };

      expect(provider.validate(record)).toBe(true);
    });

    it('サポートされていないレコードタイプは検証に失敗する', () => {
      const record: DNSRecord = {
        name: 'example.com',
        type: 'INVALID',
        content: '192.168.1.1',
        ttl: 300,
      };

      expect(provider.validate(record)).toBe(false);
    });

    it('TTLが範囲外の場合は検証に失敗する', () => {
      const record: DNSRecord = {
        name: 'example.com',
        type: 'A',
        content: '192.168.1.1',
        ttl: -1,
      };

      expect(provider.validate(record)).toBe(false);
    });
  });
});