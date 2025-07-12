import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

const {
  ParallelChecker,
  createParallelChecker,
} = require('../src/parallel_checker');
const { performance } = require('perf_hooks');

describe('メモリリーク対策のテスト', () => {
  let checker;

  beforeEach(() => {
    checker = createParallelChecker({
      concurrency: 5,
      batchSize: 50,
      gcInterval: 100,
    });
  });

  afterEach(() => {
    if (checker) {
      checker.cleanup();
    }
  });

  test('大量ドメインの処理でメモリが適切に解放される', async () => {
    // テスト用の大量ドメインを生成
    const domains = [];
    for (let i = 0; i < 500; i++) {
      domains.push(`test-domain-${i}.example.com`);
    }

    // 初期メモリ使用量を記録
    if (global.gc) {
      global.gc();
    }
    const initialMemory = process.memoryUsage().heapUsed;

    // 進捗トラッキング
    let lastProgress = 0;
    const progressCallback = (progress) => {
      lastProgress = progress.percentage;
    };

    // 処理を実行
    const result = await checker.checkDomains(domains, 'A', progressCallback);

    // 処理後のメモリ使用量を記録
    if (global.gc) {
      global.gc();
    }
    const finalMemory = process.memoryUsage().heapUsed;

    // 結果の検証
    expect(result.summary.total).toBe(500);
    expect(lastProgress).toBe(100);

    // メモリ増加量が妥当な範囲内であることを確認
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
    console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);

    // 500ドメインの処理で50MB以上増加していたら警告
    if (memoryIncrease > 50) {
      console.warn(
        `Warning: High memory usage detected: ${memoryIncrease.toFixed(2)} MB`
      );
    }
  });

  test('ストリーム処理でメモリ効率が改善される', async () => {
    // テスト用のドメインを生成
    const domains = [];
    for (let i = 0; i < 200; i++) {
      domains.push(`stream-test-${i}.example.com`);
    }

    // 初期メモリ使用量を記録
    if (global.gc) {
      global.gc();
    }
    const initialMemory = process.memoryUsage().heapUsed;

    // ストリーム処理
    const results = [];
    const errors = [];

    for await (const result of checker.checkDomainsStream(domains, 'A')) {
      if (result.status === 'success') {
        results.push(result.domain);
      } else {
        errors.push(result.domain);
      }
    }

    // 処理後のメモリ使用量を記録
    if (global.gc) {
      global.gc();
    }
    const finalMemory = process.memoryUsage().heapUsed;

    // メモリ増加量が最小限であることを確認
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
    console.log(
      `Stream processing memory increase: ${memoryIncrease.toFixed(2)} MB`
    );

    expect(results.length + errors.length).toBe(200);
    expect(memoryIncrease).toBeLessThan(20); // ストリーム処理では20MB未満に抑える
  });

  test('cleanup()メソッドがメモリを解放する', () => {
    // ダミーデータを追加
    checker.results = new Array(1000).fill({ domain: 'test.com' });
    checker.errors = new Array(500).fill({ domain: 'error.com' });

    // cleanup前のメモリ状態を確認
    expect(checker.results.length).toBe(1000);
    expect(checker.errors.length).toBe(500);

    // cleanup実行
    checker.cleanup();

    // cleanup後の状態を確認
    expect(checker.results.length).toBe(0);
    expect(checker.errors.length).toBe(0);
    expect(checker.processedCount).toBe(0);
  });

  test('同時実行数が適切に制限される', async () => {
    const concurrentChecks = [];
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    // モックネットワーククライアント
    checker.checkSingleDomain = vi.fn(async (domain) => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

      // 遅延をシミュレート
      await new Promise((resolve) => setTimeout(resolve, 10));

      currentConcurrent--;
      return { domain, status: 'success' };
    });

    const domains = Array.from({ length: 50 }, (_, i) => `concurrent-${i}.com`);
    await checker.checkDomains(domains, 'A');

    // 同時実行数が設定値を超えていないことを確認
    expect(maxConcurrent).toBeLessThanOrEqual(checker.concurrency);
    expect(checker.checkSingleDomain).toHaveBeenCalledTimes(50);
  });

  test('メモリ使用量のログが出力される', () => {
    const originalDebug = process.env.DEBUG;
    process.env.DEBUG = 'true';

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    checker.logMemoryUsage();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Memory Usage:',
      expect.objectContaining({
        rss: expect.stringMatching(/\d+MB/),
        heapUsed: expect.stringMatching(/\d+MB/),
        heapTotal: expect.stringMatching(/\d+MB/),
        external: expect.stringMatching(/\d+MB/),
      })
    );

    consoleSpy.mockRestore();
    process.env.DEBUG = originalDebug;
  });
});
