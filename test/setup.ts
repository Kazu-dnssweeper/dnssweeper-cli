/**
 * Jest テストセットアップファイル
 * テスト実行前の共通設定
 */

// タイムゾーンを固定（日付関連のテストで一貫性を保つため）
process.env.TZ = 'Asia/Tokyo';

// Chalkモジュールのモック（ES modules問題を回避）
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    blue: (str: string) => str,
    red: (str: string) => str,
    green: (str: string) => str,
    yellow: (str: string) => str,
    gray: (str: string) => str,
    white: (str: string) => str,
    redBright: (str: string) => str,
  },
}));

// Oraモジュールのモック（ES modules問題を回避）
jest.mock('ora', () => ({
  __esModule: true,
  default: (text: string) => ({
    start: () => ({
      text,
      succeed: (_message: string) => {},
      fail: (_message: string) => {},
    }),
  }),
}));

// テスト用のconsole.logを無効化（必要に応じて）
// console.log = jest.fn();
// console.warn = jest.fn();
// console.error = jest.fn();