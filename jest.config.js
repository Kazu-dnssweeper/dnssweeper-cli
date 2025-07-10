module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // メインエントリーポイントは除外
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  // 日本語のテストファイル名もサポート
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // テスト実行前のセットアップ
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  // ES6モジュールの変換設定を無効化（Chalkの問題を回避）
  transformIgnorePatterns: [
    'node_modules/(?!(chalk)/)',
  ],
  // テストでのモジュール解決
  moduleNameMapper: {
    '^chalk$': 'chalk',
  },
  // タイムアウト設定
  testTimeout: 5000, // 5秒に短縮
  // 並列実行設定を無効化（WSL環境での安定性向上）
  maxWorkers: 1,
  // Jest実行の詳細ログを抑制
  verbose: false,
  // ファイルウォッチャーを無効化（WSL環境での問題回避）
  watchman: false,
  // 強制終了でハングアップを防止
  forceExit: true,
  // オープンハンドルの検出
  detectOpenHandles: false,
  // コンソール出力を抑制
  silent: false,
  // キャッシュ無効化（WSL環境での問題回避）
  clearMocks: true,
  restoreMocks: true,
};