import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  fullyParallel: false, // CLIテストは順次実行
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // CLIテストは並列化しない
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  
  projects: [
    {
      name: 'cli-tests',
      testMatch: '**/*.spec.ts',
    },
  ],
  
  /* フォルダ設定 */
  outputDir: 'test-results/',
});