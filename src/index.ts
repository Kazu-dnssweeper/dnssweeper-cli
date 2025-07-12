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
import { analyzeStreamEnhancedCommand } from './commands/analyzeStreamEnhanced';
import { analyzeDistributedCommand } from './commands/analyzeDistributed';
import { autonomousCommand } from './commands/autonomous';

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
      .option('--enhanced', '強化ストリーミングモード（非同期パイプライン、適応的チャンク）')
      .option('--adaptive-chunking', '適応的チャンクサイズを有効化')
      .option('--parallelism <n>', '並列処理数（デフォルト: 3）', parseInt)
      .option('--enable-metrics', 'パフォーマンスメトリクスを表示')
      .option('--distributed', '分散処理モード（10GB以上のファイル用）')
      .option('--workers <n>', 'ワーカースレッド数（デフォルト: CPUコア数-1）', parseInt)
      .action(async (files, options) => {
        // 分散処理モードの判定
        if (options.distributed) {
          await analyzeDistributedCommand(files, {
            ...options,
            showMetrics: options.enableMetrics,
          });
        }
        // ストリーミングモードの判定
        else if (options.stream || options.enhanced) {
          // 強化ストリーミングモード
          if (options.enhanced) {
            await analyzeStreamEnhancedCommand(files, options);
          }
          // メモリ制限が設定されている場合は最適化版を使用
          else if (options.memoryLimit && options.memoryLimit < 200) {
            await analyzeStreamOptimizedCommand(files, options);
          } else {
            await analyzeStreamCommand(files, options);
          }
        } else {
          await analyzeCommand(files, options);
        }
      });

    // dzaコマンドの追加 - 完全自律モード
    program
      .command('dza')
      .description('🤖 完全自律モード - 24時間自動開発システム')
      .option('-r, --risk <level>', 'リスクレベル (low, medium, high)', 'medium')
      .option('-f, --focus <area>', 'フォーカスエリア (testing, documentation, bugfix, feature, performance)')
      .option('-d, --duration <time>', '最大実行時間 (例: 4h, 30m)', '24h')
      .option('-q, --queue-limit <number>', '承認待ちキューの上限', parseInt, 50)
      .option('--no-resume', '前回のセッションを復旧せずに新規開始')
      .option('-c, --continuous', '🔄 連続実行モード: タスク完了後も自動的に次のタスクを選択・実行')
      .option('--max-cycles <number>', '最大サイクル数（デフォルト: 無制限）', parseInt)
      .action(async (options) => {
        await autonomousCommand(options);
      });

    // dzqコマンドの追加 - 承認待ちキュー管理
    program
      .command('dzq')
      .description('📋 承認待ちキュー管理 - タスクの一括承認/却下')
      .option('-l, --list', 'キュー内のタスクを一覧表示')
      .option('-a, --approve-all', 'すべてのタスクを承認')
      .option('-r, --reject-all', 'すべてのタスクを却下')
      .option('--approve-low', '低リスクタスクのみ承認')
      .option('--clear', 'キューをクリア')
      .action(async (options) => {
        // 簡易実装 - 実際はautonomousCommandから分離
        const { ProgressManager } = await import('./autonomous/ProgressManager');
        const progressManager = new ProgressManager();
        await progressManager.initialize();
        
        const queue = progressManager.currentProgress?.approvalQueue || [];
        
        if (options.list || Object.keys(options).length === 0) {
          console.log(`\n📋 承認待ちタスク: ${queue.length}件\n`);
          
          if (queue.length > 0) {
            const riskGroups = {
              low: queue.filter(t => t.riskLevel === 'low'),
              medium: queue.filter(t => t.riskLevel === 'medium'),
              high: queue.filter(t => t.riskLevel === 'high')
            };
            
            console.log(`🟢 低リスク: ${riskGroups.low.length}件`);
            console.log(`🟡 中リスク: ${riskGroups.medium.length}件`);
            console.log(`🔴 高リスク: ${riskGroups.high.length}件\n`);
            
            console.log('タスク一覧:');
            queue.forEach((task, index) => {
              console.log(`${index + 1}. [${task.riskLevel}] ${task.taskId}`);
              console.log(`   理由: ${task.reason}`);
              console.log(`   時刻: ${new Date(task.timestamp).toLocaleString()}\n`);
            });
          }
        } else if (options.approveAll) {
          console.log(`✅ ${queue.length}件のタスクを承認しました`);
          if (progressManager.currentProgress) {
            progressManager.currentProgress.approvalQueue = [];
          }
          await progressManager.saveProgress();
        } else if (options.approveLow) {
          const lowRiskTasks = queue.filter(t => t.riskLevel === 'low');
          console.log(`✅ 低リスクタスク ${lowRiskTasks.length}件を承認しました`);
          if (progressManager.currentProgress) {
            progressManager.currentProgress.approvalQueue = queue.filter(t => t.riskLevel !== 'low');
          }
          await progressManager.saveProgress();
        } else if (options.rejectAll || options.clear) {
          console.log(`❌ ${queue.length}件のタスクを却下/クリアしました`);
          if (progressManager.currentProgress) {
            progressManager.currentProgress.approvalQueue = [];
          }
          await progressManager.saveProgress();
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