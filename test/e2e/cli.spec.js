"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const testDataPath = path_1.default.join(__dirname, '../../test-data/normal-records-50.csv');
const cliPath = path_1.default.join(__dirname, '../../dist/index.js');
test_1.test.describe('DNSweeper CLI E2E Tests', () => {
    test_1.test.beforeAll(async () => {
        try {
            await promises_1.default.access(cliPath);
        }
        catch {
            throw new Error('CLIがビルドされていません。npm run buildを実行してください。');
        }
    });
    (0, test_1.test)('CSVファイルを正常に解析する', async () => {
        const { stdout, stderr } = await execAsync(`node ${cliPath} analyze ${testDataPath}`);
        (0, test_1.expect)(stderr).toBe('');
        (0, test_1.expect)(stdout).toContain('解析完了');
        (0, test_1.expect)(stdout).toContain('リスクレベル別統計');
        (0, test_1.expect)(stdout).toContain('推奨アクション');
    });
    (0, test_1.test)('--json オプションでJSON出力する', async () => {
        const { stdout, stderr } = await execAsync(`node ${cliPath} analyze ${testDataPath} --json`);
        (0, test_1.expect)(stderr).toBe('');
        const result = JSON.parse(stdout);
        (0, test_1.expect)(result).toHaveProperty('summary');
        (0, test_1.expect)(result).toHaveProperty('records');
        (0, test_1.expect)(result.summary).toHaveProperty('totalRecords');
        (0, test_1.expect)(result.summary).toHaveProperty('riskLevels');
    });
    (0, test_1.test)('--output オプションでファイル出力する', async () => {
        const outputPath = path_1.default.join(__dirname, '../../test-output.csv');
        try {
            const { stdout, stderr } = await execAsync(`node ${cliPath} analyze ${testDataPath} --output csv --output-file ${outputPath}`);
            (0, test_1.expect)(stderr).toBe('');
            (0, test_1.expect)(stdout).toContain('結果をファイルに出力しました');
            const fileContent = await promises_1.default.readFile(outputPath, 'utf-8');
            (0, test_1.expect)(fileContent).toContain('Name,Type,Content,Risk Level,Risk Score');
        }
        finally {
            try {
                await promises_1.default.unlink(outputPath);
            }
            catch {
            }
        }
    });
    (0, test_1.test)('--risk-level オプションでフィルタリングする', async () => {
        const { stdout } = await execAsync(`node ${cliPath} analyze ${testDataPath} --risk-level high`);
        (0, test_1.expect)(stdout).toContain('リスクレベル: high 以上');
        (0, test_1.expect)(stdout).not.toContain('low:');
    });
    (0, test_1.test)('--provider オプションで特定プロバイダーを指定する', async () => {
        const { stdout } = await execAsync(`node ${cliPath} analyze ${testDataPath} --provider cloudflare`);
        (0, test_1.expect)(stdout).toContain('プロバイダー: cloudflare');
    });
    (0, test_1.test)('存在しないファイルでエラーを表示する', async () => {
        try {
            await execAsync(`node ${cliPath} analyze non-existent-file.csv`);
            (0, test_1.expect)(true).toBe(false);
        }
        catch (error) {
            (0, test_1.expect)(error.stderr).toContain('Error');
            (0, test_1.expect)(error.code).not.toBe(0);
        }
    });
    (0, test_1.test)('--help オプションでヘルプを表示する', async () => {
        const { stdout } = await execAsync(`node ${cliPath} --help`);
        (0, test_1.expect)(stdout).toContain('dnssweeper');
        (0, test_1.expect)(stdout).toContain('analyze');
        (0, test_1.expect)(stdout).toContain('Options:');
    });
    (0, test_1.test)('--version オプションでバージョンを表示する', async () => {
        const { stdout } = await execAsync(`node ${cliPath} --version`);
        (0, test_1.expect)(stdout).toMatch(/\d+\.\d+\.\d+/);
    });
});
//# sourceMappingURL=cli.spec.js.map