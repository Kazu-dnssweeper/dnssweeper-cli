import { vi, describe, test, expect } from 'vitest';

const {
  DnsSweeperError,
  NetworkError,
  ConfigError,
  ValidationError,
  handleError,
  ERROR_MESSAGES,
} = require('../src/errors');

describe('エラーメッセージの日本語化テスト', () => {
  test('ENOTFOUNDエラーが日本語で表示される', () => {
    const error = new NetworkError('Domain not found', 'ENOTFOUND', {
      domain: 'example.com',
      recordType: 'A',
    });

    const message = error.toUserFriendlyMessage();
    expect(message).toContain('指定されたドメインが見つかりません');
    expect(message).toContain('ドメイン名が正しいか確認してください');
    expect(message).toContain('例: example.com');
    expect(message).toContain('ドメイン: example.com');
  });

  test('TIMEOUTエラーが日本語で表示される', () => {
    const error = new NetworkError('Request timed out', 'TIMEOUT', {
      domain: 'slow-domain.com',
      duration: '5000ms',
    });

    const message = error.toUserFriendlyMessage();
    expect(message).toContain('DNS解決がタイムアウトしました');
    expect(message).toContain('タイムアウト時間を延長 (--timeout 15)');
    expect(message).toContain('例: dns-sweep check example.com --timeout 15');
  });

  test('UNSUPPORTED_TYPEエラーが日本語で表示される', () => {
    const error = new NetworkError('Invalid record type', 'UNSUPPORTED_TYPE', {
      recordType: 'INVALID',
    });

    const message = error.toUserFriendlyMessage();
    expect(message).toContain('サポートされていないレコードタイプです');
    expect(message).toContain(
      '利用可能なレコードタイプ: A, AAAA, CNAME, MX, TXT, NS, SOA'
    );
  });

  test('CONFIG_ERRORが日本語で表示される', () => {
    const error = new ConfigError('Invalid configuration', {
      file: 'config.json',
    });

    const message = error.toUserFriendlyMessage();
    expect(message).toContain('設定ファイルにエラーがあります');
    expect(message).toContain(
      '~/.dnssweeper/config.json の内容を確認してください'
    );
  });

  test('詳細情報のキーが日本語に変換される', () => {
    const error = new NetworkError('Test error', 'NETWORK_ERROR', {
      domain: 'test.com',
      recordType: 'A',
      duration: '1000ms',
      path: '/test/path',
    });

    const message = error.toUserFriendlyMessage();
    expect(message).toContain('ドメイン: test.com');
    expect(message).toContain('レコードタイプ: A');
    expect(message).toContain('処理時間: 1000ms');
    expect(message).toContain('パス: /test/path');
  });

  test('予期しないエラーコードの場合はデフォルトメッセージを表示', () => {
    const error = new NetworkError('Unknown error', 'UNKNOWN_CODE');

    const message = error.toUserFriendlyMessage();
    expect(message).toContain('ネットワークエラーが発生しました');
    expect(message).toContain('インターネット接続を確認してください');
  });

  test('handleError関数がDnsSweeperErrorを適切に処理する', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new NetworkError('Test', 'ENOTFOUND', { domain: 'test.com' });
    handleError(error);

    expect(consoleSpy).toHaveBeenCalledWith(error.toUserFriendlyMessage());
    consoleSpy.mockRestore();
  });

  test('handleError関数がNode.jsの標準エラーを変換する', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const nodeError = new Error('getaddrinfo ENOTFOUND example.com');
    nodeError.code = 'ENOTFOUND';

    handleError(nodeError);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('指定されたドメインが見つかりません')
    );
    consoleSpy.mockRestore();
  });

  test('handleError関数が予期しないエラーを処理する', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const unknownError = new Error('Something went wrong');
    handleError(unknownError);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('予期しないエラーが発生しました')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'このエラーが続く場合は、以下の情報と共に報告してください'
      )
    );
    consoleSpy.mockRestore();
  });

  test('エラーメッセージに絵文字が含まれる', () => {
    const error = new NetworkError('Test', 'TIMEOUT');
    const message = error.toUserFriendlyMessage();

    expect(message).toContain('❌');
    expect(message).toContain('💡');
    expect(message).toContain('📝');
  });
});
