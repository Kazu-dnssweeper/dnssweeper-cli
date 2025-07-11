import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// テストデータのパス
const testDataPath = path.join(__dirname, '../../test-data/normal-records-50.csv');
const cliPath = path.join(__dirname, '../../dist/index.js');

test.describe('DNSweeper CLI E2E Tests', () => {
  test.beforeAll(async () => {
    // CLIがビルドされているか確認
    try {
      await fs.access(cliPath);
    } catch {
      throw new Error('CLIがビルドされていません。npm run buildを実行してください。');
    }
  });

  test('CSVファイルを正常に解析する', async () => {
    const { stdout, stderr } = await execAsync(`node ${cliPath} analyze ${testDataPath}`);
    
    expect(stderr).toBe('');
    expect(stdout).toContain('解析完了');
    expect(stdout).toContain('リスクレベル別統計');
    expect(stdout).toContain('推奨アクション');
  });

  test('--json オプションでJSON出力する', async () => {
    const { stdout, stderr } = await execAsync(`node ${cliPath} analyze ${testDataPath} --json`);
    
    expect(stderr).toBe('');
    
    // JSON形式であることを確認
    const result = JSON.parse(stdout);
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('records');
    expect(result.summary).toHaveProperty('totalRecords');
    expect(result.summary).toHaveProperty('riskLevels');
  });

  test('--output オプションでファイル出力する', async () => {
    const outputPath = path.join(__dirname, '../../test-output.csv');
    
    try {
      const { stdout, stderr } = await execAsync(
        `node ${cliPath} analyze ${testDataPath} --output csv --output-file ${outputPath}`
      );
      
      expect(stderr).toBe('');
      expect(stdout).toContain('結果をファイルに出力しました');
      
      // ファイルが作成されたか確認
      const fileContent = await fs.readFile(outputPath, 'utf-8');
      expect(fileContent).toContain('Name,Type,Content,Risk Level,Risk Score');
    } finally {
      // クリーンアップ
      try {
        await fs.unlink(outputPath);
      } catch {
        // ファイルが存在しない場合は無視
      }
    }
  });

  test('--risk-level オプションでフィルタリングする', async () => {
    const { stdout } = await execAsync(`node ${cliPath} analyze ${testDataPath} --risk-level high`);
    
    expect(stdout).toContain('リスクレベル: high 以上');
    expect(stdout).not.toContain('low:');
  });

  test('--provider オプションで特定プロバイダーを指定する', async () => {
    const { stdout } = await execAsync(`node ${cliPath} analyze ${testDataPath} --provider cloudflare`);
    
    expect(stdout).toContain('プロバイダー: cloudflare');
  });

  test('存在しないファイルでエラーを表示する', async () => {
    try {
      await execAsync(`node ${cliPath} analyze non-existent-file.csv`);
      // エラーが発生しなかった場合はテスト失敗
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.stderr).toContain('Error');
      expect(error.code).not.toBe(0);
    }
  });

  test('--help オプションでヘルプを表示する', async () => {
    const { stdout } = await execAsync(`node ${cliPath} --help`);
    
    expect(stdout).toContain('dnssweeper');
    expect(stdout).toContain('analyze');
    expect(stdout).toContain('Options:');
  });

  test('--version オプションでバージョンを表示する', async () => {
    const { stdout } = await execAsync(`node ${cliPath} --version`);
    
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });
});