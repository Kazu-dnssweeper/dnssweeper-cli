// エラーメッセージの日本語化とユーザーフレンドリーな説明
const ERROR_MESSAGES = {
  ENOTFOUND: {
    message: '指定されたドメインが見つかりません',
    suggestion: 'ドメイン名が正しいか確認してください。',
    example: '例: example.com',
  },
  ECONNREFUSED: {
    message: '接続が拒否されました',
    suggestion:
      'DNSサーバーが利用可能か、ファイアウォールの設定を確認してください。',
  },
  ETIMEDOUT: {
    message: '接続がタイムアウトしました',
    suggestion:
      'ネットワーク接続を確認するか、--timeout オプションで時間を延長してください。',
    example: '例: dns-sweep check example.com --timeout 10',
  },
  TIMEOUT: {
    message: 'DNS解決がタイムアウトしました',
    suggestion:
      'インターネット接続が遅いか、DNSサーバーが応答しません。以下を試してください：\n   1. インターネット接続を確認\n   2. タイムアウト時間を延長 (--timeout 15)\n   3. 別のDNSサーバーを試す',
    example: '例: dns-sweep check example.com --timeout 15',
  },
  ENOENT: {
    message: 'ファイルまたはディレクトリが見つかりません',
    suggestion: '指定したパスが正しいか確認してください。',
  },
  EACCES: {
    message: 'アクセス権限がありません',
    suggestion:
      'ファイルやディレクトリの権限を確認してください。管理者権限が必要な場合があります。',
  },
  UNSUPPORTED_TYPE: {
    message: 'サポートされていないレコードタイプです',
    suggestion: '利用可能なレコードタイプ: A, AAAA, CNAME, MX, TXT, NS, SOA',
    example: '例: dns-sweep check example.com --type A',
  },
  NETWORK_ERROR: {
    message: 'ネットワークエラーが発生しました',
    suggestion: 'インターネット接続を確認してください。',
  },
  INVALID_DOMAIN: {
    message: '無効なドメイン名です',
    suggestion: 'ドメイン名の形式を確認してください。',
    example: '例: example.com, subdomain.example.com',
  },
  CONFIG_ERROR: {
    message: '設定ファイルにエラーがあります',
    suggestion: '~/.dnssweeper/config.json の内容を確認してください。',
  },
  RATE_LIMIT: {
    message: 'リクエストの制限に達しました',
    suggestion: '少し時間をおいてから再度実行してください。',
  },
  DNS_RESOLUTION_FAILED: {
    message: 'DNS解決に失敗しました',
    suggestion:
      '以下を確認してください：\n   1. ドメイン名のスペルが正しいか\n   2. インターネット接続が正常か\n   3. DNSサーバーが応答するか',
    example: '例: nslookup example.com で手動確認',
  },
  PARALLEL_PROCESSING_ERROR: {
    message: '並列処理中にエラーが発生しました',
    suggestion:
      '一部のドメインでエラーが発生しました。個別に確認してください。',
  },
};

// カスタムエラークラス
class DnsSweeperError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'DnsSweeperError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toUserFriendlyMessage() {
    const errorInfo = ERROR_MESSAGES[this.code] || ERROR_MESSAGES.NETWORK_ERROR;

    let message = `\n❌ エラー: ${errorInfo.message}\n`;

    if (errorInfo.suggestion) {
      message += `💡 解決方法: ${errorInfo.suggestion}\n`;
    }

    if (errorInfo.example) {
      message += `📝 ${errorInfo.example}\n`;
    }

    if (this.details && Object.keys(this.details).length > 0) {
      message += '\n詳細情報:\n';
      Object.entries(this.details).forEach(([key, value]) => {
        if (key !== 'error' && value !== undefined) {
          message += `  - ${this.formatDetailKey(key)}: ${value}\n`;
        }
      });
    }

    return message;
  }

  formatDetailKey(key) {
    const keyMap = {
      domain: 'ドメイン',
      recordType: 'レコードタイプ',
      duration: '処理時間',
      timeout: 'タイムアウト設定',
      path: 'パス',
      file: 'ファイル',
    };
    return keyMap[key] || key;
  }
}

// 特定のエラータイプ
class NetworkError extends DnsSweeperError {
  constructor(message, code, details) {
    super(message, code, details);
    this.name = 'NetworkError';
  }
}

class ConfigError extends DnsSweeperError {
  constructor(message, details) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

class ValidationError extends DnsSweeperError {
  constructor(message, code, details) {
    super(message, code, details);
    this.name = 'ValidationError';
  }
}

// エラーハンドリングユーティリティ
function handleError(error) {
  if (error instanceof DnsSweeperError) {
    console.error(error.toUserFriendlyMessage());
  } else if (error.code && ERROR_MESSAGES[error.code]) {
    // Node.jsの標準エラーコードを変換
    const dnsError = new DnsSweeperError(error.message, error.code);
    console.error(dnsError.toUserFriendlyMessage());
  } else {
    // 予期しないエラー
    console.error('\n❌ 予期しないエラーが発生しました');
    console.error(
      '💡 解決方法: このエラーが続く場合は、以下の情報と共に報告してください:\n'
    );
    console.error('エラー詳細:', error.message || error);
    if (error.stack && process.env.DEBUG) {
      console.error('\nスタックトレース:', error.stack);
    }
  }
}

// エクスポート
module.exports = {
  DnsSweeperError,
  NetworkError,
  ConfigError,
  ValidationError,
  handleError,
  ERROR_MESSAGES,
};
