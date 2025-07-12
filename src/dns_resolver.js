const dns = require('dns').promises;
const punycode = require('punycode');
const config = require('./config');
const { DnsSweeperError } = require('./errors');

/**
 * DNS解決を行うモジュール
 * 国際化ドメイン名（IDN）をサポート
 */
class DNSResolver {
  constructor(options = {}) {
    this.cache = new Map();
    this.cacheMaxSize = options.cacheMaxSize || 1000; // 最大キャッシュサイズ
    this.cacheTTL = options.cacheTTL || 300000; // 5分のTTL（ミリ秒）
  }

  /**
   * ドメイン名を解決してIPアドレスを取得
   * @param {string} domain - 解決するドメイン名
   * @returns {Promise<Object>} 解決結果
   */
  async resolve(domain) {
    try {
      // キャッシュチェック（TTLも考慮）
      if (this.cache.has(domain)) {
        const cached = this.cache.get(domain);
        if (Date.now() - cached.cachedAt < this.cacheTTL) {
          return cached.result;
        } else {
          // 期限切れのエントリを削除
          this.cache.delete(domain);
        }
      }

      // キャッシュサイズ制限チェック
      this.cleanupCache();

      // IDNの処理（日本語ドメインなど）
      // 国際化ドメイン名をPunycodeに変換
      const asciiDomain = punycode.toASCII(domain);

      // DNS解決（設定からタイムアウトを取得）
      const timeout = config.getTimeout();
      const addresses = await Promise.race([
        dns.resolve4(asciiDomain),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('DNS解決がタイムアウトしました')),
            timeout
          )
        ),
      ]);

      const result = {
        domain: domain,
        asciiDomain: asciiDomain,
        addresses: addresses,
        resolved: true,
        timestamp: new Date().toISOString(),
      };

      // キャッシュに保存（タイムスタンプ付き）
      this.cache.set(domain, {
        result: result,
        cachedAt: Date.now(),
      });

      return result;
    } catch (error) {
      // エラー時でもPunycode変換を試みる
      let asciiDomain;
      try {
        asciiDomain = punycode.toASCII(domain);
      } catch (punycodeError) {
        asciiDomain = domain; // Punycode変換に失敗した場合は元のドメインを使用
      }

      // ユーザーフレンドリーなエラーメッセージを生成
      let errorCode = 'DNS_RESOLUTION_FAILED';
      if (error.message.includes('タイムアウト')) {
        errorCode = 'TIMEOUT';
      } else if (error.code) {
        errorCode = error.code;
      }

      const dnsError = new DnsSweeperError(error.message, errorCode, {
        domain: domain,
        asciiDomain: asciiDomain,
        timeout: `${config.getTimeout()}ms`,
      });

      return {
        domain: domain,
        asciiDomain: asciiDomain,
        addresses: [],
        resolved: false,
        error: dnsError,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 複数のドメインを並列で解決
   * @param {string[]} domains - 解決するドメイン名の配列
   * @returns {Promise<Object[]>} 解決結果の配列
   */
  async resolveMultiple(domains) {
    const results = await Promise.all(
      domains.map((domain) => this.resolve(domain))
    );
    return results;
  }

  /**
   * キャッシュのクリーンアップ（サイズ制限と期限切れエントリの削除）
   */
  cleanupCache() {
    const now = Date.now();

    // 期限切れエントリを削除
    for (const [domain, entry] of this.cache.entries()) {
      if (now - entry.cachedAt >= this.cacheTTL) {
        this.cache.delete(domain);
      }
    }

    // サイズ制限チェック（LRU削除）
    if (this.cache.size >= this.cacheMaxSize) {
      // 最も古いエントリから削除
      const entriesToDelete = this.cache.size - this.cacheMaxSize + 1;
      let deleted = 0;

      for (const [domain] of this.cache.entries()) {
        if (deleted >= entriesToDelete) break;
        this.cache.delete(domain);
        deleted++;
      }
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, entry] of this.cache.entries()) {
      if (now - entry.cachedAt < this.cacheTTL) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.cacheMaxSize,
      ttl: this.cacheTTL,
    };
  }
}

module.exports = DNSResolver;
