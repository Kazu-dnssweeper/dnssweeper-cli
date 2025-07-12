#!/usr/bin/env node

/**
 * 承認待ちキューの確認スクリプト
 * /dzqコマンドの簡易版
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// 進捗ファイルのパス
const progressDir = path.join(process.cwd(), '.dnssweeper');
const progressFile = path.join(progressDir, 'autonomous.progress.json');

// メイン処理
async function main() {
  console.log(chalk.bold.blue('\n📋 DNSweeper 承認待ちキュー管理\n'));

  // 進捗ファイルの存在確認
  if (!fs.existsSync(progressFile)) {
    console.log(chalk.yellow('⚠️  進捗ファイルが見つかりません'));
    console.log(chalk.gray('   自律モードを一度実行してください: npm run dza'));
    console.log();
    return;
  }

  try {
    // 進捗データの読み込み
    const progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    const queue = progressData.approvalQueue || [];

    console.log(`承認待ちタスク: ${chalk.bold(queue.length)}件\n`);

    if (queue.length === 0) {
      console.log(chalk.gray('承認待ちのタスクはありません'));
      return;
    }

    // リスクレベル別に集計
    const riskGroups = {
      low: queue.filter(t => t.riskLevel === 'low'),
      medium: queue.filter(t => t.riskLevel === 'medium'),
      high: queue.filter(t => t.riskLevel === 'high')
    };

    console.log(`🟢 低リスク: ${riskGroups.low.length}件`);
    console.log(`🟡 中リスク: ${riskGroups.medium.length}件`);
    console.log(`🔴 高リスク: ${riskGroups.high.length}件\n`);

    // タスク一覧表示
    console.log(chalk.bold('タスク一覧:'));
    queue.forEach((task, index) => {
      const riskIcon = task.riskLevel === 'high' ? '🔴' : 
                       task.riskLevel === 'medium' ? '🟡' : '🟢';
      
      console.log(`\n${index + 1}. ${riskIcon} [${task.riskLevel}] ${task.taskId || task.id}`);
      console.log(`   ${chalk.gray('理由:')} ${task.reason || task.description}`);
      console.log(`   ${chalk.gray('時刻:')} ${new Date(task.timestamp || task.createdAt).toLocaleString()}`);
    });

    // 操作オプション
    console.log(chalk.bold.yellow('\n\n💡 操作方法:'));
    console.log(chalk.gray('  すべて承認: npm run dzq -- --approve-all'));
    console.log(chalk.gray('  低リスクのみ承認: npm run dzq -- --approve-low'));
    console.log(chalk.gray('  すべて却下: npm run dzq -- --reject-all'));

  } catch (error) {
    console.error(chalk.red('エラー:'), error.message);
  }
}

// 実行
main().catch(console.error);