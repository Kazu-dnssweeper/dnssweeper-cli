/**
 * インテリジェントタスク選択AI
 * 状況に応じて最適なタスクを自動選択する学習システム
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';

// タスク定義
export interface ITaskDefinition {
  id: string;
  title: string;
  description: string;
  category: 'investigation' | 'planning' | 'implementation' | 'testing' | 'documentation' | 'maintenance';
  riskLevel: 'low' | 'medium' | 'high';
  estimatedDuration: number;
  tags: string[];
  dependencies: string[];
  requiredSkills: string[];
  expectedImpact: number; // 1-10
  complexity: number; // 1-10
  priority: number; // 1-10
}

// 実行コンテキスト
export interface ITaskContext {
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6 (0=日曜)
  currentLoad: number; // 0-100
  approvalQueueSize: number;
  recentFailures: number;
  availableTime: number; // 分
  riskTolerance: 'low' | 'medium' | 'high';
  focusArea?: string;
  experimentalMode: boolean;
  conservativeMode: boolean;
}

// タスクスコア結果
export interface ITaskScore {
  task: ITaskDefinition;
  score: number;
  reasoning: string[];
  confidence: number;
  adjustments: { [key: string]: number };
}

// 学習データ
export interface ILearningData {
  taskExecutions: {
    taskId: string;
    context: ITaskContext;
    outcome: 'success' | 'failure' | 'timeout' | 'approval_required';
    executionTime: number;
    satisfaction: number; // 1-10
    timestamp: Date;
  }[];
  patterns: {
    timeBasedPreferences: { [hour: string]: string[] };
    successfulCombinations: { context: Partial<ITaskContext>; taskCategories: string[] }[];
    failurePatterns: { context: Partial<ITaskContext>; reasons: string[] }[];
  };
  adaptations: {
    riskAdjustments: { [category: string]: number };
    timeAdjustments: { [hour: string]: number };
    contextualWeights: { [factor: string]: number };
  };
}

/**
 * インテリジェントタスク選択システム
 */
export class TaskSelector extends EventEmitter {
  private learningDataFile: string;
  private taskPoolFile: string;
  private learningData: ILearningData;
  private taskPool: ITaskDefinition[];
  private isInitialized = false;

  constructor() {
    super();
    this.learningDataFile = path.join(process.cwd(), '.dza', 'learning.json');
    this.taskPoolFile = path.join(process.cwd(), '.dza', 'task-pool.json');
    this.learningData = this.getDefaultLearningData();
    this.taskPool = [];
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      // 学習データの読み込み
      await this.loadLearningData();
      
      // タスクプールの読み込み
      await this.loadTaskPool();
      
      this.isInitialized = true;
      console.log('🧠 タスク選択AIを初期化しました');
      
    } catch (error) {
      console.log('⚠️ 学習データが見つかりません。初期データを作成します。');
      
      // デフォルトタスクプールを生成
      this.taskPool = await this.generateDefaultTaskPool();
      await this.saveTaskPool();
      await this.saveLearningData();
      
      this.isInitialized = true;
    }
  }

  /**
   * 最適なタスクを選択
   */
  async selectOptimalTask(context: ITaskContext): Promise<ITaskScore | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`\n🧠 AI タスク分析中...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`⏰ 時刻: ${context.timeOfDay}時 (${this.getDayPhase(context.timeOfDay)})`);
    console.log(`📅 曜日: ${this.getDayName(context.dayOfWeek)}`);
    console.log(`🎯 フォーカス: ${context.focusArea || 'なし'}`);
    console.log(`⚡ システム負荷: ${context.currentLoad}%`);
    console.log(`📋 承認待ち: ${context.approvalQueueSize}件`);
    console.log(`⏱️ 利用可能時間: ${context.availableTime}分`);

    // 利用可能なタスクをフィルタリング
    const availableTasks = this.filterAvailableTasks(context);
    
    if (availableTasks.length === 0) {
      console.log(`❌ 実行可能なタスクが見つかりません`);
      return null;
    }

    console.log(`📊 分析対象: ${availableTasks.length}タスク`);

    // 各タスクをスコアリング
    const scoredTasks = await Promise.all(
      availableTasks.map(task => this.scoreTask(task, context))
    );

    // スコア順でソート
    scoredTasks.sort((a, b) => b.score - a.score);

    const selectedTask = scoredTasks[0];
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎯 選択結果: ${selectedTask.task.title}`);
    console.log(`📊 スコア: ${selectedTask.score.toFixed(1)}/100 (信頼度: ${selectedTask.confidence.toFixed(1)}%)`);
    console.log(`💭 理由: ${selectedTask.reasoning.join(', ')}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return selectedTask;
  }

  /**
   * タスク実行結果の学習
   */
  async learnFromExecution(
    taskId: string,
    context: ITaskContext,
    outcome: 'success' | 'failure' | 'timeout' | 'approval_required',
    executionTime: number,
    satisfaction: number = 5
  ): Promise<void> {
    // 実行データを記録
    this.learningData.taskExecutions.push({
      taskId,
      context,
      outcome,
      executionTime,
      satisfaction,
      timestamp: new Date()
    });

    // 古いデータを削除（最新1000件のみ保持）
    if (this.learningData.taskExecutions.length > 1000) {
      this.learningData.taskExecutions = this.learningData.taskExecutions.slice(-1000);
    }

    // パターンを分析・更新
    await this.updateLearningPatterns();
    
    // 学習データを保存
    await this.saveLearningData();

    console.log(`🧠 学習データを更新しました (結果: ${outcome}, 満足度: ${satisfaction}/10)`);
  }

  /**
   * 利用可能なタスクをフィルタリング
   */
  private filterAvailableTasks(context: ITaskContext): ITaskDefinition[] {
    return this.taskPool.filter(task => {
      // 時間制約
      if (task.estimatedDuration > context.availableTime * 60 * 1000) {
        return false;
      }

      // リスクレベル
      const riskLevels = ['low', 'medium', 'high'];
      const maxRiskIndex = riskLevels.indexOf(context.riskTolerance);
      const taskRiskIndex = riskLevels.indexOf(task.riskLevel);
      if (taskRiskIndex > maxRiskIndex) {
        return false;
      }

      // 保守的モードでの制限
      if (context.conservativeMode && task.riskLevel !== 'low') {
        return false;
      }

      // 実験的モードでの促進
      if (context.experimentalMode && task.tags.includes('experimental')) {
        return true;
      }

      // システム負荷による制限
      if (context.currentLoad > 80 && task.complexity > 7) {
        return false;
      }

      return true;
    });
  }

  /**
   * タスクのスコアリング
   */
  private async scoreTask(task: ITaskDefinition, context: ITaskContext): Promise<ITaskScore> {
    let score = 50; // ベーススコア
    const reasoning: string[] = [];
    const adjustments: { [key: string]: number } = {};

    // 1. 基本属性スコア
    const baseScore = this.calculateBaseScore(task, context);
    score += baseScore;
    adjustments.base = baseScore;

    // 2. 時間帯適性スコア
    const timeScore = this.calculateTimeScore(task, context);
    score += timeScore;
    adjustments.time = timeScore;
    if (timeScore > 0) {reasoning.push(`${this.getDayPhase(context.timeOfDay)}に適している`);}

    // 3. フォーカスエリアスコア
    const focusScore = this.calculateFocusScore(task, context);
    score += focusScore;
    adjustments.focus = focusScore;
    if (focusScore > 0) {reasoning.push(`フォーカスエリアに合致`);}

    // 4. リスクレベルスコア
    const riskScore = this.calculateRiskScore(task, context);
    score += riskScore;
    adjustments.risk = riskScore;
    if (riskScore > 0) {reasoning.push(`適切なリスクレベル`);}

    // 5. 学習データに基づくスコア
    const learningScore = this.calculateLearningScore(task, context);
    score += learningScore;
    adjustments.learning = learningScore;
    if (learningScore > 0) {reasoning.push(`過去の成功パターンに合致`);}

    // 6. 依存関係・優先度スコア
    const priorityScore = this.calculatePriorityScore(task, context);
    score += priorityScore;
    adjustments.priority = priorityScore;
    if (priorityScore > 0) {reasoning.push(`高優先度または依存関係を満たす`);}

    // 7. システム負荷調整
    const loadScore = this.calculateLoadScore(task, context);
    score += loadScore;
    adjustments.load = loadScore;
    if (loadScore < 0) {reasoning.push(`システム負荷を考慮`);}

    // 8. ランダム要素（創造性）
    const creativityScore = context.experimentalMode ? Math.random() * 20 - 10 : Math.random() * 10 - 5;
    score += creativityScore;
    adjustments.creativity = creativityScore;

    // スコアを0-100に正規化
    score = Math.max(0, Math.min(100, score));

    // 信頼度を計算
    const confidence = this.calculateConfidence(task, context);

    if (reasoning.length === 0) {
      reasoning.push('基本的な実行条件を満たしている');
    }

    return {
      task,
      score,
      reasoning,
      confidence,
      adjustments
    };
  }

  /**
   * 基本スコアの計算
   */
  private calculateBaseScore(task: ITaskDefinition, context: ITaskContext): number {
    let score = 0;
    
    // 期待効果
    score += task.expectedImpact * 2;
    
    // 優先度
    score += task.priority;
    
    // 複雑度（逆相関）
    score -= task.complexity;
    
    return score;
  }

  /**
   * 時間帯スコアの計算
   */
  private calculateTimeScore(task: ITaskDefinition, context: ITaskContext): number {
    let score = 0;
    
    // 夜間モード (22-06時)
    if (context.timeOfDay >= 22 || context.timeOfDay < 6) {
      if (task.tags.includes('documentation') || task.tags.includes('cleanup')) {
        score += 15;
      }
      if (task.riskLevel === 'low') {
        score += 10;
      }
      if (task.tags.includes('experimental')) {
        score += 20;
      }
    }
    
    // 日中モード (9-18時)
    else if (context.timeOfDay >= 9 && context.timeOfDay <= 18) {
      if (task.category === 'implementation' || task.category === 'testing') {
        score += 10;
      }
      if (task.riskLevel === 'medium') {
        score += 5;
      }
    }
    
    // 学習された時間帯パターンを適用
    const hourPreferences = this.learningData.patterns.timeBasedPreferences[context.timeOfDay.toString()];
    if (hourPreferences?.includes(task.category)) {
      score += 15;
    }
    
    return score;
  }

  /**
   * フォーカススコアの計算
   */
  private calculateFocusScore(task: ITaskDefinition, context: ITaskContext): number {
    if (!context.focusArea) {return 0;}
    
    let score = 0;
    
    // カテゴリマッチ
    if (task.category === context.focusArea) {
      score += 25;
    }
    
    // タグマッチ
    if (task.tags.some(tag => tag.includes(context.focusArea!))) {
      score += 15;
    }
    
    return score;
  }

  /**
   * リスクスコアの計算
   */
  private calculateRiskScore(task: ITaskDefinition, context: ITaskContext): number {
    let score = 0;
    
    // リスク許容度に応じたスコア調整
    const riskLevels = ['low', 'medium', 'high'];
    const toleranceIndex = riskLevels.indexOf(context.riskTolerance);
    const taskRiskIndex = riskLevels.indexOf(task.riskLevel);
    
    if (taskRiskIndex <= toleranceIndex) {
      score += (toleranceIndex - taskRiskIndex + 1) * 5;
    }
    
    // 承認キューサイズによる調整
    if (context.approvalQueueSize > 10 && task.riskLevel === 'low') {
      score += 10; // 承認が溜まっている時は低リスクを優先
    }
    
    return score;
  }

  /**
   * 学習スコアの計算
   */
  private calculateLearningScore(task: ITaskDefinition, context: ITaskContext): number {
    let score = 0;
    
    // 成功したタスクの実行履歴を確認
    const successfulExecutions = this.learningData.taskExecutions.filter(
      exec => exec.taskId === task.id && exec.outcome === 'success'
    );
    
    if (successfulExecutions.length > 0) {
      score += Math.min(successfulExecutions.length * 2, 10);
    }
    
    // 類似コンテキストでの成功パターン
    const similarContextSuccesses = this.learningData.taskExecutions.filter(exec => {
      return exec.outcome === 'success' &&
             Math.abs(exec.context.timeOfDay - context.timeOfDay) <= 2 &&
             exec.context.dayOfWeek === context.dayOfWeek;
    });
    
    if (similarContextSuccesses.length > 0) {
      score += 5;
    }
    
    // 失敗パターンの回避
    const recentFailures = this.learningData.taskExecutions.filter(
      exec => exec.taskId === task.id && 
             exec.outcome === 'failure' &&
             Date.now() - new Date(exec.timestamp).getTime() < 24 * 60 * 60 * 1000 // 24時間以内
    );
    
    if (recentFailures.length > 0) {
      score -= recentFailures.length * 5;
    }
    
    return score;
  }

  /**
   * 利用可能なタスクを取得
   */
  async getAvailableTasks(context: ITaskContext): Promise<ITaskDefinition[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.filterAvailableTasks(context);
  }

  /**
   * 複数タスクを選択
   */
  async selectTasks(context: ITaskContext, count: number = 5): Promise<ITaskScore[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const availableTasks = this.filterAvailableTasks(context);
    if (availableTasks.length === 0) {
      return [];
    }

    const scoredTasks = await Promise.all(
      availableTasks.map(task => this.scoreTask(task, context))
    );

    scoredTasks.sort((a, b) => b.score - a.score);
    return scoredTasks.slice(0, count);
  }

  /**
   * 優先度スコアの計算
   */
  private calculatePriorityScore(task: ITaskDefinition, context: ITaskContext): number {
    let score = 0;
    
    // 基本優先度
    score += task.priority * 2;
    
    // 依存関係のチェック（簡易実装）
    if (task.dependencies.length === 0) {
      score += 5; // 依存関係のないタスクを優先
    }
    
    return score;
  }

  /**
   * システム負荷スコアの計算
   */
  private calculateLoadScore(task: ITaskDefinition, context: ITaskContext): number {
    let score = 0;
    
    if (context.currentLoad > 80) {
      // 高負荷時は軽いタスクを優先
      if (task.complexity <= 5) {
        score += 10;
      } else {
        score -= 15;
      }
    } else if (context.currentLoad < 30) {
      // 低負荷時は重いタスクも可能
      if (task.complexity >= 7) {
        score += 5;
      }
    }
    
    return score;
  }

  /**
   * 信頼度の計算
   */
  private calculateConfidence(task: ITaskDefinition, context: ITaskContext): number {
    let confidence = 50;
    
    // タスクの実行履歴数
    const executionCount = this.learningData.taskExecutions.filter(
      exec => exec.taskId === task.id
    ).length;
    
    confidence += Math.min(executionCount * 5, 30);
    
    // コンテキストの類似性
    const similarContexts = this.learningData.taskExecutions.filter(exec => 
      Math.abs(exec.context.timeOfDay - context.timeOfDay) <= 1 &&
      exec.context.riskTolerance === context.riskTolerance
    ).length;
    
    confidence += Math.min(similarContexts * 2, 20);
    
    return Math.min(confidence, 100);
  }

  /**
   * 学習パターンの更新
   */
  private async updateLearningPatterns(): Promise<void> {
    const executions = this.learningData.taskExecutions;
    
    // 時間帯別成功パターンの分析
    const timeBasedSuccess: { [hour: string]: { [category: string]: number } } = {};
    
    executions.filter(exec => exec.outcome === 'success').forEach(exec => {
      const hour = exec.context.timeOfDay.toString();
      const task = this.taskPool.find(t => t.id === exec.taskId);
      
      if (task) {
        if (!timeBasedSuccess[hour]) {timeBasedSuccess[hour] = {};}
        if (!timeBasedSuccess[hour][task.category]) {timeBasedSuccess[hour][task.category] = 0;}
        timeBasedSuccess[hour][task.category]++;
      }
    });
    
    // 各時間帯の推奨カテゴリを更新
    Object.keys(timeBasedSuccess).forEach(hour => {
      const categories = Object.entries(timeBasedSuccess[hour])
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category);
      
      this.learningData.patterns.timeBasedPreferences[hour] = categories;
    });
    
    console.log(`🧠 学習パターンを更新しました (データ件数: ${executions.length})`);
  }

  /**
   * デフォルトタスクプールの生成
   */
  private async generateDefaultTaskPool(): Promise<ITaskDefinition[]> {
    return [
      {
        id: 'analyze-codebase',
        title: 'コードベース分析',
        description: 'DNSレコード処理の最適化箇所を特定',
        category: 'investigation',
        riskLevel: 'low',
        estimatedDuration: 600000, // 10分
        tags: ['analysis', 'optimization', 'dns'],
        dependencies: [],
        requiredSkills: ['typescript', 'analysis'],
        expectedImpact: 7,
        complexity: 4,
        priority: 8
      },
      {
        id: 'improve-test-coverage',
        title: 'テストカバレッジ向上',
        description: 'analyzeコマンドのテストケース追加',
        category: 'testing',
        riskLevel: 'low',
        estimatedDuration: 900000, // 15分
        tags: ['testing', 'coverage', 'quality'],
        dependencies: [],
        requiredSkills: ['vitest', 'testing'],
        expectedImpact: 8,
        complexity: 5,
        priority: 9
      },
      {
        id: 'optimize-csv-parser',
        title: 'CSVパーサー最適化',
        description: 'CSVパーサーの処理速度向上',
        category: 'implementation',
        riskLevel: 'medium',
        estimatedDuration: 1200000, // 20分
        tags: ['performance', 'optimization', 'csv'],
        dependencies: ['analyze-codebase'],
        requiredSkills: ['typescript', 'performance'],
        expectedImpact: 9,
        complexity: 7,
        priority: 7
      },
      {
        id: 'update-documentation',
        title: 'ドキュメント更新',
        description: 'READMEファイルの内容充実',
        category: 'documentation',
        riskLevel: 'low',
        estimatedDuration: 600000, // 10分
        tags: ['documentation', 'readme', 'cleanup'],
        dependencies: [],
        requiredSkills: ['markdown', 'documentation'],
        expectedImpact: 6,
        complexity: 2,
        priority: 5
      },
      {
        id: 'enhance-error-handling',
        title: 'エラーハンドリング強化',
        description: '不正なCSVファイルに対する処理改善',
        category: 'implementation',
        riskLevel: 'medium',
        estimatedDuration: 800000, // 13分
        tags: ['error_handling', 'robustness', 'validation'],
        dependencies: [],
        requiredSkills: ['typescript', 'error_handling'],
        expectedImpact: 8,
        complexity: 6,
        priority: 8
      },
      {
        id: 'experimental-streaming',
        title: 'ストリーミング処理実験',
        description: '大容量ファイル向けストリーミング処理の検証',
        category: 'implementation',
        riskLevel: 'high',
        estimatedDuration: 1800000, // 30分
        tags: ['experimental', 'streaming', 'performance'],
        dependencies: ['optimize-csv-parser'],
        requiredSkills: ['streaming', 'performance'],
        expectedImpact: 9,
        complexity: 9,
        priority: 6
      }
    ];
  }

  // ユーティリティメソッド
  private getDayPhase(hour: number): string {
    if (hour >= 6 && hour < 12) {return '朝';}
    if (hour >= 12 && hour < 18) {return '昼';}
    if (hour >= 18 && hour < 22) {return '夕';}
    return '夜';
  }

  private getDayName(day: number): string {
    const days = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];
    return days[day];
  }

  // データ操作メソッド
  private async loadLearningData(): Promise<void> {
    try {
      const data = await fs.readFile(this.learningDataFile, 'utf8');
      this.learningData = JSON.parse(data);
    } catch (error) {
      this.learningData = this.getDefaultLearningData();
    }
  }

  private async saveLearningData(): Promise<void> {
    await fs.mkdir(path.dirname(this.learningDataFile), { recursive: true });
    await fs.writeFile(this.learningDataFile, JSON.stringify(this.learningData, null, 2));
  }

  private async loadTaskPool(): Promise<void> {
    try {
      const data = await fs.readFile(this.taskPoolFile, 'utf8');
      this.taskPool = JSON.parse(data);
    } catch (error) {
      this.taskPool = await this.generateDefaultTaskPool();
    }
  }

  private async saveTaskPool(): Promise<void> {
    await fs.mkdir(path.dirname(this.taskPoolFile), { recursive: true });
    await fs.writeFile(this.taskPoolFile, JSON.stringify(this.taskPool, null, 2));
  }

  private getDefaultLearningData(): ILearningData {
    return {
      taskExecutions: [],
      patterns: {
        timeBasedPreferences: {},
        successfulCombinations: [],
        failurePatterns: []
      },
      adaptations: {
        riskAdjustments: {},
        timeAdjustments: {},
        contextualWeights: {}
      }
    };
  }
}