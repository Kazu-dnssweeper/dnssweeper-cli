/**
 * End-to-End CLIテスト
 * 実際のCLIコマンドの動作をテスト
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { promises as fs } from 'fs';

const execAsync = promisify(exec);

describe('CLI E2E Tests', () => {
  const testDataDir = path.join(__dirname, '../../test-data');
  const testDataFile = path.join(testDataDir, 'normal-records-50.csv');
  const tempDir = path.join(__dirname, '../temp');
  const tempFile = path.join(tempDir, 'test-e2e.csv');

  beforeAll(async () => {
    // テスト用ディレクトリを作成
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // テスト用ディレクトリをクリーンアップ
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // エラーは無視
    }
  });

  beforeEach(async () => {
    // テスト用ディレクトリを確実に作成
    await fs.mkdir(tempDir, { recursive: true });
    
    // テスト用CSVファイルを作成
    const testCSV = `Name,Type,Content,TTL,Proxied,Created,Modified
example.com,A,192.168.1.1,300,true,2023-01-15T10:00:00Z,2024-12-01T15:30:00Z
old-api.example.com,A,192.168.1.10,300,false,2022-05-10T09:00:00Z,2023-02-10T10:00:00Z
test-server.example.com,A,192.168.1.20,300,false,2023-08-15T11:30:00Z,2023-08-15T11:30:00Z`;
    
    await fs.writeFile(tempFile, testCSV);
  });

  describe('analyze command', () => {
    it('基本的なanalyzeコマンドが動作する', async () => {
      const command = `npm run dev -- analyze "${tempFile}"`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('DNSweeper CLI');
      expect(stdout).toContain('分析結果サマリー');
      expect(stdout).toContain('総レコード数: 3');
      expect(stdout).toContain('実行完了');
    }, 30000);

    it('JSON出力形式が動作する', async () => {
      const command = `npm run dev -- analyze "${tempFile}" --output json`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('DNSweeper CLI');
      
      // JSON部分を抽出してパース
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      expect(jsonMatch).toBeTruthy();
      
      const jsonOutput = JSON.parse(jsonMatch![0]);
      expect(jsonOutput.summary).toBeDefined();
      expect(jsonOutput.summary.totalRecords).toBe(3);
      expect(jsonOutput.results).toHaveLength(3);
    }, 30000);

    it('CSV出力形式が動作する', async () => {
      const command = `npm run dev -- analyze "${tempFile}" --output csv`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('DNSweeper CLI');
      expect(stdout).toContain('Name,Type,Content,TTL,Proxied,Created,Modified,RiskScore,RiskLevel,MatchedPatterns,Reasons');
      expect(stdout).toContain('example.com,A,192.168.1.1');
      expect(stdout).toContain('old-api.example.com,A,192.168.1.10');
    }, 30000);

    it('verbose オプションが動作する', async () => {
      const command = `npm run dev -- analyze "${tempFile}" --verbose`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('DNSweeper CLI');
      expect(stdout).toContain('高リスクレコード（上位5件）');
      expect(stdout).toContain('詳細分析結果');
    }, 30000);

    it('存在しないファイルでエラーが発生する', async () => {
      const command = `npm run dev -- analyze "nonexistent.csv"`;
      
      await expect(execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      })).rejects.toThrow();
    }, 30000);

    it('実際のテストデータファイルが分析できる', async () => {
      // 実際のtest-dataファイルが存在するかチェック
      try {
        await fs.access(testDataFile);
      } catch (error) {
        console.warn('test-data/normal-records-50.csv が見つかりません。スキップします。');
        return;
      }

      const command = `npm run dev -- analyze "${testDataFile}"`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('DNSweeper CLI');
      expect(stdout).toContain('分析結果サマリー');
      expect(stdout).toContain('総レコード数: 50');
      expect(stdout).toContain('実行完了');
    }, 30000);
  });

  describe('risk-level filtering', () => {
    it('--risk-level=high オプションが動作する', async () => {
      const command = `npm run dev -- analyze "${tempFile}" --risk-level=high`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('DNSweeper CLI');
      expect(stdout).toContain('分析結果サマリー');
      // 高リスク以上のレコードのみ表示されることを確認
      expect(stdout).toContain('高リスク');
    }, 30000);

    it('--risk-level=critical オプションが動作する', async () => {
      const command = `npm run dev -- analyze "${tempFile}" --risk-level=critical`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('DNSweeper CLI');
      expect(stdout).toContain('分析結果サマリー');
      // クリティカルレコードのみ表示されることを確認
      expect(stdout).toContain('クリティカル');
    }, 30000);
  });

  describe('output file functionality', () => {
    const outputFile = path.join(tempDir, 'test-output.csv');

    afterEach(async () => {
      // テスト後にファイルを削除
      try {
        await fs.unlink(outputFile);
      } catch (error) {
        // ファイルが存在しない場合は無視
      }
    });

    it('--output-file オプションが動作する', async () => {
      const command = `npm run dev -- analyze "${tempFile}" --output-file="${outputFile}"`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('DNSweeper CLI');
      expect(stdout).toContain('結果を ' + outputFile + ' に保存しました');
      
      // ファイルが作成されたことを確認
      const fileExists = await fs.access(outputFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      // ファイル内容を確認
      const fileContent = await fs.readFile(outputFile, 'utf-8');
      expect(fileContent).toContain('DNSweeper分析結果 - 月次DNS棚卸し用');
      expect(fileContent).toContain('ドメイン名,レコードタイプ,コンテンツ');
    }, 30000);

    it('--risk-level と --output-file の組み合わせが動作する', async () => {
      const command = `npm run dev -- analyze "${tempFile}" --risk-level=high --output-file="${outputFile}"`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('DNSweeper CLI');
      expect(stdout).toContain('結果を ' + outputFile + ' に保存しました');
      
      // ファイルが作成されたことを確認
      const fileExists = await fs.access(outputFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      // ファイル内容を確認
      const fileContent = await fs.readFile(outputFile, 'utf-8');
      expect(fileContent).toContain('DNSweeper分析結果 - 月次DNS棚卸し用');
      expect(fileContent).toContain('old-api.example.com'); // 高リスクレコード
    }, 30000);

    it('--english と --output-file の組み合わせが動作する', async () => {
      const command = `npm run dev -- analyze "${tempFile}" --english --output-file="${outputFile}"`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('DNSweeper CLI');
      expect(stdout).toContain('Results saved to ' + outputFile);
      
      // ファイルが作成されたことを確認
      const fileExists = await fs.access(outputFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      // ファイル内容を確認（英語版）
      const fileContent = await fs.readFile(outputFile, 'utf-8');
      expect(fileContent).toContain('DNSweeper Analysis Results - Monthly DNS Audit');
      expect(fileContent).toContain('Domain Name,Record Type,Content');
    }, 30000);
  });

  describe('help and version', () => {
    it('--help オプションが動作する', async () => {
      const command = `npm run dev -- --help`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('analyze');
      expect(stdout).toContain('Options:');
    }, 30000);

    it('--version オプションが動作する', async () => {
      const command = `npm run dev -- --version`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('1.0.0');
    }, 30000);
  });

  describe('error handling', () => {
    it('不正なオプションでエラーが発生する', async () => {
      const command = `npm run dev -- analyze "${tempFile}" --invalid-option`;
      
      await expect(execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      })).rejects.toThrow();
    }, 30000);

    it('引数なしでヘルプが表示される', async () => {
      const command = `npm run dev`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('Usage:');
    }, 30000);
  });

  describe('performance', () => {
    it('大量のレコードでも適切な時間で処理される', async () => {
      // 100件のレコードを生成
      const largeCSV = ['Name,Type,Content,TTL,Proxied,Created,Modified'];
      for (let i = 0; i < 100; i++) {
        largeCSV.push(`record${i}.example.com,A,192.168.1.${i % 255},300,false,2023-01-15T10:00:00Z,2024-12-01T15:30:00Z`);
      }
      
      const largeTempFile = path.join(tempDir, 'large-test.csv');
      await fs.writeFile(largeTempFile, largeCSV.join('\n'));

      const startTime = Date.now();
      const command = `npm run dev -- analyze "${largeTempFile}"`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000 
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(stderr).toBe('');
      expect(stdout).toContain('総レコード数: 100');
      expect(executionTime).toBeLessThan(10000); // 10秒以内で完了
    }, 30000);
  });
});