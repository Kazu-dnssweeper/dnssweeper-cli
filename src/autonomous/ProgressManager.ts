/**
 * 自律モード進捗管理システム
 * Esc押下時の自動保存と復旧機能を提供
 */

import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

// 進捗データの型定義
export interface IAutonomousProgress {
  sessionId: string;
  mode: 'autonomous';
  startTime: Date;
  lastSaveTime: Date;
  currentTask: ICurrentTask;
  phase: IExecutionPhase;
  progress: number;
  partialResults: IPartialResults;
  approvalQueue: IApprovalTask[];
  nextPlannedTasks: IPlannedTask[];
  executionHistory: IExecutionRecord[];
  statistics: IExecutionStatistics;
}

export interface ICurrentTask {
  id: string;
  title: string;
  description: string;
  category: 'investigation' | 'planning' | 'implementation' | 'testing';
  riskLevel: 'low' | 'medium' | 'high';
  startTime: Date;
  estimatedDuration: number;
  actualDuration?: number;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed';
}

export interface IExecutionPhase {
  current: 'investigate' | 'plan' | 'implement' | 'test';
  completed: string[];
  remaining: string[];
  phaseProgress: Record<string, number>;
  checkpoints: ICheckpoint[];
}

export interface IPartialResults {
  investigation?: {
    codeAnalysis: any;
    dependencies: string[];
    riskAssessment: any;
    recommendations: string[];
  };
  planning?: {
    approach: string;
    steps: string[];
    estimatedChanges: string[];
    riskMitigation: string[];
  };
  implementation?: {
    filesModified: string[];
    codeChanges: any[];
    testsAdded: string[];
    configChanges: any[];
  };
  testing?: {
    testResults: any;
    coverage: number;
    failedTests: string[];
    performanceMetrics: any;
  };
}

export interface IApprovalTask {
  id: string;
  taskId: string;
  command: string;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: Date;
  context: {
    reason: string;
    parentTask: string;
    riskLevel: 'low' | 'medium' | 'high';
    expectedChanges: string[];
    workingDirectory: string;
    timestamp: Date;
  };
  dependencies: string[];
}

export interface IPlannedTask {
  id: string;
  title: string;
  priority: number;
  estimatedDuration: number;
  dependencies: string[];
  category: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ICheckpoint {
  id: string;
  timestamp: Date;
  phase: string;
  progress: number;
  state: any;
  rollbackData: any;
}

export interface IExecutionRecord {
  timestamp: Date;
  action: string;
  result: 'success' | 'failure' | 'skipped';
  duration: number;
  details: any;
}

export interface IExecutionStatistics {
  totalTasksCompleted: number;
  totalTasks: number;
  successCount: number;
  errorCount: number;
  totalExecutionTime: number;
  totalDuration: number;
  successRate: number;
  averageTaskDuration: number;
  phaseDistribution: Record<string, number>;
  riskLevelDistribution: Record<string, number>;
}

/**
 * 進捗管理クラス
 */
export class ProgressManager extends EventEmitter {
  private readonly progressFile: string;
  private readonly backupDir: string;
  private readonly checkpointInterval: number;
  public currentProgress: IAutonomousProgress | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor() {
    super();
    this.progressFile = path.join(process.cwd(), '.dza', 'progress.json');
    this.backupDir = path.join(process.cwd(), '.dza', 'backups');
    this.checkpointInterval = 5 * 60 * 1000; // 5分間隔
    
    this.setupShutdownHandlers();
    this.setupAutoSave();
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    // ディレクトリ作成
    await fs.mkdir(path.dirname(this.progressFile), { recursive: true });
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  /**
   * 新しい自律セッションを開始
   */
  async startNewSession(initialTask: ICurrentTask): Promise<string> {
    const sessionId = this.generateSessionId();
    
    this.currentProgress = {
      sessionId,
      mode: 'autonomous',
      startTime: new Date(),
      lastSaveTime: new Date(),
      currentTask: initialTask,
      phase: {
        current: 'investigate',
        completed: [],
        remaining: ['investigate', 'plan', 'implement', 'test'],
        phaseProgress: {
          investigate: 0,
          plan: 0,
          implement: 0,
          test: 0
        },
        checkpoints: []
      },
      progress: 0,
      partialResults: {},
      approvalQueue: [],
      nextPlannedTasks: [],
      executionHistory: [],
      statistics: {
        totalTasksCompleted: 0,
        totalTasks: 0,
        successCount: 0,
        errorCount: 0,
        totalExecutionTime: 0,
        totalDuration: 0,
        successRate: 0,
        averageTaskDuration: 0,
        phaseDistribution: {},
        riskLevelDistribution: {}
      }
    };

    await this.saveProgress();
    console.log(`✅ 新しい自律セッションを開始: ${sessionId}`);
    
    return sessionId;
  }

  /**
   * 既存セッションの復旧
   */
  async resumeSession(): Promise<boolean> {
    try {
      const savedProgress = await this.loadSavedProgress();
      
      if (!savedProgress) {
        return false;
      }

      console.log(`
♻️ 前回の自律モードセッションを検出
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 セッションID: ${savedProgress.sessionId}
📋 中断地点: ${savedProgress.currentTask.title}
🎯 現在のフェーズ: ${savedProgress.phase.current} (${savedProgress.progress}%)
⏰ 中断時刻: ${savedProgress.lastSaveTime}
⏸️ 承認待ち: ${savedProgress.approvalQueue.length}件
📊 実行履歴: ${savedProgress.executionHistory.length}件

続きから再開しますか？ [Y/n]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);

      // 実際の実装では、ここでユーザー入力を待つ
      // const confirmed = await this.promptForConfirmation();
      
      this.currentProgress = savedProgress;
      await this.createRestoreCheckpoint();
      
      console.log('✅ セッションを復旧しました');
      return true;
      
    } catch (error) {
      console.error('❌ セッション復旧に失敗:', error);
      return false;
    }
  }

  /**
   * 進捗の保存
   */
  async saveProgress(): Promise<void> {
    if (!this.currentProgress || this.isShuttingDown) {
      return;
    }

    try {
      // バックアップディレクトリを作成
      await fs.mkdir(this.backupDir, { recursive: true });
      
      // 現在の進捗を更新
      this.currentProgress.lastSaveTime = new Date();
      
      // メインファイルに保存
      await fs.writeFile(
        this.progressFile,
        JSON.stringify(this.currentProgress, null, 2),
        'utf8'
      );
      
      // バックアップも作成
      const backupFile = path.join(
        this.backupDir,
        `progress-${this.currentProgress.sessionId}-${Date.now()}.json`
      );
      await fs.writeFile(
        backupFile,
        JSON.stringify(this.currentProgress, null, 2),
        'utf8'
      );

      this.emit('progress-saved', this.currentProgress);
      
    } catch (error) {
      console.error('❌ 進捗保存に失敗:', error);
      this.emit('save-error', error);
    }
  }

  /**
   * 保存された進捗の読み込み
   */
  async loadSavedProgress(): Promise<IAutonomousProgress | null> {
    try {
      const data = await fs.readFile(this.progressFile, 'utf8');
      return JSON.parse(data) as IAutonomousProgress;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null; // ファイルが存在しない
      }
      throw error;
    }
  }

  /**
   * チェックポイントの作成
   */
  async createCheckpoint(phase: string, state: any): Promise<void> {
    if (!this.currentProgress) {return;}

    const checkpoint: ICheckpoint = {
      id: this.generateCheckpointId(),
      timestamp: new Date(),
      phase,
      progress: this.currentProgress.progress,
      state,
      rollbackData: await this.createRollbackData()
    };

    this.currentProgress.phase.checkpoints.push(checkpoint);
    
    // チェックポイント数を制限（最新10件のみ保持）
    if (this.currentProgress.phase.checkpoints.length > 10) {
      this.currentProgress.phase.checkpoints = 
        this.currentProgress.phase.checkpoints.slice(-10);
    }

    await this.saveProgress();
    console.log(`📍 チェックポイント作成: ${checkpoint.id}`);
  }

  /**
   * フェーズの進捗更新
   */
  async updatePhaseProgress(phase: string, progress: number): Promise<void> {
    if (!this.currentProgress) {return;}

    this.currentProgress.phase.phaseProgress[phase] = progress;
    
    // 全体の進捗を計算
    const phases = ['investigate', 'plan', 'implement', 'test'];
    const totalProgress = phases.reduce((sum, p) => 
      sum + (this.currentProgress!.phase.phaseProgress[p] || 0), 0
    ) / phases.length;
    
    this.currentProgress.progress = totalProgress;
    
    await this.saveProgress();
    this.emit('phase-progress-updated', { phase, progress, totalProgress });
  }

  /**
   * フェーズの完了
   */
  async completePhase(phase: string): Promise<void> {
    if (!this.currentProgress) {return;}

    this.currentProgress.phase.completed.push(phase);
    this.currentProgress.phase.remaining = 
      this.currentProgress.phase.remaining.filter(p => p !== phase);
    this.currentProgress.phase.phaseProgress[phase] = 100;

    // 次のフェーズに移行
    const nextPhase = this.getNextPhase(phase);
    if (nextPhase) {
      this.currentProgress.phase.current = nextPhase;
    }

    await this.saveProgress();
    console.log(`✅ フェーズ完了: ${phase}`);
    
    if (nextPhase) {
      console.log(`🔄 次のフェーズに移行: ${nextPhase}`);
    }
  }

  /**
   * 承認待ちタスクの追加
   */
  async addToApprovalQueue(task: IApprovalTask): Promise<void> {
    if (!this.currentProgress) {return;}

    this.currentProgress.approvalQueue.push(task);
    await this.saveProgress();
    
    console.log(`📝 承認待ちキューに追加: ${task.command}`);
    this.emit('approval-task-added', task);
  }

  /**
   * 現在のタスクを更新
   */
  async updateCurrentTask(task: ICurrentTask): Promise<void> {
    if (!this.currentProgress) {return;}
    
    this.currentProgress.currentTask = task;
    await this.saveProgress();
    
    this.emit('task-updated', task);
  }

  /**
   * 実行記録の追加
   */
  async addExecutionRecord(record: IExecutionRecord): Promise<void> {
    if (!this.currentProgress) {return;}

    this.currentProgress.executionHistory.push(record);
    
    // 履歴を制限（最新1000件のみ保持）
    if (this.currentProgress.executionHistory.length > 1000) {
      this.currentProgress.executionHistory = 
        this.currentProgress.executionHistory.slice(-1000);
    }

    await this.updateStatistics();
    await this.saveProgress();
  }

  /**
   * セッション終了時の処理
   */
  async endSession(reason: 'completed' | 'interrupted' | 'error'): Promise<void> {
    if (!this.currentProgress) {return;}

    console.log(`
📊 自律セッション終了: ${this.currentProgress.sessionId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ 実行時間: ${this.formatDuration(Date.now() - this.currentProgress.startTime.getTime())}
📋 完了タスク: ${this.currentProgress.statistics.totalTasksCompleted}件
📊 成功率: ${(this.currentProgress.statistics.successRate * 100).toFixed(1)}%
⏸️ 承認待ち: ${this.currentProgress.approvalQueue.length}件
🎯 最終フェーズ: ${this.currentProgress.phase.current}
📍 最終進捗: ${this.currentProgress.progress.toFixed(1)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // 最終保存
    await this.saveProgress();
    
    // セッション完了の場合は進捗ファイルを削除
    if (reason === 'completed') {
      await this.cleanupCompletedSession();
    }

    this.emit('session-ended', { reason, progress: this.currentProgress });
  }

  /**
   * シャットダウンハンドラーの設定
   */
  private setupShutdownHandlers(): void {
    const handleShutdown = async (signal: string) => {
      if (this.isShuttingDown) {return;}
      this.isShuttingDown = true;

      console.log(`\n⏸️ ${signal}を検出しました...`);
      
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
      }

      if (this.currentProgress) {
        console.log('💾 進捗を保存中...');
        await this.saveProgress();
        
        console.log('✅ 進捗を保存しました');
        console.log(`📋 承認待ち: ${this.currentProgress.approvalQueue.length}件`);
        console.log('💡 次回起動時に自動的に続きから再開できます');
        
        // きりの良いところで中断
        if (this.isInMiddleOfOperation()) {
          console.log('⏳ 処理を完了してから終了します...');
          await this.waitForSafePoint();
        }
      }

      process.exit(0);
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    
    // Windowsの場合
    if (process.platform === 'win32') {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.on('SIGINT', () => handleShutdown('SIGINT'));
    }
  }

  /**
   * 自動保存の設定
   */
  private setupAutoSave(): void {
    this.autoSaveTimer = setInterval(async () => {
      if (this.currentProgress && !this.isShuttingDown) {
        await this.saveProgress();
      }
    }, this.checkpointInterval);
  }

  /**
   * 統計情報の更新
   */
  private async updateStatistics(): Promise<void> {
    if (!this.currentProgress) {return;}

    const history = this.currentProgress.executionHistory;
    const stats = this.currentProgress.statistics;

    stats.totalTasksCompleted = history.filter(r => r.result === 'success').length;
    stats.totalExecutionTime = history.reduce((sum, r) => sum + r.duration, 0);
    stats.successRate = history.length > 0 
      ? history.filter(r => r.result === 'success').length / history.length 
      : 0;
    stats.averageTaskDuration = history.length > 0
      ? stats.totalExecutionTime / history.length
      : 0;
  }

  /**
   * ユーティリティメソッド
   */
  private generateSessionId(): string {
    return `dza-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCheckpointId(): string {
    return `cp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  private getNextPhase(currentPhase: string): 'investigate' | 'plan' | 'implement' | 'test' | null {
    const phases: ('investigate' | 'plan' | 'implement' | 'test')[] = ['investigate', 'plan', 'implement', 'test'];
    const currentIndex = phases.indexOf(currentPhase as any);
    return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;
  }

  private formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}時間${minutes}分`;
  }

  private isInMiddleOfOperation(): boolean {
    // 実装: 現在重要な処理中かどうかを判定
    return false;
  }

  private async waitForSafePoint(): Promise<void> {
    // 実装: 安全な中断ポイントまで待機
    return Promise.resolve();
  }

  private async createRollbackData(): Promise<any> {
    // 実装: ロールバック用データの作成
    return {};
  }

  private async createRestoreCheckpoint(): Promise<void> {
    // 実装: 復旧時のチェックポイント作成
  }

  private async cleanupCompletedSession(): Promise<void> {
    try {
      await fs.unlink(this.progressFile);
      console.log('🗑️ 完了したセッションファイルを削除しました');
    } catch (error) {
      console.warn('⚠️ セッションファイルの削除に失敗:', error);
    }
  }
}