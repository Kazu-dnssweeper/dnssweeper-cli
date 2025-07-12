// Vitest用のセットアップファイル
import { vi } from 'vitest';

// グローバルモックの設定（importOriginal使用）
vi.mock('chalk', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      red: vi.fn((str: string) => str),
      yellow: vi.fn((str: string) => str),
      green: vi.fn((str: string) => str),
      blue: vi.fn((str: string) => str),
      gray: vi.fn((str: string) => str),
      white: vi.fn((str: string) => str),
      bold: vi.fn((str: string) => str),
      dim: vi.fn((str: string) => str),
      cyan: vi.fn((str: string) => str),
      magenta: vi.fn((str: string) => str),
    },
    // Named exports対応
    red: vi.fn((str: string) => str),
    yellow: vi.fn((str: string) => str),
    green: vi.fn((str: string) => str),
    blue: vi.fn((str: string) => str),
    gray: vi.fn((str: string) => str),
    white: vi.fn((str: string) => str),
    bold: vi.fn((str: string) => str),
    dim: vi.fn((str: string) => str),
    cyan: vi.fn((str: string) => str),
    magenta: vi.fn((str: string) => str),
  };
});

vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    text: '',
  }),
}));

// グローバル変数の設定
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

// タイムアウトクリーンアップ
afterEach(() => {
  vi.clearAllTimers();
});

// 全モックのリセット
afterEach(() => {
  vi.resetAllMocks();
});