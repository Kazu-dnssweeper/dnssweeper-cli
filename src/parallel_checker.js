const { NetworkClient } = require('./network');
const { performance } = require('perf_hooks');
const { ValidationError, DnsSweeperError } = require('./errors');

class ParallelChecker {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 10; // 同時実行数を制限
    this.batchSize = options.batchSize || 100; // バッチサイズ
    this.networkClient = new NetworkClient();
    this.results = [];
    this.errors = [];

    // メモリ管理のための設定
    this.gcInterval = options.gcInterval || 1000; // ガベージコレクション推奨間隔
    this.processedCount = 0;
  }

  // ドメインリストを並列でチェック（メモリリーク対策済み）
  async checkDomains(domains, recordType = 'A', progressCallback = null) {
    if (!Array.isArray(domains) || domains.length === 0) {
      throw new ValidationError('ドメインリストが空です', 'EMPTY_DOMAIN_LIST');
    }

    const startTime = performance.now();
    this.results = [];
    this.errors = [];
    this.processedCount = 0;

    // 大量ドメインの場合はストリーム処理を推奨
    if (domains.length > 1000) {
      console.warn(
        '大量のドメイン（1000件以上）を処理します。メモリ使用量に注意してください。'
      );
      console.warn(
        'より効率的な処理には checkDomainsStream() の使用を推奨します。'
      );
    }

    // ドメインをバッチに分割
    const batches = this.createBatches(domains, this.batchSize);

    // バッチごとに処理
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      await this.processBatch(batch, recordType, progressCallback);

      // メモリ解放を促進
      if (batchIndex % 5 === 0) {
        // 明示的にガベージコレクションを実行（可能な場合）
        if (global.gc) {
          global.gc();
        }

        // イベントループに制御を戻す
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);

    // 最終的な結果を返す前にメモリ状態をログ
    this.logMemoryUsage();

    return {
      summary: {
        total: domains.length,
        successful: this.results.length,
        failed: this.errors.length,
        duration: totalTime,
        averageTime: Math.round(totalTime / domains.length),
      },
      results: this.results,
      errors: this.errors,
    };
  }

  // バッチを作成
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  // バッチを処理（並列実行数を制限）
  async processBatch(batch, recordType, progressCallback) {
    const chunks = this.createBatches(batch, this.concurrency);

    for (const chunk of chunks) {
      // Promise.allを使用して並列実行
      const promises = chunk.map((domain) =>
        this.checkSingleDomain(domain, recordType)
          .then((result) => ({ domain, result, status: 'fulfilled' }))
          .catch((error) => ({ domain, error, status: 'rejected' }))
      );

      // 結果を待機
      const results = await Promise.all(promises);

      // 結果を処理し、メモリを解放
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        this.processedCount++;

        if (result.status === 'fulfilled') {
          this.results.push(result.result);
        } else {
          // エラーをユーザーフレンドリーな形式で記録
          const errorInfo = this.formatError(result.error, result.domain);
          this.errors.push(errorInfo);
        }

        // 進捗コールバック
        if (progressCallback) {
          progressCallback({
            current: this.processedCount,
            total: batch.length,
            percentage: Math.round((this.processedCount / batch.length) * 100),
          });
        }

        // 処理済みの結果を即座に削除してメモリを解放
        results[i] = null;
      }

      // 明示的にプロミスと結果の参照を削除してメモリリークを防ぐ
      for (let i = 0; i < promises.length; i++) {
        promises[i] = null;
      }
      promises.length = 0;

      for (let i = 0; i < results.length; i++) {
        if (results[i] && typeof results[i] === 'object') {
          // オブジェクトのプロパティを明示的にクリア
          Object.keys(results[i]).forEach((key) => {
            results[i][key] = null;
          });
        }
        results[i] = null;
      }
      results.length = 0;

      // 定期的にメモリ使用量をチェック
      if (this.processedCount % this.gcInterval === 0) {
        this.logMemoryUsage();

        // Node.jsのイベントループを解放
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
  }

  // 単一ドメインをチェック
  async checkSingleDomain(domain, recordType) {
    try {
      const result = await this.networkClient.checkDNSRecord(
        domain,
        recordType
      );
      return result;
    } catch (error) {
      // エラーは呼び出し元で処理
      throw error;
    }
  }

  // エラーをユーザーフレンドリーな形式にフォーマット
  formatError(error, domain) {
    let errorCode = 'PARALLEL_PROCESSING_ERROR';
    let message = 'Unknown error';

    if (error instanceof DnsSweeperError) {
      return {
        domain: domain,
        error: error,
        message: error.message,
        code: error.code,
      };
    } else if (error.code) {
      errorCode = error.code;
      message = error.message;
    } else if (error.message) {
      message = error.message;
    }

    const dnsError = new DnsSweeperError(message, errorCode, {
      domain: domain,
      originalError: error.message || error.toString(),
    });

    return {
      domain: domain,
      error: dnsError,
      message: message,
      code: errorCode,
    };
  }

  // メモリ使用量をログ出力
  logMemoryUsage() {
    if (process.env.DEBUG) {
      const usage = process.memoryUsage();
      console.log('Memory Usage:', {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      });
    }
  }

  // 結果をストリームで処理（大量データ用）
  async *checkDomainsStream(domains, recordType = 'A') {
    const batches = this.createBatches(domains, this.batchSize);

    for (const batch of batches) {
      const chunks = this.createBatches(batch, this.concurrency);

      for (const chunk of chunks) {
        const promises = chunk.map((domain) =>
          this.checkSingleDomain(domain, recordType)
            .then((result) => ({ status: 'success', domain, result }))
            .catch((error) => ({ status: 'error', domain, error }))
        );

        const results = await Promise.all(promises);

        // 結果を逐次yield
        for (const result of results) {
          yield result;
        }

        // メモリを解放
        results.length = 0;
        promises.length = 0;
      }
    }
  }

  // リソースをクリーンアップ
  cleanup() {
    this.results = [];
    this.errors = [];
    this.processedCount = 0;

    // 強制的にガベージコレクションを実行（可能な場合）
    if (global.gc) {
      global.gc();
    }
  }
}

// メモリ効率的なファクトリ関数
function createParallelChecker(options = {}) {
  // デフォルトオプションを設定
  const defaultOptions = {
    concurrency: 10,
    batchSize: 100,
    gcInterval: 1000,
  };

  return new ParallelChecker({ ...defaultOptions, ...options });
}

module.exports = {
  ParallelChecker,
  createParallelChecker,
};
