#!/usr/bin/env node

/**
 * DNSweeper CLI - メインエントリーポイント
 * 未使用DNSレコードの検出・分析ツール
 */

import { program } from 'commander';
import chalk from 'chalk';
import { analyzeCommand } from './commands/analyze';
import { analyzeStreamCommand } from './commands/analyzeStream';
import { analyzeStreamOptimizedCommand } from './commands/analyzeStreamOptimized';

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
      .argument('<files...>', 'DNSプロバイダーからエクスポートしたCSVファイル（複数指定可能）')
      .option('-o, --output <format>', '出力形式 (table, json, csv)', 'table')
      .option('-e, --english', '英語で出力')
      .option('-v, --verbose', '詳細な出力')
      .option('-r, --risk-level <level>', '指定リスクレベル以上のレコードのみ表示 (critical, high, medium, low)')
      .option('-f, --output-file <file>', '分析結果を運用フロー対応CSVファイルに出力（月次DNS棚卸し用）')
      .option('-p, --patterns <file>', 'カスタムパターンファイルを指定（JSON形式）')
      .option('--provider <name>', 'DNSプロバイダーを指定 (cloudflare, route53, google-cloud, azure, onamae)')
      .option('-s, --stream', '大規模ファイル用ストリーミングモード（メモリ効率的）')
      .option('--chunk-size <size>', 'ストリーミング時のチャンクサイズ（デフォルト: 1000）', parseInt)
      .option('--memory-limit <mb>', 'メモリ使用量制限（MB）（デフォルト: 100）', parseInt)
      .action(async (files, options) => {
        // ストリーミングモードの判定
        if (options.stream) {
          // メモリ制限が設定されている場合は最適化版を使用
          if (options.memoryLimit && options.memoryLimit < 200) {
            await analyzeStreamOptimizedCommand(files, options);
          } else {
            await analyzeStreamCommand(files, options);
          }
        } else {
          await analyzeCommand(files, options);
        }
      });

    // 引数なしで実行された場合、ヘルプを表示して正常終了
    if (process.argv.length === 2) {
      program.outputHelp();
      process.exit(0);
    }
    
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