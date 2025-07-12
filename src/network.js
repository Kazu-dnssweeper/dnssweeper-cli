const dns = require('dns').promises;
const { performance } = require('perf_hooks');
const config = require('./config');
const { NetworkError } = require('./errors');

class NetworkClient {
  constructor() {
    // タイムアウトはconfigから動的に取得するため、ここでは保持しない
  }

  // タイムアウト付きPromiseラッパー
  async withTimeout(promise, timeoutMs = null) {
    // timeoutMsが指定されていない場合は常に最新のconfig値を取得
    const timeout = timeoutMs || config.getTimeout();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new NetworkError(`Request timed out after ${timeout}ms`, 'TIMEOUT')
        );
      }, timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  // DNSレコードをチェック
  async checkDNSRecord(domain, recordType = 'A') {
    const startTime = performance.now();

    try {
      // configからタイムアウト値を取得して使用
      const timeoutMs = config.getTimeout();

      const result = await this.withTimeout(
        this.resolveDNS(domain, recordType),
        timeoutMs
      );

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      return {
        domain,
        recordType,
        records: result,
        status: 'active',
        responseTime: duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (error.code === 'TIMEOUT') {
        throw new NetworkError(
          `DNS lookup timed out after ${config.getTimeout()}ms`,
          'TIMEOUT',
          { domain, recordType, duration }
        );
      }

      if (error.code === 'ENOTFOUND') {
        return {
          domain,
          recordType,
          records: [],
          status: 'not_found',
          responseTime: duration,
          timestamp: new Date().toISOString(),
        };
      }

      throw new NetworkError(
        `DNS lookup failed: ${error.message}`,
        error.code || 'UNKNOWN',
        { domain, recordType, error: error.message }
      );
    }
  }

  // 実際のDNS解決処理
  async resolveDNS(domain, recordType) {
    const resolver = {
      A: () => dns.resolve4(domain),
      AAAA: () => dns.resolve6(domain),
      CNAME: () => dns.resolveCname(domain),
      MX: () => dns.resolveMx(domain),
      TXT: () => dns.resolveTxt(domain),
      NS: () => dns.resolveNs(domain),
      SOA: () => dns.resolveSoa(domain),
    };

    const resolveFunction = resolver[recordType];
    if (!resolveFunction) {
      throw new NetworkError(
        `Unsupported record type: ${recordType}`,
        'UNSUPPORTED_TYPE'
      );
    }

    return resolveFunction();
  }

  // バッチでドメインをチェック
  async checkDomainsBatch(domains, recordType = 'A') {
    const results = [];
    const errors = [];

    for (const domain of domains) {
      try {
        const result = await this.checkDNSRecord(domain, recordType);
        results.push(result);
      } catch (error) {
        errors.push({
          domain,
          error: error.message,
          code: error.code,
        });
      }
    }

    return { results, errors };
  }

  // タイムアウト設定を動的に更新（廃止予定：configから直接取得するため不要）
  updateTimeout(newTimeout) {
    // 後方互換性のため残すが、実際には使用しない
    console.warn(
      'updateTimeout is deprecated. Use config.setTimeout() instead.'
    );
  }
}

module.exports = { NetworkClient };
