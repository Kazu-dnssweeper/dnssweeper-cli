#!/usr/bin/env node

/**
 * DNSweeper CLI - メインエントリーポイント
 * 未使用DNSレコードの検出・分析ツール
 */

import { program } from 'commander';
import chalk from 'chalk';
import { analyzeCommand } from './commands/analyze';

// バージョン情報
const packageJson = require('../package.json');

// メイン関数
async function main(): Promise<void> {
  try {
    // コマンドライン設定
    program
      .name('dnssweeper')
      .description('未使用DNSレコードの検出・分析ツール')
      .version(packageJson.version);

    // analyzeコマンドの追加
    program
      .command('analyze')
      .description('CSVファイルを分析して未使用DNSレコードを検出')
      .argument('<file>', 'CloudflareからエクスポートしたCSVファイル')
      .option('-o, --output <format>', '出力形式 (table, json, csv)', 'table')
      .option('-e, --english', '英語で出力')
      .option('-v, --verbose', '詳細な出力')
      .option('-r, --risk-level <level>', '指定リスクレベル以上のレコードのみ表示 (critical, high, medium, low)')
      .option('-f, --output-file <file>', '分析結果を運用フロー対応CSVファイルに出力（月次DNS棚卸し用）')
      .action(analyzeCommand);

    // コマンドラインの解析と実行
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('エラー:', error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみmain関数を実行
if (require.main === module) {
  main();
}

export { main };