// Vitest用のセットアップファイル
import { vi } from 'vitest';

// グローバルモックの設定
vi.mock('chalk', () => ({
  default: {
    red: (str: string) => str,
    yellow: (str: string) => str,
    green: (str: string) => str,
    blue: (str: string) => str,
    gray: (str: string) => str,
    bold: (str: string) => str,
    dim: (str: string) => str,
    cyan: (str: string) => str,
    magenta: (str: string) => str,
  },
}));

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