import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/vitest-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}', 'test/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'test/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        'src/index.ts', // メインエントリーポイントは除外
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    // Jestからの移行を容易にする設定
    pool: 'forks',
    poolOptions: {
      threads: {
        singleThread: true, // WSL環境での安定性向上
      },
    },
    testTimeout: 5000, // 5秒（Jestと同じ）
    hookTimeout: 10000,
    teardownTimeout: 1000,
    bail: 1, // 最初のエラーで停止
    // レポーター設定
    reporters: ['default'],
    outputFile: {
      json: './test-results/vitest-results.json',
      html: './test-results/index.html',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/analyzers': path.resolve(__dirname, './src/analyzers'),
      '@/parsers': path.resolve(__dirname, './src/parsers'),
      '@/patterns': path.resolve(__dirname, './src/patterns'),
      '@/providers': path.resolve(__dirname, './src/providers'),
      '@/commands': path.resolve(__dirname, './src/commands'),
    },
  },
});