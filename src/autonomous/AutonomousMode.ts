/**
 * DNSweeper Autonomous Mode
 * 24時間無限タスク実行システム
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * タスクの状態
 */
export enum TaskState {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  SKIPPED = 'skipped'
}

/**
 * タスクの優先度
 */
export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * タスクインターフェース
 */
export interface Task {
  id: string;
  name: string;
  description: string;
  state: TaskState;
  priority: TaskPriority;
  dependencies?: string[];
  action: () => Promise<void>;
  retryCount?: number;
  maxRetries?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: Error;
}

/**
 * タスクチェーンインターフェース
 */
export interface TaskChain {
  id: string;
  name: string;
  tasks: Task[];
  currentIndex: number;
  state: TaskState;
  metadata?: Record<string, any>;
}

/**
 * システム状態
 */
export interface SystemState {
  mode: 'morning' | 'afternoon' | 'evening' | 'night';
  startTime: Date;
  tasksCompleted: number;
  tasksFailed: number;
  memoryUsage: number;
  cpuUsage: number;
  lastHealthCheck: Date;
  isHealthy: boolean;
}

/**
 * 実行オプション
 */
export interface AutonomousOptions {
  maxConcurrentTasks?: number;
  memoryThreshold?: number;
  cpuThreshold?: number;
  healthCheckInterval?: number;
  taskTimeout?: number;
  enableLogging?: boolean;
  logPath?: string;
  hooks?: {
    beforeTask?: (task: Task) => Promise<void>;
    afterTask?: (task: Task) => Promise<void>;
    onError?: (error: Error, task: Task) => Promise<void>;
    onStateChange?: (oldState: SystemState, newState: SystemState) => Promise<void>;
  };
}

/**
 * DNSweeper Autonomous Mode 実装
 */
export class AutonomousMode extends EventEmitter {
  private taskQueue: Task[] = [];
  private activeChains: Map<string, TaskChain> = new Map();
  private systemState: SystemState;
  private options: Required<AutonomousOptions>;
  private isRunning: boolean = false;
  private healthCheckTimer?: NodeJS.Timeout;
  private executionHistory: Array<{
    taskId: string;
    timestamp: Date;
    duration: number;
    success: boolean;
    error?: string;
  }> = [];

  constructor(options: AutonomousOptions = {}) {
    super();
    this.options = {
      maxConcurrentTasks: options.maxConcurrentTasks || 3,
      memoryThreshold: options.memoryThreshold || 80,
      cpuThreshold: options.cpuThreshold || 70,
      healthCheckInterval: options.healthCheckInterval || 60000,
      taskTimeout: options.taskTimeout || 300000,
      enableLogging: options.enableLogging ?? true,
      logPath: options.logPath || '.dza/logs',
      hooks: options.hooks || {}
    };

    this.systemState = {
      mode: this.getCurrentMode(),
      startTime: new Date(),
      tasksCompleted: 0,
      tasksFailed: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      lastHealthCheck: new Date(),
      isHealthy: true
    };
  }

  /**
   * 自律モードを開始
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Autonomous mode is already running');
    }

    this.isRunning = true;
    this.log('🚀 DNSweeper Autonomous Mode 起動');
    
    // ログディレクトリの作成
    if (this.options.enableLogging) {
      await this.ensureLogDirectory();
    }

    // ヘルスチェックの開始
    this.startHealthCheck();

    // 初期タスクの生成
    await this.generateInitialTasks();

    // メインループの開始
    this.startMainLoop();

    this.emit('started', this.systemState);
  }

  /**
   * 自律モードを停止
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.log('🛑 DNSweeper Autonomous Mode 停止中...');
    this.isRunning = false;

    // ヘルスチェックの停止
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // アクティブなタスクの完了を待機
    await this.waitForActiveTasks();

    // 実行履歴の保存
    await this.saveExecutionHistory();

    this.emit('stopped', this.systemState);
    this.log('✅ DNSweeper Autonomous Mode 停止完了');
  }

  /**
   * タスクを追加
   */
  addTask(task: Task): void {
    this.taskQueue.push(task);
    this.emit('taskAdded', task);
  }

  /**
   * タスクチェーンを追加
   */
  addTaskChain(chain: TaskChain): void {
    this.activeChains.set(chain.id, chain);
    this.emit('chainAdded', chain);
  }

  /**
   * メインループ
   */
  private async startMainLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // 現在のモードを更新
        const newMode = this.getCurrentMode();
        if (newMode !== this.systemState.mode) {
          await this.handleModeChange(newMode);
        }

        // 次のタスクを取得
        const task = await this.getNextTask();
        if (task) {
          await this.executeTask(task);
        } else {
          // タスクがない場合は新しいタスクを生成
          await this.generateNewTasks();
        }

        // 短い待機
        await this.sleep(1000);
      } catch (error) {
        this.handleError(error as Error, 'Main loop error');
      }
    }
  }

  /**
   * タスクを実行
   */
  private async executeTask(task: Task): Promise<void> {
    try {
      // 事前フック
      if (this.options.hooks.beforeTask) {
        await this.options.hooks.beforeTask(task);
      }

      task.state = TaskState.IN_PROGRESS;
      task.startedAt = new Date();
      this.emit('taskStarted', task);

      // タイムアウト付きで実行
      await this.executeWithTimeout(task.action(), this.options.taskTimeout);

      task.state = TaskState.COMPLETED;
      task.completedAt = new Date();
      this.systemState.tasksCompleted++;

      // 実行履歴に追加
      this.executionHistory.push({
        taskId: task.id,
        timestamp: task.completedAt,
        duration: task.completedAt.getTime() - task.startedAt!.getTime(),
        success: true
      });

      // 事後フック
      if (this.options.hooks.afterTask) {
        await this.options.hooks.afterTask(task);
      }

      this.emit('taskCompleted', task);
      this.log(`✅ タスク完了: ${task.name}`);
    } catch (error) {
      await this.handleTaskError(task, error as Error);
    }
  }

  /**
   * タスクエラーを処理
   */
  private async handleTaskError(task: Task, error: Error): Promise<void> {
    task.error = error;
    task.retryCount = (task.retryCount || 0) + 1;

    if (task.retryCount < (task.maxRetries || 3)) {
      task.state = TaskState.PENDING;
      this.log(`⚠️ タスク失敗（リトライ ${task.retryCount}/${task.maxRetries}）: ${task.name}`);
      this.taskQueue.unshift(task); // 優先的に再実行
    } else {
      task.state = TaskState.FAILED;
      task.completedAt = new Date();
      this.systemState.tasksFailed++;

      // 実行履歴に追加
      this.executionHistory.push({
        taskId: task.id,
        timestamp: task.completedAt,
        duration: task.completedAt.getTime() - task.startedAt!.getTime(),
        success: false,
        error: error.message
      });

      // エラーフック
      if (this.options.hooks.onError) {
        await this.options.hooks.onError(error, task);
      }

      this.emit('taskFailed', task, error);
      this.log(`❌ タスク失敗: ${task.name} - ${error.message}`);
    }
  }

  /**
   * 次のタスクを取得
   */
  private async getNextTask(): Promise<Task | null> {
    // システムヘルスチェック
    if (!this.systemState.isHealthy) {
      this.log('⚠️ システムが不健全な状態です。回復を待機中...');
      return null;
    }

    // 優先度順にソート
    this.taskQueue.sort((a, b) => {
      const priorityOrder = {
        [TaskPriority.CRITICAL]: 0,
        [TaskPriority.HIGH]: 1,
        [TaskPriority.MEDIUM]: 2,
        [TaskPriority.LOW]: 3
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // 依存関係を考慮してタスクを選択
    for (const task of this.taskQueue) {
      if (await this.canExecuteTask(task)) {
        this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
        return task;
      }
    }

    return null;
  }

  /**
   * タスクが実行可能かチェック
   */
  private async canExecuteTask(task: Task): Promise<boolean> {
    // 依存タスクのチェック
    if (task.dependencies && task.dependencies.length > 0) {
      for (const depId of task.dependencies) {
        const depTask = this.findTaskById(depId);
        if (depTask && depTask.state !== TaskState.COMPLETED) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 新しいタスクを生成
   */
  private async generateNewTasks(): Promise<void> {
    const mode = this.systemState.mode;
    
    switch (mode) {
      case 'morning':
        await this.generateMorningTasks();
        break;
      case 'afternoon':
        await this.generateAfternoonTasks();
        break;
      case 'evening':
        await this.generateEveningTasks();
        break;
      case 'night':
        await this.generateNightTasks();
        break;
    }
  }

  /**
   * 初期タスクを生成
   */
  private async generateInitialTasks(): Promise<void> {
    // プロジェクト状態の分析タスク
    this.addTask({
      id: 'initial-analysis',
      name: 'プロジェクト状態分析',
      description: '現在のプロジェクト状態を分析',
      state: TaskState.PENDING,
      priority: TaskPriority.HIGH,
      action: async () => {
        await this.analyzeProjectState();
      },
      createdAt: new Date()
    });

    // テストの実行タスク
    this.addTask({
      id: 'initial-tests',
      name: 'テスト実行',
      description: 'すべてのテストを実行',
      state: TaskState.PENDING,
      priority: TaskPriority.HIGH,
      dependencies: ['initial-analysis'],
      action: async () => {
        await this.runTests();
      },
      createdAt: new Date()
    });
  }

  /**
   * 朝のタスクを生成
   */
  private async generateMorningTasks(): Promise<void> {
    // ビルドチェック
    this.addTask({
      id: `build-check-${Date.now()}`,
      name: 'ビルドチェック',
      description: 'プロジェクトのビルド状態を確認',
      state: TaskState.PENDING,
      priority: TaskPriority.HIGH,
      action: async () => {
        const { stdout } = await execAsync('npm run build');
        this.log(`ビルド結果:\n${stdout}`);
      },
      createdAt: new Date()
    });
  }

  /**
   * 午後のタスクを生成
   */
  private async generateAfternoonTasks(): Promise<void> {
    // コード品質チェック
    this.addTask({
      id: `quality-check-${Date.now()}`,
      name: 'コード品質チェック',
      description: 'コードの品質を分析',
      state: TaskState.PENDING,
      priority: TaskPriority.MEDIUM,
      action: async () => {
        await this.analyzeCodeQuality();
      },
      createdAt: new Date()
    });
  }

  /**
   * 夕方のタスクを生成
   */
  private async generateEveningTasks(): Promise<void> {
    // ドキュメント更新チェック
    this.addTask({
      id: `doc-check-${Date.now()}`,
      name: 'ドキュメント更新チェック',
      description: 'ドキュメントの整合性を確認',
      state: TaskState.PENDING,
      priority: TaskPriority.LOW,
      action: async () => {
        await this.checkDocumentation();
      },
      createdAt: new Date()
    });
  }

  /**
   * 夜間のタスクを生成
   */
  private async generateNightTasks(): Promise<void> {
    // 依存関係の更新チェック
    this.addTask({
      id: `dep-check-${Date.now()}`,
      name: '依存関係チェック',
      description: 'npm パッケージの更新を確認',
      state: TaskState.PENDING,
      priority: TaskPriority.LOW,
      action: async () => {
        const { stdout } = await execAsync('npm outdated');
        this.log(`古い依存関係:\n${stdout}`);
      },
      createdAt: new Date()
    });
  }

  /**
   * プロジェクト状態を分析
   */
  private async analyzeProjectState(): Promise<void> {
    const analyses = await Promise.all([
      execAsync('git status --porcelain').then(({ stdout }) => ({
        type: 'git' as const,
        hasChanges: stdout.trim().length > 0,
        details: stdout
      })),
      execAsync('npm test -- --reporter=json').then(({ stdout }) => ({
        type: 'tests' as const,
        passed: !stdout.includes('failed'),
        details: stdout
      })).catch(error => ({
        type: 'tests' as const,
        passed: false,
        details: error.message
      }))
    ]);

    this.log('プロジェクト状態分析完了:');
    analyses.forEach(analysis => {
      if (analysis.type === 'git') {
        this.log(`- ${analysis.type}: ${analysis.hasChanges ? '変更あり' : '変更なし'}`);
      } else {
        this.log(`- ${analysis.type}: ${analysis.passed ? 'パス' : '失敗'}`);
      }
    });
  }

  /**
   * テストを実行
   */
  private async runTests(): Promise<void> {
    try {
      const { stdout, stderr } = await execAsync('npm test');
      this.log(`テスト結果:\n${stdout}`);
      if (stderr) {
        this.log(`テストエラー:\n${stderr}`);
      }
    } catch (error) {
      throw new Error(`テスト実行エラー: ${error}`);
    }
  }

  /**
   * コード品質を分析
   */
  private async analyzeCodeQuality(): Promise<void> {
    // TypeScript の型チェック
    try {
      const { stdout } = await execAsync('npx tsc --noEmit');
      this.log('TypeScript型チェック: パス');
    } catch (error) {
      this.log(`TypeScript型チェック: エラーあり`);
    }
  }

  /**
   * ドキュメントをチェック
   */
  private async checkDocumentation(): Promise<void> {
    const docFiles = ['README.md', 'dnssweeper-context.md', 'CLAUDE.md'];
    
    for (const file of docFiles) {
      try {
        const stats = await fs.stat(file);
        const lastModified = new Date(stats.mtime);
        const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceModified > 7) {
          this.log(`⚠️ ${file} は ${Math.floor(daysSinceModified)} 日間更新されていません`);
        }
      } catch (error) {
        this.log(`❌ ${file} が見つかりません`);
      }
    }
  }

  /**
   * ヘルスチェックを開始
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.options.healthCheckInterval);
  }

  /**
   * ヘルスチェックを実行
   */
  private async performHealthCheck(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    this.systemState.memoryUsage = memoryPercent;
    this.systemState.lastHealthCheck = new Date();

    const wasHealthy = this.systemState.isHealthy;
    this.systemState.isHealthy = memoryPercent < this.options.memoryThreshold;

    if (wasHealthy !== this.systemState.isHealthy) {
      if (this.options.hooks.onStateChange) {
        const oldState = { ...this.systemState, isHealthy: wasHealthy };
        await this.options.hooks.onStateChange(oldState, this.systemState);
      }
    }

    if (!this.systemState.isHealthy) {
      this.log(`⚠️ メモリ使用率が高い: ${memoryPercent.toFixed(2)}%`);
      if (global.gc) {
        global.gc();
        this.log('ガベージコレクションを実行しました');
      }
    }
  }

  /**
   * モード変更を処理
   */
  private async handleModeChange(newMode: 'morning' | 'afternoon' | 'evening' | 'night'): Promise<void> {
    const oldMode = this.systemState.mode;
    this.systemState.mode = newMode;
    
    this.log(`🌅 モード変更: ${oldMode} → ${newMode}`);
    this.emit('modeChanged', oldMode, newMode);
    
    // モード変更時に新しいタスクを生成
    await this.generateNewTasks();
  }

  /**
   * 現在の時間帯モードを取得
   */
  private getCurrentMode(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 17) {
      return 'afternoon';
    } else if (hour >= 17 && hour < 22) {
      return 'evening';
    } else {
      return 'night';
    }
  }

  /**
   * タイムアウト付きで実行
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Task timeout')), timeout);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * アクティブなタスクの完了を待機
   */
  private async waitForActiveTasks(): Promise<void> {
    const activeTasks = this.taskQueue.filter(t => t.state === TaskState.IN_PROGRESS);
    
    if (activeTasks.length > 0) {
      this.log(`${activeTasks.length} 個のアクティブタスクの完了を待機中...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  /**
   * 実行履歴を保存
   */
  private async saveExecutionHistory(): Promise<void> {
    if (!this.options.enableLogging) {
      return;
    }

    const historyPath = join(this.options.logPath, 'execution-history.json');
    
    try {
      await fs.writeFile(
        historyPath,
        JSON.stringify(this.executionHistory, null, 2),
        'utf-8'
      );
      this.log(`実行履歴を保存しました: ${historyPath}`);
    } catch (error) {
      this.log(`実行履歴の保存に失敗: ${error}`);
    }
  }

  /**
   * ログディレクトリを確保
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.options.logPath, { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
    }
  }

  /**
   * IDでタスクを検索
   */
  private findTaskById(id: string): Task | undefined {
    return this.taskQueue.find(t => t.id === id);
  }

  /**
   * エラーを処理
   */
  private handleError(error: Error, context: string): void {
    this.log(`❌ エラー (${context}): ${error.message}`);
    this.emit('error', error, context);
  }

  /**
   * スリープ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ログ出力
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    console.log(logMessage);
    
    if (this.options.enableLogging) {
      const logFile = join(this.options.logPath, `dza-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFile(logFile, logMessage + '\n').catch(() => {
        // ログ書き込みエラーは無視
      });
    }
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    uptime: number;
    tasksCompleted: number;
    tasksFailed: number;
    tasksPending: number;
    activeChains: number;
    memoryUsage: number;
    executionHistory: typeof this.executionHistory;
  } {
    return {
      uptime: Date.now() - this.systemState.startTime.getTime(),
      tasksCompleted: this.systemState.tasksCompleted,
      tasksFailed: this.systemState.tasksFailed,
      tasksPending: this.taskQueue.length,
      activeChains: this.activeChains.size,
      memoryUsage: this.systemState.memoryUsage,
      executionHistory: this.executionHistory.slice(-100) // 最新100件
    };
  }
}

/**
 * シングルトンインスタンス
 */
let autonomousInstance: AutonomousMode | null = null;

/**
 * Autonomous Mode のインスタンスを取得
 */
export function getAutonomousMode(options?: AutonomousOptions): AutonomousMode {
  if (!autonomousInstance) {
    autonomousInstance = new AutonomousMode(options);
  }
  return autonomousInstance;
}

/**
 * Autonomous Mode を開始
 */
export async function startAutonomousMode(options?: AutonomousOptions): Promise<AutonomousMode> {
  const mode = getAutonomousMode(options);
  await mode.start();
  return mode;
}

/**
 * Autonomous Mode を停止
 */
export async function stopAutonomousMode(): Promise<void> {
  if (autonomousInstance) {
    await autonomousInstance.stop();
    autonomousInstance = null;
  }
}