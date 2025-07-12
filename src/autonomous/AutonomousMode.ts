/**
 * DNSweeper 完全自律モード
 * 24時間自動開発システムのメインコントローラー
 */

import { EventEmitter } from 'events';
import { ICurrentTask, ProgressManager } from './ProgressManager';
import { ExecutionEngine, IExecutionConfig } from './ExecutionEngine';
import { ITaskContext, TaskSelector } from './TaskSelector';
// import { DependencyAnalyzer } from './DependencyAnalyzer';
import { LearningSystem } from './LearningSystem';
import { NotificationSystem } from './NotificationSystem';
import { promises as fs } from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';

// 自律モード設定
export interface IAutonomousModeOptions {
  riskLevel?: 'low' | 'medium' | 'high';
  focusArea?: 'testing' | 'documentation' | 'bugfix' | 'feature' | 'performance';
  maxDuration?: string;
  approvalQueueLimit?: number;
  resume?: boolean;
}

// 時間帯判定結果
export interface ITimeBasedConfig {
  mode: 'night' | 'day' | 'weekend';
  riskLevel: 'low' | 'medium' | 'high';
  preferredTasks: string[];
  avoidedTasks: string[];
  experimental: boolean;
  conservative: boolean;
}

/**
 * 完全自律モードコントローラー
 */
export class AutonomousMode extends EventEmitter {
  private progressManager: ProgressManager;
  private executionEngine!: ExecutionEngine;
  private taskSelector: TaskSelector;
  // private dependencyAnalyzer: DependencyAnalyzer;
  private learningSystem: LearningSystem;
  private notificationSystem: NotificationSystem;
  // private config!: IExecutionConfig;
  private isRunning = false;
  private startTime: Date | null = null;
  private maxDuration: number;
  private currentOptions: IAutonomousModeOptions;
  private avoidApprovalTasks = false;
  private timeCheckInterval: NodeJS.Timeout | null = null;
  private currentTimeMode: string = 'unknown';

  constructor(options: IAutonomousModeOptions = {}) {
    super();
    this.currentOptions = options;
    this.maxDuration = this.parseDuration(options.maxDuration ?? '24h');
    this.progressManager = new ProgressManager();
    this.taskSelector = new TaskSelector();
    // this.dependencyAnalyzer = new DependencyAnalyzer();
    this.learningSystem = new LearningSystem();
    this.notificationSystem = new NotificationSystem();
    
    // 設定を読み込み
    void this.loadConfiguration().then(config => {
      // this.config = config;
      this.executionEngine = new ExecutionEngine(this.progressManager, config);
      this.setupEventHandlers();
      void this.initializeComponents();
    }).catch(error => {
      console.error('Failed to initialize AutonomousMode:', error);
    });
  }

  /**
   * コンポーネント初期化
   */
  private async initializeComponents(): Promise<void> {
    await this.taskSelector.initialize();
    await this.learningSystem.initialize();
    await this.notificationSystem.initialize();
  }

  /**
   * hookシステムの初期化とチェック
   */
  private async initializeHookSystem(): Promise<void> {
    const fsPromises = await import('fs/promises');
    const pathModule = await import('path');
    const osModule = await import('os');
    
    console.log('🔧 /dza hookシステムをチェック中...');
    
    // 必要なディレクトリを作成
    const dirs = [
      '.claude/hooks',
      '.dza/config',
      '.dza/logs', 
      '.dza/status'
    ];
    
    for (const dir of dirs) {
      const fullPath = pathModule.join(osModule.homedir(), dir);
      try {
        await fsPromises.mkdir(fullPath, { recursive: true });
      } catch (error) {
        console.warn(`ディレクトリ作成に失敗: ${fullPath}: ${String(error)}`);
      }
    }
    
    // hook設定の確認
    const settingsPath = pathModule.join(osModule.homedir(), '.claude', 'settings.local.json');
    try {
      await fsPromises.access(settingsPath);
      console.log('✅ hook設定が検出されました');
    } catch {
      console.log('⚠️ hook設定が見つかりません');
      console.log('📝 scripts/install_dza_hooks.sh を実行してください');
      console.log('🔄 インストール後、Claude Codeの再起動が必要です');
      console.log('   完全終了 → 再起動 → /dza で確認');
      console.log('💡 再起動手順の詳細: /dza-restart または /dzr');
    }
    
    // 承認待ちキューの確認
    await this.checkApprovalQueue();
  }

  /**
   * 承認待ちキューのチェック
   */
  private async checkApprovalQueue(): Promise<void> {
    const fsPromises = await import('fs/promises');
    const pathModule = await import('path');
    const osModule = await import('os');
    
    const queuePath = pathModule.join(osModule.homedir(), '.dza', 'logs', 'approval_queue.json');
    
    try {
      const data = await fsPromises.readFile(queuePath, 'utf8');
      const queue = JSON.parse(data) as unknown[];
      const pending = queue.filter((t: unknown) => {
        return typeof t === 'object' && t !== null && 'status' in t && 
               (t as { status: string }).status === 'pending';
      });
      
      if (pending.length > 0) {
        console.log(`\n📋 ${pending.length}個のタスクが承認待ちです`);
        console.log('💡 承認不要なタスクから実行します\n');
        
        // 承認待ちタスクを回避フラグを設定
        this.avoidApprovalTasks = true;
      }
    } catch {
      // キューファイルがない場合は無視
    }
  }

  /**
   * 自律モード開始
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ 自律モードは既に実行中です');
      return;
    }

    console.log(`\n🤖 DNSweeper 完全自律モード起動\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // hookシステムの初期化
    await this.initializeHookSystem();
    
    this.isRunning = true;
    this.startTime = new Date();

    try {
      // 既存セッションの復旧確認
      if (this.currentOptions.resume !== false) {
        const resumed = await this.progressManager.resumeSession();
        if (resumed) {
          console.log('✅ 前回のセッションから復旧しました');
          await this.continueExecution();
          return;
        }
      }

      // 新しいセッション開始
      console.log(`⏰ 開始時刻: ${this.startTime.toLocaleString()}`);
      console.log(`⚙️ 設定: ${JSON.stringify(this.currentOptions, null, 2)}`);
      console.log(`🌍 環境: ${this.getEnvironmentInfo()}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // 時間帯別モード実行
      await this.executeTimeBasedMode();
      
      // 定期的な時間チェック開始（5分間隔）
      this.startTimeCheckInterval();
      
      // メイン実行ループ開始（永久に最適タスク実行）
      await this.mainExecutionLoop();

    } catch (error) {
      console.error('❌ 自律モード実行エラー:', error);
      await this.progressManager.endSession('error');
    } finally {
      this.isRunning = false;
      this.stopTimeCheckInterval();
    }
  }

  /**
   * 自律モード停止
   */
  async stop(reason: 'manual' | 'timeout' | 'error' = 'manual'): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log(`\n⏹️ 自律モード停止: ${reason}`);
    this.isRunning = false;
    
    // 定期時間チェック停止
    this.stopTimeCheckInterval();
    
    await this.progressManager.endSession(
      reason === 'timeout' || reason === 'error' ? 'interrupted' : 'completed'
    );
  }

  /**
   * メイン実行ループ
   */
  private async mainExecutionLoop(): Promise<void> {
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;

    while (this.isRunning && !this.isTimeUp()) {
      try {
        // 現在の時間帯設定を取得
        const timeConfig = this.getCurrentTimeBasedConfig();
        console.log(`\n📅 現在のモード: ${timeConfig.mode} (リスク: ${timeConfig.riskLevel})`);

        // 最適なタスクを選択
        const task = await this.selectOptimalTask(timeConfig);
        
        if (!task) {
          console.log('\n🔍 実行可能なタスクが見つかりません');
          await this.wait(30000, 'タスク再選択まで待機'); // 30秒待機
          continue;
        }

        console.log(`\n🎯 選択されたタスク: ${task.description}`);
        console.log(`📊 リスクレベル: ${task.riskLevel}`);

        // 4フェーズ実行
        const success = await this.executionEngine.executeFullCycle(
          task.description,
          task.riskLevel
        );

        if (success) {
          consecutiveFailures = 0;
          console.log('✅ タスク実行成功');
          
          // 次のタスクまでの休憩
          await this.takeBreak(timeConfig);
        } else {
          consecutiveFailures++;
          console.log(`❌ タスク実行失敗 (連続失敗: ${consecutiveFailures}/${maxConsecutiveFailures})`);
          
          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.log('⚠️ 連続失敗回数が上限に達しました');
            await this.wait(300000, 'システム回復待機'); // 5分待機
            consecutiveFailures = 0;
          }
        }

        // 承認キューの確認
        await this.checkApprovalQueue();

      } catch (error) {
        console.error('🚨 実行ループエラー:', error);
        consecutiveFailures++;
        
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log('❌ 回復不可能なエラーが発生しました。停止します。');
          break;
        }
        
        await this.wait(60000, 'エラー回復待機'); // 1分待機
      }
    }

    // 実行終了
    if (this.isTimeUp()) {
      console.log('⏰ 最大実行時間に達しました');
      await this.stop('timeout');
    }
  }

  /**
   * 継続実行（復旧時）
   */
  private async continueExecution(): Promise<void> {
    console.log('🔄 前回の進捗から継続実行中...');
    await this.mainExecutionLoop();
  }

  /**
   * 最適なタスクの選択
   */
  private async selectOptimalTask(timeConfig: ITimeBasedConfig): Promise<ICurrentTask | null> {
    console.log(`\n💡 タスク選択中... (モード: ${timeConfig.mode})`);

    // タスク選択コンテキストを構築
    const context: ITaskContext = {
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      currentLoad: await this.getSystemLoad(),
      approvalQueueSize: 0, // TODO: ProgressManagerから取得
      recentFailures: 0, // TODO: 実装
      availableTime: 60, // TODO: 実際の残り時間を計算
      riskTolerance: timeConfig.riskLevel as 'low' | 'medium' | 'high',
      focusArea: this.currentOptions.focusArea,
      experimentalMode: timeConfig.experimental,
      conservativeMode: timeConfig.conservative
    };

    // AI タスクセレクターを使用
    const selectedTaskScore = await this.taskSelector.selectOptimalTask(context);
    
    if (!selectedTaskScore) {
      return null;
    }

    const task = selectedTaskScore.task;
    
    return {
      id: this.generateTaskId(),
      title: task.title,
      description: task.description,
      category: task.category as 'investigation' | 'planning' | 'implementation' | 'testing',
      riskLevel: task.riskLevel,
      startTime: new Date(),
      estimatedDuration: task.estimatedDuration,
      status: 'pending'
    };
  }

  /**
   * 初期タスクの選択
   */
  private async selectInitialTask(): Promise<ICurrentTask> {
    const timeConfig = this.getCurrentTimeBasedConfig();
    const task = await this.selectOptimalTask(timeConfig);
    
    return task || {
      id: this.generateTaskId(),
      title: 'システム初期化',
      description: 'コードベースの基本分析と改善点の特定',
      category: 'investigation',
      riskLevel: 'low',
      startTime: new Date(),
      estimatedDuration: 600000, // 10分
      status: 'pending'
    };
  }

  /**
   * 現在の時間帯設定を取得
   */
  private getCurrentTimeBasedConfig(): ITimeBasedConfig {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0=日曜, 6=土曜

    // 週末判定
    if (day === 0 || day === 6) {
      return {
        mode: 'weekend',
        riskLevel: 'low',
        preferredTasks: ['experimental_features', 'performance_optimization', 'documentation'],
        avoidedTasks: ['critical_bug_fix', 'production_deployment'],
        experimental: true,
        conservative: false
      };
    }

    // 夜間モード (22:00-06:00)
    if (hour >= 22 || hour < 6) {
      return {
        mode: 'night',
        riskLevel: this.currentOptions.riskLevel || 'low',
        preferredTasks: ['documentation_update', 'code_cleanup', 'test_enhancement', 'performance_analysis'],
        avoidedTasks: ['production_deployment', 'database_migration', 'critical_bug_fix'],
        experimental: true,
        conservative: false
      };
    }

    // 日中モード (09:00-18:00)
    return {
      mode: 'day',
      riskLevel: this.currentOptions.riskLevel || 'medium',
      preferredTasks: ['bug_investigation', 'test_creation', 'refactoring', 'code_analysis'],
      avoidedTasks: [],
      experimental: false,
      conservative: true
    };
  }

  /**
   * システム負荷の取得
   */
  private async getSystemLoad(): Promise<number> {
    // 簡易的なシステム負荷計算
    // 実際の実装では、CPU、メモリ、ディスクI/O等を監視
    try {
      const { loadavg } = await import('os');
      const load = loadavg()[0]; // 1分間の平均負荷
      return Math.min(100, load * 25); // 0-100%にスケール
    } catch {
      return 50; // デフォルト値
    }
  }


  /**
   * 休憩処理
   */
  private async takeBreak(timeConfig: ITimeBasedConfig): Promise<void> {
    const breakTime = timeConfig.mode === 'night' ? 60000 : 30000; // 夜間は長め
    console.log(`\n✅ タスク完了！次のタスクまで休憩`);
    await this.wait(breakTime, '次タスクまで休憩');
  }

  /**
   * 設定ファイルの読み込み
   */
  private async loadConfiguration(): Promise<IExecutionConfig> {
    try {
      const configPath = path.join(process.cwd(), '.dza', 'config.yml');
      const configData = await fs.readFile(configPath, 'utf8');
      const config = yaml.load(configData) as any;
      
      return {
        phases: config.phases || this.getDefaultPhaseConfig(),
        security: config.security || this.getDefaultSecurityConfig(),
        timeBasedRules: config.time_based_rules || this.getDefaultTimeBasedRules()
      };
    } catch (error) {
      console.log('⚠️ 設定ファイルが見つかりません。デフォルト設定を使用します。');
      return this.getDefaultConfig();
    }
  }

  /**
   * イベントハンドラーの設定
   */
  private setupEventHandlers(): void {
    this.progressManager.on('progress-saved', () => {
      // 進捗保存時の処理
    });

    this.progressManager.on('session-ended', (data) => {
      console.log(`📊 セッション終了: ${data.reason}`);
    });

    this.executionEngine.on('phase-completed', (phase) => {
      console.log(`✅ フェーズ完了: ${phase}`);
    });
  }

  // ユーティリティメソッド
  private isTimeUp(): boolean {
    if (!this.startTime) {return false;}
    return Date.now() - this.startTime.getTime() >= this.maxDuration;
  }

  private async wait(ms: number, reason = '待機中'): Promise<void> {
    const seconds = Math.ceil(ms / 1000);
    console.log(`⏸️ ${reason} (${seconds}秒)`);
    
    // プログレスバー風の表示
    const dots = '.'.repeat(Math.min(10, Math.ceil(seconds / 3)));
    console.log(`⏳ ${dots}`);
    
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([hms])$/);
    if (!match) {return 24 * 60 * 60 * 1000;} // デフォルト24時間

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      case 's': return value * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  private getEnvironmentInfo(): string {
    return `${process.platform} ${process.arch} Node.js ${process.version}`;
  }

  // デフォルト設定
  private getDefaultConfig(): IExecutionConfig {
    return {
      phases: this.getDefaultPhaseConfig(),
      security: this.getDefaultSecurityConfig(),
      timeBasedRules: this.getDefaultTimeBasedRules()
    };
  }

  private getDefaultPhaseConfig() {
    return {
      investigate: { maxDuration: 600000, autoSaveInterval: 120000 },
      plan: { maxDuration: 300000, requireApproval: false },
      implement: { maxDuration: 1200000, checkpointInterval: 300000, rollbackEnabled: true },
      test: { maxDuration: 600000, requiredCoverage: 80, autoFixEnabled: true }
    };
  }

  private getDefaultSecurityConfig() {
    return {
      safeDirectories: [path.join(process.cwd(), 'src'), path.join(process.cwd(), 'test')],
      prohibitedOperations: ['rm -rf', 'format', 'delete database'],
      requireApprovalFor: ['file_deletion', 'external_api_calls', 'system_commands']
    };
  }

  private getDefaultTimeBasedRules() {
    return {
      nightMode: { hours: '22-06', riskLevel: 'low', experimental: true },
      dayMode: { hours: '09-18', approvalStrategy: 'queue', conservative: true }
    };
  }

  /**
   * 時間帯別モード実行
   */
  private async executeTimeBasedMode(): Promise<void> {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // 現在のモードを判定
    let newMode = 'unknown';
    if (hour >= 6 && hour < 10) {
      newMode = 'morning';
    } else if (hour >= 10 && hour < 17) {
      newMode = 'daytime';
    } else if (hour >= 17 && hour < 19) {
      newMode = 'evening';
    } else {
      newMode = 'night';
    }

    console.log(`\n🕐 現在時刻: ${hour}時`);

    // モード変更を検出
    if (this.currentTimeMode !== newMode) {
      if (this.currentTimeMode !== 'unknown') {
        console.log(`🔄 モード変更: ${this.currentTimeMode} → ${newMode}`);
      }
      this.currentTimeMode = newMode;
    }

    if (hour >= 6 && hour < 10) {
      await this.executeMorningMode();
    } else if (hour >= 10 && hour < 17) {
      await this.executeDaytimeMode();
    } else if (hour >= 17 && hour < 19) {
      await this.executeEveningMode();
    } else {
      await this.executeNightMode();
    }

    // 金曜日は特別処理
    if (dayOfWeek === 5 && hour >= 15) {
      await this.executeWeeklyProcessing();
    }
  }

  /**
   * 定期的な時間チェック開始（5分間隔）
   */
  private startTimeCheckInterval(): void {
    console.log('⏰ 定期時間チェック開始（5分間隔）');
    
    this.timeCheckInterval = setInterval(async () => {
      if (!this.isRunning) {
        this.stopTimeCheckInterval();
        return;
      }
      
      const hour = new Date().getHours();
      let newMode = 'unknown';
      
      if (hour >= 6 && hour < 10) {
        newMode = 'morning';
      } else if (hour >= 10 && hour < 17) {
        newMode = 'daytime';
      } else if (hour >= 17 && hour < 19) {
        newMode = 'evening';
      } else {
        newMode = 'night';
      }
      
      // モード変更があった場合
      if (this.currentTimeMode !== newMode) {
        console.log(`\n🔄 【自動モード切替】 ${this.currentTimeMode} → ${newMode} (${hour}時)`);
        this.currentTimeMode = newMode;
        
        // 新しいモードに切り替え
        try {
          await this.executeTimeBasedMode();
        } catch (error) {
          console.error('❌ モード切替エラー:', error);
        }
      }
    }, 5 * 60 * 1000); // 5分間隔
  }

  /**
   * 定期時間チェック停止
   */
  private stopTimeCheckInterval(): void {
    if (this.timeCheckInterval) {
      console.log('⏰ 定期時間チェック停止');
      clearInterval(this.timeCheckInterval);
      this.timeCheckInterval = null;
    }
  }

  /**
   * 朝モード（6-10時）
   */
  private async executeMorningMode(): Promise<void> {
    console.log(`
🌅 朝モードで実行します
━━━━━━━━━━━━━━━━━━━━━━━━
1. 環境準備とヘルスチェック
2. セキュリティスキャン（簡易版）
3. 承認待ちキューの表示
4. 本日の優先タスク選定
━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // 1. ヘルスチェック
    await this.performHealthCheck();

    // 2. 夜間の承認待ちを確認
    const queueSize = this.progressManager.currentProgress?.approvalQueue.length || 0;
    if (queueSize > 0) {
      console.log(`\n📋 夜間の承認待ち: ${queueSize}件`);
      await this.displayApprovalQueue();
    }

    // 3. セキュリティチェック
    await this.performQuickSecurityCheck();

    // 4. 今日のタスクを開始
    await this.startDailyTasks();
  }

  /**
   * 日中モード（10-17時）
   */
  private async executeDaytimeMode(): Promise<void> {
    console.log(`
☀️ 日中自律モードで実行します
- 承認不要なタスクを優先実行
- 承認待ちは自動でキューに保存
- 継続的に開発を進行
    `);

    // 仕事時間中なので承認不要なタスクを中心に
    const preferences = {
      preferNoApproval: true,
      riskLevel: 'low-medium' as const,
      focusAreas: ['testing', 'documentation', 'analysis'],
      maxConcurrent: 3
    };

    await this.executeWithPreferences(preferences);
  }

  /**
   * 夕方モード（17-19時）
   */
  private async executeEveningMode(): Promise<void> {
    console.log(`
🌆 夕方モードで実行します
━━━━━━━━━━━━━━━━━━━━━━━━
1. 本日の進捗サマリー生成
2. 承認待ちキューの整理
3. 明日の準備
4. セキュリティレポート
━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // 1. 本日の成果をまとめる
    await this.generateDailySummary();

    // 2. 承認待ちを表示
    await this.displayApprovalQueue();

    // 3. 明日の準備
    await this.prepareTomorrow();

    // 4. セキュリティレポート
    await this.generateSecurityReport();
  }

  /**
   * 夜間モード（19-6時）
   */
  private async executeNightMode(): Promise<void> {
    console.log(`
🌙 夜間自律モードで実行します
- 低リスクタスクを自動選択
- 実験的実装OK
- ドキュメント更新
- メンテナンス作業
    `);

    // 夜間は思い切った実験もOK
    const preferences = {
      preferNoApproval: true,
      riskLevel: 'low' as const,
      allowExperimental: true,
      focusAreas: ['cleanup', 'documentation', 'experiments', 'analysis'],
      maxConcurrent: 5
    };

    await this.executeWithPreferences(preferences);
  }

  /**
   * 週次処理（金曜日）
   */
  private async executeWeeklyProcessing(): Promise<void> {
    console.log(`
📊 週次処理を実行します
- PDCA分析
- 最適化提案
- 来週の計画
    `);

    // 1. PDCA分析
    await this.performWeeklyPDCA();

    // 2. 最適化提案
    const optimizations = await this.learningSystem.generateOptimizationSuggestions();
    if (optimizations.length > 0) {
      console.log(`\n⚡ 最適化提案: ${optimizations.length}件`);
      for (const opt of optimizations.slice(0, 3)) {
        console.log(`  - ${opt.title}`);
      }
    }

    // 3. 来週の計画
    await this.planNextWeek();
  }

  /**
   * ヘルスチェック
   */
  private async performHealthCheck(): Promise<void> {
    console.log('\n🏥 ヘルスチェック実行中...');
    
    // システム状態確認
    const stats = await this.getSystemStats();
    console.log(`  ├─ CPU使用率: ${stats.cpuUsage.toFixed(1)}%`);
    console.log(`  ├─ メモリ使用率: ${stats.memoryUsage.toFixed(1)}%`);
    console.log(`  └─ ディスク使用率: ${stats.diskUsage.toFixed(1)}%`);

    if (stats.cpuUsage > 80 || stats.memoryUsage > 85) {
      await this.notificationSystem.warning('リソース使用率が高い', 
        `CPU: ${stats.cpuUsage}%, メモリ: ${stats.memoryUsage}%`);
    }
  }

  /**
   * セキュリティチェック（簡易版）
   */
  private async performQuickSecurityCheck(): Promise<void> {
    console.log('\n🔒 セキュリティチェック...');
    
    // 最近のエラーログをチェック
    const recentErrors = this.progressManager.currentProgress?.statistics.errorCount || 0;
    if (recentErrors > 10) {
      console.log(`  ⚠️ エラーが多発しています: ${recentErrors}件`);
    } else {
      console.log(`  ✅ セキュリティ状態: 正常`);
    }
  }

  /**
   * 本日のタスク開始
   */
  private async startDailyTasks(): Promise<void> {
    console.log('\n📌 本日の優先タスクを選定中...');
    
    // 初期タスクの決定
    const initialTask = await this.selectInitialTask();
    
    // セッション開始
    await this.progressManager.startNewSession(initialTask);
    
    // メイン実行ループ
    await this.mainExecutionLoop();
  }

  /**
   * 承認待ちキューの表示
   */
  private async displayApprovalQueue(): Promise<void> {
    const queue = this.progressManager.currentProgress?.approvalQueue || [];
    if (queue.length === 0) {
      console.log('✅ 承認待ちタスクはありません');
      return;
    }

    console.log(`\n📋 承認待ちタスク管理`);
    console.log(`├─ 総タスク数: ${queue.length}件`);
    
    const riskGroups = {
      low: queue.filter(t => t.riskLevel === 'low'),
      medium: queue.filter(t => t.riskLevel === 'medium'),
      high: queue.filter(t => t.riskLevel === 'high')
    };

    console.log(`├─ 🟢 低リスク: ${riskGroups.low.length}件`);
    console.log(`├─ 🟡 中リスク: ${riskGroups.medium.length}件`);
    console.log(`└─ 🔴 高リスク: ${riskGroups.high.length}件`);

    // 最初の3件を表示
    console.log('\n最新の承認待ち:');
    for (const item of queue.slice(0, 3)) {
      console.log(`  - [${item.riskLevel}] ${item.taskId}: ${item.reason}`);
    }
  }

  /**
   * 日次サマリー生成
   */
  private async generateDailySummary(): Promise<void> {
    console.log('\n📊 本日の進捗サマリー');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const stats = this.progressManager.currentProgress?.statistics || {
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
    };
    const successRate = stats.successCount / (stats.totalTasks || 1) * 100;

    console.log(`✅ 完了タスク: ${stats.successCount}件`);
    console.log(`❌ 失敗タスク: ${stats.errorCount}件`);
    console.log(`📊 成功率: ${successRate.toFixed(1)}%`);
    console.log(`⏱️ 総実行時間: ${Math.round(stats.totalDuration / 60000)}分`);
    
    // 学習システムからのインサイト
    const metrics = await this.learningSystem.getPerformanceMetrics();
    if (metrics.trends.successRateTrend > 0) {
      console.log(`📈 成功率は改善傾向にあります！`);
    }
  }

  /**
   * 明日の準備
   */
  private async prepareTomorrow(): Promise<void> {
    console.log('\n🌅 明日の準備中...');
    
    // 未完了タスクの整理
    const context = this.createTaskContext();
    const pendingTasks = await this.taskSelector.getAvailableTasks(context);
    console.log(`  ├─ 持ち越しタスク: ${pendingTasks.length}件`);
    
    // 優先度の再評価
    const highPriorityCount = pendingTasks.filter(t => t.priority > 7).length;
    console.log(`  └─ 高優先度タスク: ${highPriorityCount}件`);
  }

  /**
   * タスクコンテキストの作成
   */
  private createTaskContext(): any {
    return {
      sessionId: this.progressManager.currentProgress?.sessionId || '',
      phase: this.progressManager.currentProgress?.phase.current || 'investigate',
      timestamp: new Date(),
      environment: {
        riskLevel: this.currentOptions.riskLevel,
        focusArea: this.currentOptions.focusArea
      }
    };
  }

  /**
   * セキュリティレポート生成
   */
  private async generateSecurityReport(): Promise<void> {
    console.log('\n🔐 セキュリティレポート');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const config = this.notificationSystem.getConfig();
    console.log(`監査ログ: ${config.security.auditLogging ? '有効' : '無効'}`);
    console.log(`データマスキング: ${config.security.sensitiveDataMasking ? '有効' : '無効'}`);
    console.log(`ブロックパターン: ${config.security.blockedPatterns.length}件`);
  }

  /**
   * 週次PDCA分析
   */
  private async performWeeklyPDCA(): Promise<void> {
    console.log('\n🔄 週次PDCA分析');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const metrics = await this.learningSystem.getPerformanceMetrics();
    
    // Plan（計画）
    console.log('\n📋 Plan（先週の計画）:');
    console.log('  - タスク完了率向上');
    console.log('  - エラー率低減');
    
    // Do（実行）
    console.log('\n⚙️ Do（実行結果）:');
    console.log(`  - 実行タスク数: ${metrics.overall.totalExecutions}`);
    console.log(`  - 成功率: ${(metrics.overall.successRate * 100).toFixed(1)}%`);
    
    // Check（評価）
    console.log('\n✅ Check（評価）:');
    const trends = metrics.trends;
    console.log(`  - 成功率トレンド: ${trends.successRateTrend > 0 ? '↑改善' : '↓悪化'}`);
    console.log(`  - 効率性スコア: ${metrics.overall.efficiencyScore.toFixed(1)}/100`);
    
    // Act（改善）
    console.log('\n🎯 Act（改善提案）:');
    const patterns = this.learningSystem.getLearnedPatterns();
    if (patterns.length > 0) {
      console.log(`  - 学習パターン: ${patterns.length}件`);
      console.log(`  - 最も成功率の高い時間帯: ${this.findBestTimeSlot(metrics)}`);
    }
  }

  /**
   * 来週の計画
   */
  private async planNextWeek(): Promise<void> {
    console.log('\n📅 来週の計画');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 最適化提案に基づいた計画
    const suggestions = await this.learningSystem.generateOptimizationSuggestions();
    
    console.log('推奨アクション:');
    for (const suggestion of suggestions.slice(0, 3)) {
      console.log(`  ✨ ${suggestion.title}`);
      console.log(`     効果: 成功率+${suggestion.impact.successRateImprovement}%`);
    }
  }

  /**
   * 特定の設定でタスクを実行
   */
  private async executeWithPreferences(preferences: any): Promise<void> {
    // タスク選択の設定を適用
    const availableTasks = await this.taskSelector.selectTasks({
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      currentLoad: (await this.getSystemStats()).cpuUsage,
      approvalQueueSize: this.progressManager.currentProgress?.approvalQueue.length || 0,
      recentFailures: 0,
      availableTime: 60,
      riskTolerance: preferences.riskLevel,
      experimentalMode: preferences.allowExperimental || false,
      conservativeMode: false,
      focusArea: preferences.focusAreas?.[0]
    }, 5);

    // 選択されたタスクを実行
    for (const task of availableTasks.slice(0, preferences.maxConcurrent)) {
      await this.executeTask(task);
    }
  }

  /**
   * 単一タスクの実行
   */
  private async executeTask(task: any): Promise<void> {
    const currentTask: ICurrentTask = {
      id: this.generateTaskId(),
      title: task.title,
      description: task.description,
      category: task.category as 'investigation' | 'planning' | 'implementation' | 'testing',
      riskLevel: task.riskLevel,
      startTime: new Date(),
      estimatedDuration: task.estimatedDuration,
      status: 'pending'
    };

    await this.progressManager.updateCurrentTask(currentTask);
    
    // 4フェーズ実行
    const success = await this.executionEngine.executeFullCycle(
      task.description,
      task.riskLevel
    );

    if (success) {
      await this.notificationSystem.taskNotification('task_completed', task.id, {
        duration: Date.now() - currentTask.startTime.getTime()
      });
    } else {
      await this.notificationSystem.taskNotification('task_failed', task.id, {
        reason: 'Execution failed'
      });
    }
  }

  /**
   * システム統計の取得
   */
  private async getSystemStats(): Promise<any> {
    try {
      const os = await import('os');
      const load = os.loadavg();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      
      return {
        cpuUsage: load[0] * 25, // 簡易計算
        memoryUsage: ((totalMem - freeMem) / totalMem) * 100,
        diskUsage: 50 // TODO: 実装
      };
    } catch (error) {
      return { cpuUsage: 0, memoryUsage: 0, diskUsage: 0 };
    }
  }

  /**
   * 最適な時間帯を見つける
   */
  private findBestTimeSlot(metrics: any): string {
    let bestHour = '10';
    let bestSuccessRate = 0;

    for (const [hour, data] of Object.entries(metrics.timeBasedMetrics)) {
      const hourData = data as any;
      if (hourData.successRate > bestSuccessRate) {
        bestSuccessRate = hourData.successRate;
        bestHour = hour;
      }
    }

    return `${bestHour}時台`;
  }
}