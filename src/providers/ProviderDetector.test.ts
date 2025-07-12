import { SpyInstance } from "vitest";
/**
 * ProviderDetectorのテスト
 */

import { ProviderDetector } from './ProviderDetector';

describe('ProviderDetector', () => {
  let detector: ProviderDetector;

  beforeEach(() => {
    detector = new ProviderDetector();
  });

  describe('detectProvider', () => {
    it('Cloudflareのヘッダーを検出できる', () => {
      const headers = ['Name', 'Type', 'Content', 'TTL', 'Proxied'];
      const result = detector.detectProvider(headers);

      expect(result).not.toBeNull();
      expect(result?.provider.name).toBe('cloudflare');
      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    it('Route 53のヘッダーを検出できる', () => {
      const headers = ['Name', 'Type', 'Value', 'TTL', 'RoutingPolicy'];
      const result = detector.detectProvider(headers);

      expect(result).not.toBeNull();
      expect(result?.provider.name).toBe('route53');
      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    it('Google Cloud DNSのヘッダーを検出できる', () => {
      const headers = ['dns_name', 'record_type', 'ttl', 'rrdatas'];
      const result = detector.detectProvider(headers);

      expect(result).not.toBeNull();
      expect(result?.provider.name).toBe('google-cloud');
      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    it('Azure DNSのヘッダーを検出できる', () => {
      const headers = ['name', 'type', 'ttl', 'value', 'resource_group'];
      const result = detector.detectProvider(headers);

      expect(result).not.toBeNull();
      expect(result?.provider.name).toBe('azure');
    });

    it('お名前.comの日本語ヘッダーを検出できる', () => {
      const headers = ['ホスト名', 'TYPE', 'VALUE', '優先度', 'TTL'];
      const result = detector.detectProvider(headers);

      expect(result).not.toBeNull();
      expect(result?.provider.name).toBe('onamae');
      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    it('不明なヘッダーの場合はnullを返す', () => {
      const headers = ['Unknown1', 'Unknown2', 'Unknown3'];
      const result = detector.detectProvider(headers);

      expect(result).toBeNull();
    });
  });

  describe('getProviderByName', () => {
    it('名前でプロバイダーを取得できる', () => {
      const provider = detector.getProviderByName('cloudflare');
      expect(provider).not.toBeNull();
      expect(provider?.name).toBe('cloudflare');
    });

    it('大文字小文字を区別しない', () => {
      const provider = detector.getProviderByName('CLOUDFLARE');
      expect(provider).not.toBeNull();
      expect(provider?.name).toBe('cloudflare');
    });

    it('存在しないプロバイダー名の場合はnullを返す', () => {
      const provider = detector.getProviderByName('unknown-provider');
      expect(provider).toBeNull();
    });
  });

  describe('getAvailableProviders', () => {
    it('利用可能なプロバイダーのリストを取得できる', () => {
      const providers = detector.getAvailableProviders();

      expect(providers).toHaveLength(5);
      expect(providers.map(p => p.name)).toContain('cloudflare');
      expect(providers.map(p => p.name)).toContain('route53');
      expect(providers.map(p => p.name)).toContain('google-cloud');
      expect(providers.map(p => p.name)).toContain('azure');
      expect(providers.map(p => p.name)).toContain('onamae');
    });
  });

  describe('detectFromFileContent', () => {
    it('ヘッダーとデータから最適なプロバイダーを検出できる', async () => {
      const headers = ['Name', 'Type', 'Content', 'TTL'];
      const rows = [
        { Name: 'example.com', Type: 'A', Content: '192.168.1.1', TTL: '300' },
        { Name: 'www.example.com', Type: 'CNAME', Content: 'example.com', TTL: '300' },
      ];

      const result = await detector.detectFromFileContent(headers, rows);

      expect(result).not.toBeNull();
      // Cloudflareがデフォルトとして使用される可能性が高い
      expect(['cloudflare', 'route53', 'azure']).toContain(result?.provider.name);
    });

    it('パースエラーがあっても他のプロバイダーを試す', async () => {
      const headers = ['Name', 'Type', 'Value', 'TTL'];
      const rows = [
        { Name: 'example.com.', Type: 'A', Value: '192.168.1.1', TTL: '300' },
        { Name: '', Type: 'A', Value: '192.168.1.2', TTL: '300' }, // 無効な行
      ];

      const result = await detector.detectFromFileContent(headers, rows);

      expect(result).not.toBeNull();
      expect(result?.confidence).toBeGreaterThan(0);
    });
  });
});