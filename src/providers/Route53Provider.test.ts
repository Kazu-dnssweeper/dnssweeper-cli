/**
 * Route53Providerのテスト
 */

import { Route53Provider } from './Route53Provider';

describe('Route53Provider', () => {
  let provider: Route53Provider;

  beforeEach(() => {
    provider = new Route53Provider();
  });

  describe('detect', () => {
    it('Route 53特有のヘッダーを検出できる', () => {
      const headers = ['Name', 'Type', 'Value', 'TTL', 'RoutingPolicy'];
      expect(provider.detect(headers)).toBe(true);
    });

    it('SetIdentifierヘッダーでも検出できる', () => {
      const headers = ['Name', 'Type', 'Value', 'TTL', 'SetIdentifier'];
      expect(provider.detect(headers)).toBe(true);
    });

    it('基本的なName, Type, Valueの組み合わせでも検出できる', () => {
      const headers = ['Name', 'Type', 'Value', 'TTL'];
      expect(provider.detect(headers)).toBe(true);
    });

    it('Route 53以外のヘッダーでは検出できない', () => {
      const headers = ['Name', 'Type', 'Content', 'TTL', 'Proxied'];
      expect(provider.detect(headers)).toBe(false);
    });
  });

  describe('parse', () => {
    const headers = ['Name', 'Type', 'Value', 'TTL', 'RoutingPolicy'];

    it('正常なレコードをパースできる', () => {
      const row = ['example.com.', 'A', '192.168.1.1', '300', 'Simple'];
      const record = provider.parse(row, headers);

      expect(record).toEqual({
        name: 'example.com',
        type: 'A',
        content: '192.168.1.1',
        ttl: 300,
        routingPolicy: 'Simple',
        setIdentifier: undefined,
        healthCheckId: undefined,
      });
    });

    it('MXレコードの優先度を抽出できる', () => {
      const row = ['example.com.', 'MX', '10 mail.example.com', '3600', 'Simple'];
      const record = provider.parse(row, headers);

      expect(record).toEqual({
        name: 'example.com',
        type: 'MX',
        content: 'mail.example.com',
        ttl: 3600,
        routingPolicy: 'Simple',
        setIdentifier: undefined,
        healthCheckId: undefined,
        priority: 10,
      });
    });

    it('複数値（カンマ区切り）を処理できる', () => {
      const row = ['example.com.', 'A', '192.168.1.1,192.168.1.2', '300', 'Simple'];
      const record = provider.parse(row, headers);

      expect(record).toEqual({
        name: 'example.com',
        type: 'A',
        content: '192.168.1.1',
        ttl: 300,
        routingPolicy: 'Simple',
        setIdentifier: undefined,
        healthCheckId: undefined,
        additionalValues: ['192.168.1.2'],
      });
    });

    it('JSON配列形式の値を処理できる', () => {
      const row = ['example.com.', 'A', '["192.168.1.1", "192.168.1.2"]', '300', 'Simple'];
      const record = provider.parse(row, headers);

      expect(record).toEqual({
        name: 'example.com',
        type: 'A',
        content: '192.168.1.1',
        ttl: 300,
        routingPolicy: 'Simple',
        setIdentifier: undefined,
        healthCheckId: undefined,
        additionalValues: ['192.168.1.2'],
      });
    });

    it('TXTレコードの引用符を処理できる', () => {
      const row = ['example.com.', 'TXT', '"v=spf1 include:_spf.example.com ~all"', '300', 'Simple'];
      const record = provider.parse(row, headers);

      expect(record).toEqual({
        name: 'example.com',
        type: 'TXT',
        content: 'v=spf1 include:_spf.example.com ~all',
        ttl: 300,
        routingPolicy: 'Simple',
        setIdentifier: undefined,
        healthCheckId: undefined,
      });
    });

    it('必須フィールドが欠けている場合はnullを返す', () => {
      const row = ['', 'A', '192.168.1.1', '300', 'Simple'];
      const record = provider.parse(row, headers);

      expect(record).toBeNull();
    });
  });
});