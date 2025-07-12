/**
 * DNSweeper 完全自律モードコマンド
 * 24時間自動開発システムのエントリーポイント
 */

import chalk from 'chalk';
import { AutonomousMode } from '../autonomous/AutonomousMode';
import { ContinuousExecutionMode } from '../autonomous/ContinuousExecutionMode';

// コマンドオプション型定義
export interface IAutonomousOptions {
  risk?: string;
  focus?: string;
  duration?: string;
  queueLimit?: number;
  resume?: boolean;
  continuous?: boolean;
  maxCycles?: number;
}

/**
 * 自律モードコマンドの実行
 */
export async function autonomousCommand(options: IAutonomousOptions): Promise<void> {
  try {
    console.log(chalk.cyan(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 DNSweeper 完全自律モード
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

このモードでは、AIが自動的に開発タスクを選択・実行します。
承認待ちタスクは自動的にキューに保存され、別のタスクに切り替えます。

⚠️  注意: 実行中はCtrl+Cでいつでも中断できます（進捗は自動保存されます）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `));

    // オプションの検証
    const validRiskLevels = ['low', 'medium', 'high'];
    if (options.risk && !validRiskLevels.includes(options.risk)) {
      throw new Error(`無効なリスクレベル: ${options.risk}。有効な値: ${validRiskLevels.join(', ')}`);
    }

    const validFocusAreas = ['testing', 'documentation', 'bugfix', 'feature', 'performance'];
    if (options.focus && !validFocusAreas.includes(options.focus)) {
      throw new Error(`無効なフォーカスエリア: ${options.focus}。有効な値: ${validFocusAreas.join(', ')}`);
    }

    // 自律モードのオプション設定
    const autonomousOptions = {
      riskLevel: options.risk as 'low' | 'medium' | 'high' | undefined,
      focusArea: options.focus as 'testing' | 'documentation' | 'bugfix' | 'feature' | 'performance' | undefined,
      maxDuration: options.duration,
      approvalQueueLimit: options.queueLimit,
      resume: options.resume
    };

    // 連続実行モードかチェック
    if (options.continuous) {
      // 連続実行モードの設定
      const continuousOptions = {
        ...autonomousOptions,
        maxCycles: options.maxCycles,
        pauseBetweenCycles: 2000, // 2秒間隔
        avoidRecentTasks: 3 // 最近3つのタスクを避ける
      };

      console.log(chalk.blue('🔄 連続実行モードで開始します...'));
      
      // 連続実行モードの開始
      const continuousMode = new ContinuousExecutionMode(continuousOptions);
      await continuousMode.start();
      
    } else {
      // 通常の自律モードの開始
      const autonomousMode = new AutonomousMode(autonomousOptions);
      
      // シグナルハンドラーの設定
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n\n⏸️ 中断を検出しました。進捗を保存中...'));
        await autonomousMode.stop('manual');
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log(chalk.yellow('\n\n⏹️ 終了シグナルを受信しました。進捗を保存中...'));
        await autonomousMode.stop('manual');
        process.exit(0);
      });

      // 自律モード実行
      await autonomousMode.start();
    }

    console.log(chalk.green('\n✅ 自律モードが正常に終了しました'));

  } catch (error) {
    console.error(chalk.red('\n❌ エラー:', error instanceof Error ? error.message : String(error)));
    
    if (error instanceof Error && error.stack) {
      console.error(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

/**
 * 承認待ちキュー管理コマンド
 */
export async function queueCommand(options: any): Promise<void> {
  try {
    const { ProgressManager } = await import('../autonomous/ProgressManager');
    const progressManager = new ProgressManager();
    await progressManager.initialize();
    
    const queue = progressManager.currentProgress?.approvalQueue || [];
    
    console.log(chalk.cyan(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 承認待ちキュー管理
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `));

    if (options.list || Object.keys(options).length === 0) {
      console.log(`総タスク数: ${queue.length}件\n`);
      
      if (queue.length > 0) {
        const riskGroups = {
          low: queue.filter(t => t.riskLevel === 'low'),
          medium: queue.filter(t => t.riskLevel === 'medium'),
          high: queue.filter(t => t.riskLevel === 'high')
        };
        
        console.log(chalk.green(`🟢 低リスク: ${riskGroups.low.length}件`));
        console.log(chalk.yellow(`🟡 中リスク: ${riskGroups.medium.length}件`));
        console.log(chalk.red(`🔴 高リスク: ${riskGroups.high.length}件\n`));
        
        console.log('タスク一覧:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        queue.forEach((task, index) => {
          const riskColor = task.riskLevel === 'high' ? chalk.red : 
                           task.riskLevel === 'medium' ? chalk.yellow : 
                           chalk.green;
          
          console.log(`${chalk.bold(`#${index + 1}`)} ${riskColor(`[${task.riskLevel.toUpperCase()}]`)} ${chalk.cyan(task.taskId)}`);
          console.log(`   📝 理由: ${task.reason}`);
          console.log(`   🕐 時刻: ${new Date(task.timestamp).toLocaleString()}`);
          
          if (task.context?.expectedChanges && task.context.expectedChanges.length > 0) {
            console.log(`   📄 予想される変更:`);
            task.context.expectedChanges.forEach((change: string) => {
              console.log(`      - ${change}`);
            });
          }
          
          console.log('');
        });
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(chalk.gray('操作オプション:'));
        console.log(chalk.gray('  --approve-all : すべてのタスクを承認'));
        console.log(chalk.gray('  --approve-low : 低リスクタスクのみ承認'));
        console.log(chalk.gray('  --reject-all  : すべてのタスクを却下'));
        console.log(chalk.gray('  --clear       : キューをクリア'));
        
      } else {
        console.log(chalk.green('✅ 承認待ちタスクはありません'));
      }
      
    } else if (options.approveAll) {
      if (queue.length === 0) {
        console.log(chalk.yellow('⚠️ 承認するタスクがありません'));
      } else {
        console.log(chalk.green(`✅ ${queue.length}件のタスクを承認しました`));
        if (progressManager.currentProgress) {
          progressManager.currentProgress.approvalQueue = [];
        }
        await progressManager.saveProgress();
      }
      
    } else if (options.approveLow) {
      const lowRiskTasks = queue.filter(t => t.riskLevel === 'low');
      if (lowRiskTasks.length === 0) {
        console.log(chalk.yellow('⚠️ 低リスクタスクがありません'));
      } else {
        console.log(chalk.green(`✅ 低リスクタスク ${lowRiskTasks.length}件を承認しました`));
        if (progressManager.currentProgress) {
          progressManager.currentProgress.approvalQueue = queue.filter(t => t.riskLevel !== 'low');
        }
        await progressManager.saveProgress();
      }
      
    } else if (options.rejectAll || options.clear) {
      if (queue.length === 0) {
        console.log(chalk.yellow('⚠️ 却下/クリアするタスクがありません'));
      } else {
        console.log(chalk.red(`❌ ${queue.length}件のタスクを却下/クリアしました`));
        if (progressManager.currentProgress) {
          progressManager.currentProgress.approvalQueue = [];
        }
        await progressManager.saveProgress();
      }
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ エラー:', error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}