const DNSResolver = require('../src/dns_resolver');
const dns = require('dns').promises;
const punycode = require('punycode');

// DNSモジュールをモック
jest.mock('dns', () => ({
  promises: {
    resolve4: jest.fn(),
  },
}));

describe('DNSResolver', () => {
  let resolver;

  beforeEach(() => {
    resolver = new DNSResolver();
    jest.clearAllMocks();
    resolver.clearCache();
  });

  describe('国際化ドメイン名（IDN）の処理', () => {
    test('日本語ドメイン「日本.jp」を正しく解決できる', async () => {
      const japaneseDomain = '日本.jp';
      const expectedPunycode = 'xn--wgv71a.jp';
      const mockAddresses = ['192.0.2.1'];

      // DNS解決のモック
      dns.resolve4.mockResolvedValue(mockAddresses);

      const result = await resolver.resolve(japaneseDomain);

      // Punycodeに変換されていることを確認
      expect(dns.resolve4).toHaveBeenCalledWith(expectedPunycode);

      // 結果の検証
      expect(result).toEqual({
        domain: japaneseDomain,
        asciiDomain: expectedPunycode,
        addresses: mockAddresses,
        resolved: true,
        timestamp: expect.any(String),
      });
    });

    test('中国語ドメイン「中国.中国」を正しく解決できる', async () => {
      const chineseDomain = '中国.中国';
      const expectedPunycode = 'xn--fiqs8s.xn--fiqs8s';
      const mockAddresses = ['192.0.2.2'];

      dns.resolve4.mockResolvedValue(mockAddresses);

      const result = await resolver.resolve(chineseDomain);

      expect(dns.resolve4).toHaveBeenCalledWith(expectedPunycode);
      expect(result.asciiDomain).toBe(expectedPunycode);
      expect(result.resolved).toBe(true);
    });

    test('ロシア語ドメイン「пример.рф」を正しく解決できる', async () => {
      const russianDomain = 'пример.рф';
      const expectedPunycode = 'xn--e1afmkfd.xn--p1ai';
      const mockAddresses = ['192.0.2.3'];

      dns.resolve4.mockResolvedValue(mockAddresses);

      const result = await resolver.resolve(russianDomain);

      expect(dns.resolve4).toHaveBeenCalledWith(expectedPunycode);
      expect(result.asciiDomain).toBe(expectedPunycode);
      expect(result.resolved).toBe(true);
    });

    test('ASCII ドメインもそのまま処理できる', async () => {
      const asciiDomain = 'example.com';
      const mockAddresses = ['192.0.2.4'];

      dns.resolve4.mockResolvedValue(mockAddresses);

      const result = await resolver.resolve(asciiDomain);

      expect(dns.resolve4).toHaveBeenCalledWith(asciiDomain);
      expect(result.asciiDomain).toBe(asciiDomain);
      expect(result.resolved).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    test('DNS解決エラーを適切に処理する', async () => {
      const domain = '日本.jp';
      const errorMessage = 'ENOTFOUND';

      dns.resolve4.mockRejectedValue(new Error(errorMessage));

      const result = await resolver.resolve(domain);

      expect(result).toEqual({
        domain: domain,
        asciiDomain: domain,
        addresses: [],
        resolved: false,
        error: errorMessage,
        timestamp: expect.any(String),
      });
    });

    test('タイムアウトを適切に処理する', async () => {
      const domain = 'example.com';

      // 6秒後に解決するように設定（タイムアウトは5秒）
      dns.resolve4.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(['192.0.2.1']), 6000)
          )
      );

      const result = await resolver.resolve(domain);

      expect(result.resolved).toBe(false);
      expect(result.error).toBe('DNS resolution timeout');
    });
  });

  describe('キャッシュ機能', () => {
    test('同じドメインの2回目の解決はキャッシュから返される', async () => {
      const domain = '日本.jp';
      const mockAddresses = ['192.0.2.1'];

      dns.resolve4.mockResolvedValue(mockAddresses);

      // 1回目の解決
      const result1 = await resolver.resolve(domain);
      // 2回目の解決
      const result2 = await resolver.resolve(domain);

      // DNS解決は1回だけ呼ばれる
      expect(dns.resolve4).toHaveBeenCalledTimes(1);

      // 結果は同じ
      expect(result1).toEqual(result2);
    });

    test('キャッシュクリアが正しく動作する', async () => {
      const domain = 'example.com';
      const mockAddresses = ['192.0.2.1'];

      dns.resolve4.mockResolvedValue(mockAddresses);

      // 1回目の解決
      await resolver.resolve(domain);

      // キャッシュクリア
      resolver.clearCache();

      // 2回目の解決
      await resolver.resolve(domain);

      // DNS解決は2回呼ばれる
      expect(dns.resolve4).toHaveBeenCalledTimes(2);
    });
  });

  describe('複数ドメインの並列解決', () => {
    test('複数のIDNドメインを並列で解決できる', async () => {
      const domains = ['日本.jp', '中国.中国', 'example.com'];
      const mockResults = [['192.0.2.1'], ['192.0.2.2'], ['192.0.2.3']];

      dns.resolve4
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = await resolver.resolveMultiple(domains);

      expect(results).toHaveLength(3);
      expect(results[0].domain).toBe('日本.jp');
      expect(results[0].asciiDomain).toBe('xn--wgv71a.jp');
      expect(results[1].domain).toBe('中国.中国');
      expect(results[1].asciiDomain).toBe('xn--fiqs8s.xn--fiqs8s');
      expect(results[2].domain).toBe('example.com');
      expect(results[2].asciiDomain).toBe('example.com');
    });
  });
});
