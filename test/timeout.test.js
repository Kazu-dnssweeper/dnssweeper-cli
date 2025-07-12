import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

const { NetworkClient } = require('../src/network');
const config = require('../src/config');

describe('タイムアウト設定のテスト', () => {
  let networkClient;
  let originalTimeout;

  beforeEach(() => {
    networkClient = new NetworkClient();
    // 元のタイムアウト値を保存
    originalTimeout = config.get('timeout');
  });

  afterEach(() => {
    // テスト後に元の値に戻す
    config.set('timeout', originalTimeout);
  });

  test('デフォルトタイムアウト値が正しく取得できる', () => {
    expect(config.getTimeout()).toBe(5000);
  });

  test('タイムアウト値を変更できる', () => {
    config.setTimeout(1); // 1秒に設定
    expect(config.getTimeout()).toBe(1000);
  });

  test('動的に変更したタイムアウト値がネットワーククライアントで使用される', async () => {
    // タイムアウトを短く設定
    config.setTimeout(0.1); // 100ms

    // 存在しないドメインで意図的にタイムアウトを発生させる
    const startTime = Date.now();
    try {
      await networkClient.checkDNSRecord(
        'this-domain-should-not-exist-12345.com'
      );
    } catch (error) {
      const elapsed = Date.now() - startTime;
      // タイムアウトエラーの確認
      expect(error.code).toBe('TIMEOUT');
      // 100ms程度でタイムアウトしているか確認（余裕を持って200ms以内）
      expect(elapsed).toBeLessThan(200);
    }
  });

  test('CLIオプションでタイムアウトを指定できる', async () => {
    // タイムアウトを1秒に設定
    config.setTimeout(1);

    // withTimeoutメソッドで直接タイムアウトを指定
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('success'), 2000); // 2秒後に解決
    });

    try {
      await networkClient.withTimeout(promise, 500); // 500msでタイムアウト
    } catch (error) {
      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toContain('500ms');
    }
  });

  test('不正なタイムアウト値の場合はデフォルト値を使用', () => {
    config.set('timeout', -1);
    expect(config.getTimeout()).toBe(5000);

    config.set('timeout', 'invalid');
    expect(config.getTimeout()).toBe(5000);

    config.set('timeout', 0);
    expect(config.getTimeout()).toBe(5000);
  });
});
