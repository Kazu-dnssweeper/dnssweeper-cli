/**
 * 多言語メッセージ管理
 */

export type Language = 'ja' | 'en';

let currentLanguage: Language = 'ja';

/**
 * 現在の言語設定を取得
 */
export function getLanguage(): Language {
  return currentLanguage;
}

/**
 * 言語を設定
 */
export function setLanguage(language: Language): void {
  currentLanguage = language;
}

export interface Messages {
  // アプリケーション基本メッセージ
  app: {
    title: string;
    analyzing: string;
    analysisComplete: string;
    executionTime: string;
    target: string;
    outputFormat: string;
  };

  // 分析結果メッセージ
  analysis: {
    summary: string;
    totalRecords: string;
    processingTime: string;
    riskDistribution: string;
    deleteRecommended: string;
    noHighRisk: string;
    topRiskyRecords: string;
    detailedResults: string;
    executionComplete: string;
  };

  // リスクレベル
  riskLevels: {
    critical: string;
    high: string;
    medium: string;
    low: string;
    safe: string;
  };

  // エラーメッセージ
  errors: {
    analysisFailure: string;
    fileNotFound: string;
    invalidFormat: string;
    processingError: string;
  };

  // パターンマッチング理由
  reasons: {
    dangerousPrefix: string;
    dangerousSuffix: string;
    dangerousKeyword: string;
    lastModified: string;
    cnameWarning: string;
    noSpecialIssues: string;
    obsoleteSuffix?: string;
    deprecatedKeyword?: string;
    longUnused?: string;
    recentCreation?: string;
    activelyUsed?: string;
  };

  // ファイル操作
  fileOperations?: {
    resultsSaved: string;
    savingResults: string;
    saveError: string;
  };

  // テーブルヘッダー
  tableHeaders?: {
    name: string;
    type: string;
    riskScore: string;
    riskLevel: string;
    matchedPatterns: string;
    reasons: string;
  };
}

const japaneseMessages: Messages = {
  app: {
    title: '🔍 DNSweeper CLI - DNS レコード分析ツール',
    analyzing: 'CSVファイルを分析中...',
    analysisComplete: '分析完了',
    executionTime: '実行時間',
    target: '分析対象',
    outputFormat: '出力形式',
  },
  analysis: {
    summary: '📊 分析結果サマリー',
    totalRecords: '総レコード数:',
    processingTime: '処理時間:',
    riskDistribution: '🎯 リスク分布:',
    deleteRecommended: '削除検討対象:',
    noHighRisk: '高リスクレコードは検出されませんでした',
    topRiskyRecords: '🔍 高リスクレコード（上位5件）:',
    detailedResults: '📋 詳細分析結果',
    executionComplete: '✅ 実行完了:',
  },
  riskLevels: {
    critical: 'クリティカル',
    high: '高リスク',
    medium: '中リスク',
    low: '低リスク',
    safe: '安全',
  },
  errors: {
    analysisFailure: '分析に失敗しました',
    fileNotFound: 'ファイルが見つかりません',
    invalidFormat: '無効なフォーマットです',
    processingError: '処理エラーが発生しました',
  },
  reasons: {
    dangerousPrefix: '危険なプレフィックス「{pattern}」が検出されました',
    dangerousSuffix: '危険なサフィックス「{pattern}」が検出されました',
    dangerousKeyword: '危険なキーワード「{pattern}」が検出されました',
    lastModified: '最終更新から{days}日経過しています',
    cnameWarning: 'CNAMEレコードは参照先の変更に注意が必要です',
    noSpecialIssues: 'パターンマッチングによる特別な問題は検出されませんでした',
  },
};

const englishMessages: Messages = {
  app: {
    title: '🔍 DNSweeper CLI - DNS Record Analysis Tool',
    analyzing: 'Analyzing CSV file...',
    analysisComplete: 'Analysis complete',
    executionTime: 'Execution time',
    target: 'Analysis target',
    outputFormat: 'Output format',
  },
  analysis: {
    summary: '📊 Analysis Summary',
    totalRecords: 'Total records:',
    processingTime: 'Processing time:',
    riskDistribution: '🎯 Risk Distribution:',
    deleteRecommended: 'Deletion candidates:',
    noHighRisk: 'No high-risk records detected',
    topRiskyRecords: '🔍 Top Risky Records (Top 5):',
    detailedResults: '📋 Detailed Analysis Results',
    executionComplete: '✅ Execution complete:',
  },
  riskLevels: {
    critical: 'Critical',
    high: 'High Risk',
    medium: 'Medium Risk',
    low: 'Low Risk',
    safe: 'Safe',
  },
  errors: {
    analysisFailure: 'Analysis failed',
    fileNotFound: 'File not found',
    invalidFormat: 'Invalid format',
    processingError: 'Processing error occurred',
  },
  reasons: {
    dangerousPrefix: 'Dangerous prefix "{pattern}" detected',
    dangerousSuffix: 'Dangerous suffix "{pattern}" detected',
    dangerousKeyword: 'Dangerous keyword "{pattern}" detected',
    lastModified: 'Last modified {days} days ago',
    cnameWarning: 'CNAME record requires attention to reference changes',
    noSpecialIssues: 'No special issues detected by pattern matching',
  },
};

const messageStore = new Map<Language, Messages>([
  ['ja', japaneseMessages],
  ['en', englishMessages],
]);

/**
 * 指定された言語のメッセージを取得
 */
export function getMessages(language: Language): Messages {
  return messageStore.get(language) || japaneseMessages;
}

/**
 * メッセージのプレースホルダーを置換
 */
export function formatMessage(
  message: string,
  params: Record<string, string | number>,
): string {
  let formatted = message;
  for (const [key, value] of Object.entries(params)) {
    formatted = formatted.replace(
      new RegExp(`\\{${key}\\}`, 'g'),
      String(value),
    );
  }
  return formatted;
}
