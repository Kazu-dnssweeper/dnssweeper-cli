/**
 * 学習システムと最適化エンジン
 * 実行結果から学習し、タスク選択とスケジューリングを最適化する
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';

// 学習データの型定義
export interface IExecutionMetrics {
  taskId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  outcome: 'success' | 'failure' | 'timeout' | 'approval_required' | 'interrupted';
  context: {
    timeOfDay: number;
    dayOfWeek: number;
    systemLoad: number;
    riskLevel: 'low' | 'medium' | 'high';
    experimentalMode: boolean;
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    executionEfficiency: number; // 予想時間 vs 実際時間
  };
  quality: {
    testsPassed: number;
    testsTotal: number;
    codeQuality: number; // 1-10
    userSatisfaction: number; // 1-10
  };
  errors: string[];
  warnings: string[];
}

// パターン認識結果
export interface ILearningPattern {
  id: string;
  type: 'success' | 'failure' | 'optimal_time' | 'risk_pattern';
  pattern: {
    conditions: { [key: string]: any };
    outcomes: { [key: string]: any };
  };
  confidence: number; // 0-1
  frequency: number;
  lastSeen: Date;
  impact: 'low' | 'medium' | 'high';
}

// 最適化提案
export interface IOptimizationSuggestion {
  id: string;
  type: 'schedule' | 'task_selection' | 'risk_adjustment' | 'resource_allocation';
  title: string;
  description: string;
  impact: {
    timeReduction: number; // パーセント
    successRateImprovement: number; // パーセント
    riskReduction: number; // パーセント
  };
  implementation: {
    complexity: 'low' | 'medium' | 'high';
    effort: number; // 時間（分）
    dependencies: string[];
  };
  confidence: number; // 0-1
}

// パフォーマンス指標
export interface IPerformanceMetrics {
  overall: {
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    efficiencyScore: number; // 0-100
  };
  timeBasedMetrics: {
    [hour: string]: {
      executions: number;
      successRate: number;
      averageTime: number;
    };
  };
  taskTypeMetrics: {
    [category: string]: {
      executions: number;
      successRate: number;
      averageTime: number;
      qualityScore: number;
    };
  };
  trends: {
    successRateTrend: number; // -1 to 1 (悪化 to 改善)
    efficiencyTrend: number;
    qualityTrend: number;
  };
}

/**
 * 学習・最適化システム
 */
export class LearningSystem extends EventEmitter {
  private metricsFile: string;
  private patternsFile: string;
  private optimizationsFile: string;
  private executionHistory: IExecutionMetrics[] = [];
  private learnedPatterns: Map<string, ILearningPattern> = new Map();
  private optimizationSuggestions: IOptimizationSuggestion[] = [];
  private isLearning = false;

  constructor() {
    super();
    this.metricsFile = path.join(process.cwd(), '.dza', 'execution-metrics.json');
    this.patternsFile = path.join(process.cwd(), '.dza', 'learned-patterns.json');
    this.optimizationsFile = path.join(process.cwd(), '.dza', 'optimizations.json');
  }

  /**
   * 学習システムの初期化
   */
  async initialize(): Promise<void> {
    try {
      await this.loadExecutionHistory();
      await this.loadLearnedPatterns();
      await this.loadOptimizations();
      
      console.log('🧠 学習システムを初期化しました');
      console.log(`  ├─ 実行履歴: ${this.executionHistory.length}件`);
      console.log(`  ├─ 学習パターン: ${this.learnedPatterns.size}件`);
      console.log(`  └─ 最適化提案: ${this.optimizationSuggestions.length}件`);
      
    } catch (error) {
      console.log('⚠️ 学習データが見つかりません。新規作成します。');
    }
  }

  /**
   * 実行結果の記録と学習
   */
  async recordExecution(metrics: IExecutionMetrics): Promise<void> {
    this.executionHistory.push(metrics);
    
    // 履歴サイズを制限（最新5000件）
    if (this.executionHistory.length > 5000) {
      this.executionHistory = this.executionHistory.slice(-5000);
    }

    console.log(`📊 実行結果を記録: ${metrics.taskId} (${metrics.outcome})`);

    // 非同期で学習処理を実行
    if (!this.isLearning) {
      this.performLearning();
    }

    // データを保存
    await this.saveExecutionHistory();
  }

  /**
   * パフォーマンス指標の取得
   */
  async getPerformanceMetrics(): Promise<IPerformanceMetrics> {
    const history = this.executionHistory;
    
    if (history.length === 0) {
      return this.getEmptyMetrics();
    }

    // 全体指標
    const totalExecutions = history.length;
    const successfulExecutions = history.filter(h => h.outcome === 'success').length;
    const successRate = successfulExecutions / totalExecutions;
    const averageExecutionTime = history.reduce((sum, h) => sum + h.duration, 0) / totalExecutions;
    
    // 効率性スコア（予想時間 vs 実際時間）
    const efficiencyScores = history.map(h => h.performance.executionEfficiency);
    const efficiencyScore = efficiencyScores.reduce((sum, s) => sum + s, 0) / efficiencyScores.length;

    // 時間帯別指標
    const timeBasedMetrics: { [hour: string]: any } = {};
    for (let hour = 0; hour < 24; hour++) {
      const hourData = history.filter(h => h.context.timeOfDay === hour);
      if (hourData.length > 0) {
        timeBasedMetrics[hour.toString()] = {
          executions: hourData.length,
          successRate: hourData.filter(h => h.outcome === 'success').length / hourData.length,
          averageTime: hourData.reduce((sum, h) => sum + h.duration, 0) / hourData.length
        };
      }
    }

    // タスクタイプ別指標
    const taskTypeMetrics: { [category: string]: any } = {};
    const taskGroups = this.groupBy(history, h => this.getTaskCategory(h.taskId));
    
    for (const [category, data] of taskGroups) {
      const successful = data.filter(h => h.outcome === 'success').length;
      const avgQuality = data.reduce((sum, h) => sum + h.quality.codeQuality, 0) / data.length;
      
      taskTypeMetrics[category] = {
        executions: data.length,
        successRate: successful / data.length,
        averageTime: data.reduce((sum, h) => sum + h.duration, 0) / data.length,
        qualityScore: avgQuality
      };
    }

    // トレンド分析
    const trends = this.analyzeTrends();

    return {
      overall: {
        totalExecutions,
        successRate,
        averageExecutionTime,
        efficiencyScore: efficiencyScore * 100
      },
      timeBasedMetrics,
      taskTypeMetrics,
      trends
    };
  }

  /**
   * 最適化提案の生成
   */
  async generateOptimizationSuggestions(): Promise<IOptimizationSuggestion[]> {
    console.log(`\n⚡ 最適化分析中...`);
    
    const suggestions: IOptimizationSuggestion[] = [];
    const metrics = await this.getPerformanceMetrics();

    // 1. スケジュール最適化
    const scheduleOpt = await this.analyzeScheduleOptimization(metrics);
    if (scheduleOpt) {suggestions.push(scheduleOpt);}

    // 2. タスク選択最適化
    const taskSelectionOpt = await this.analyzeTaskSelectionOptimization(metrics);
    if (taskSelectionOpt) {suggestions.push(taskSelectionOpt);}

    // 3. リスク調整最適化
    const riskOpt = await this.analyzeRiskOptimization(metrics);
    if (riskOpt) {suggestions.push(riskOpt);}

    // 4. リソース配分最適化
    const resourceOpt = await this.analyzeResourceOptimization(metrics);
    if (resourceOpt) {suggestions.push(resourceOpt);}

    // 信頼度でソート
    suggestions.sort((a, b) => b.confidence - a.confidence);

    console.log(`✅ 最適化提案を生成: ${suggestions.length}件`);
    suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion.title} (信頼度: ${(suggestion.confidence * 100).toFixed(1)}%)`);
    });

    this.optimizationSuggestions = suggestions;
    await this.saveOptimizations();

    return suggestions;
  }

  /**
   * 学習パターンの取得
   */
  getLearnedPatterns(): ILearningPattern[] {
    return Array.from(this.learnedPatterns.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 特定条件での成功予測
   */
  predictSuccess(context: any): { probability: number; confidence: number; reasoning: string[] } {
    const relevantPatterns = Array.from(this.learnedPatterns.values())
      .filter(pattern => this.matchesContext(pattern, context))
      .sort((a, b) => b.confidence - a.confidence);

    if (relevantPatterns.length === 0) {
      return {
        probability: 0.5, // 中性的な予測
        confidence: 0.2,
        reasoning: ['学習データ不足']
      };
    }

    // 成功パターンと失敗パターンを分析
    const successPatterns = relevantPatterns.filter(p => p.type === 'success');
    const failurePatterns = relevantPatterns.filter(p => p.type === 'failure');

    const successWeight = successPatterns.reduce((sum, p) => sum + p.confidence * p.frequency, 0);
    const failureWeight = failurePatterns.reduce((sum, p) => sum + p.confidence * p.frequency, 0);

    const totalWeight = successWeight + failureWeight;
    const probability = totalWeight > 0 ? successWeight / totalWeight : 0.5;

    const confidence = Math.min(totalWeight / 100, 1); // 重みから信頼度を計算
    
    const reasoning = [
      `成功パターン: ${successPatterns.length}件`,
      `失敗パターン: ${failurePatterns.length}件`,
      `過去の類似実行: ${relevantPatterns.reduce((sum, p) => sum + p.frequency, 0)}回`
    ];

    return { probability, confidence, reasoning };
  }

  /**
   * 学習処理の実行
   */
  private async performLearning(): Promise<void> {
    if (this.isLearning) {return;}
    
    this.isLearning = true;
    
    try {
      console.log(`🧠 パターン学習中...`);

      // パターン認識
      await this.recognizePatterns();
      
      // パターンの評価と更新
      await this.evaluatePatterns();
      
      // 学習データの保存
      await this.saveLearnedPatterns();
      
      console.log(`✅ 学習完了 (パターン数: ${this.learnedPatterns.size})`);
      
    } catch (error) {
      console.error('❌ 学習処理でエラー:', error);
    } finally {
      this.isLearning = false;
    }
  }

  /**
   * パターン認識
   */
  private async recognizePatterns(): Promise<void> {
    const recentHistory = this.executionHistory.slice(-1000); // 最新1000件で学習

    // 成功パターンの認識
    await this.recognizeSuccessPatterns(recentHistory);
    
    // 失敗パターンの認識
    await this.recognizeFailurePatterns(recentHistory);
    
    // 最適時間パターンの認識
    await this.recognizeOptimalTimePatterns(recentHistory);
    
    // リスクパターンの認識
    await this.recognizeRiskPatterns(recentHistory);
  }

  /**
   * 成功パターンの認識
   */
  private async recognizeSuccessPatterns(history: IExecutionMetrics[]): Promise<void> {
    const successfulExecutions = history.filter(h => h.outcome === 'success');
    
    // 時間帯成功パターン
    const timeGroups = this.groupBy(successfulExecutions, h => h.context.timeOfDay);
    for (const [hour, executions] of timeGroups) {
      if (executions.length >= 5) { // 最小頻度
        const avgQuality = executions.reduce((sum, e) => sum + e.quality.codeQuality, 0) / executions.length;
        
        if (avgQuality > 7) { // 高品質閾値
          const patternId = `success-time-${hour}`;
          this.learnedPatterns.set(patternId, {
            id: patternId,
            type: 'success',
            pattern: {
              conditions: { timeOfDay: hour },
              outcomes: { averageQuality: avgQuality, successRate: 1.0 }
            },
            confidence: Math.min(executions.length / 20, 1),
            frequency: executions.length,
            lastSeen: new Date(),
            impact: avgQuality > 8 ? 'high' : 'medium'
          });
        }
      }
    }

    // リスクレベル成功パターン
    const riskGroups = this.groupBy(successfulExecutions, h => h.context.riskLevel);
    for (const [riskLevel, executions] of riskGroups) {
      if (executions.length >= 3) {
        const avgEfficiency = executions.reduce((sum, e) => sum + e.performance.executionEfficiency, 0) / executions.length;
        
        if (avgEfficiency > 0.8) { // 高効率閾値
          const patternId = `success-risk-${riskLevel}`;
          this.learnedPatterns.set(patternId, {
            id: patternId,
            type: 'success',
            pattern: {
              conditions: { riskLevel },
              outcomes: { averageEfficiency: avgEfficiency }
            },
            confidence: Math.min(executions.length / 15, 1),
            frequency: executions.length,
            lastSeen: new Date(),
            impact: 'medium'
          });
        }
      }
    }
  }

  /**
   * 失敗パターンの認識
   */
  private async recognizeFailurePatterns(history: IExecutionMetrics[]): Promise<void> {
    const failedExecutions = history.filter(h => h.outcome === 'failure');
    
    // システム負荷による失敗パターン
    const highLoadFailures = failedExecutions.filter(h => h.context.systemLoad > 80);
    if (highLoadFailures.length >= 3) {
      const patternId = 'failure-high-load';
      this.learnedPatterns.set(patternId, {
        id: patternId,
        type: 'failure',
        pattern: {
          conditions: { systemLoad: { gte: 80 } },
          outcomes: { failureRate: highLoadFailures.length / failedExecutions.length }
        },
        confidence: Math.min(highLoadFailures.length / 10, 1),
        frequency: highLoadFailures.length,
        lastSeen: new Date(),
        impact: 'high'
      });
    }
  }

  /**
   * 最適時間パターンの認識
   */
  private async recognizeOptimalTimePatterns(history: IExecutionMetrics[]): Promise<void> {
    const timeGroups = this.groupBy(history, h => h.context.timeOfDay);
    
    for (const [hour, executions] of timeGroups) {
      if (executions.length >= 5) {
        const avgEfficiency = executions.reduce((sum, e) => sum + e.performance.executionEfficiency, 0) / executions.length;
        const successRate = executions.filter(e => e.outcome === 'success').length / executions.length;
        
        const overallScore = (avgEfficiency + successRate) / 2;
        
        if (overallScore > 0.8) {
          const patternId = `optimal-time-${hour}`;
          this.learnedPatterns.set(patternId, {
            id: patternId,
            type: 'optimal_time',
            pattern: {
              conditions: { timeOfDay: hour },
              outcomes: { efficiency: avgEfficiency, successRate }
            },
            confidence: Math.min(executions.length / 20, 1),
            frequency: executions.length,
            lastSeen: new Date(),
            impact: overallScore > 0.9 ? 'high' : 'medium'
          });
        }
      }
    }
  }

  /**
   * 学習パターンの評価
   */
  private async evaluatePatterns(): Promise<void> {
    // パターンの有効性を評価し、信頼度を更新
    for (const [id, pattern] of this.learnedPatterns) {
      // 最近のデータで精度を評価
      if (pattern.lastSeen.getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000) {
        // 1週間以上古いパターンは信頼度を下げる
        pattern.confidence *= 0.9;
      }
      
      // 信頼度が低すぎるパターンは削除
      if (pattern.confidence < 0.1) {
        this.learnedPatterns.delete(id);
      }
    }
  }

  /**
   * リスクパターンの認識
   */
  private async recognizeRiskPatterns(history: IExecutionMetrics[]): Promise<void> {
    // 実験的モードでの成功/失敗パターン
    const experimentalExecutions = history.filter(h => h.context.experimentalMode);
    
    if (experimentalExecutions.length >= 5) {
      const successRate = experimentalExecutions.filter(e => e.outcome === 'success').length / experimentalExecutions.length;
      
      const patternId = 'risk-experimental-mode';
      this.learnedPatterns.set(patternId, {
        id: patternId,
        type: 'risk_pattern',
        pattern: {
          conditions: { experimentalMode: true },
          outcomes: { successRate, riskLevel: successRate > 0.7 ? 'low' : 'high' }
        },
        confidence: Math.min(experimentalExecutions.length / 20, 1),
        frequency: experimentalExecutions.length,
        lastSeen: new Date(),
        impact: 'medium'
      });
    }
  }

  // 最適化分析メソッド
  private async analyzeScheduleOptimization(metrics: IPerformanceMetrics): Promise<IOptimizationSuggestion | null> {
    // 時間帯別パフォーマンスを分析
    const timeMetrics = metrics.timeBasedMetrics;
    const bestHours = Object.entries(timeMetrics)
      .filter(([_, data]) => data.successRate > 0.8)
      .sort(([_, a], [__, b]) => b.successRate - a.successRate);

    if (bestHours.length > 0) {
      const bestHour = bestHours[0][0];
      return {
        id: 'schedule-optimization-1',
        type: 'schedule',
        title: `${bestHour}時台での実行を優先`,
        description: `成功率${(timeMetrics[bestHour].successRate * 100).toFixed(1)}%の高パフォーマンス時間帯`,
        impact: {
          timeReduction: 0,
          successRateImprovement: 15,
          riskReduction: 10
        },
        implementation: {
          complexity: 'low',
          effort: 30,
          dependencies: []
        },
        confidence: 0.8
      };
    }

    return null;
  }

  private async analyzeTaskSelectionOptimization(metrics: IPerformanceMetrics): Promise<IOptimizationSuggestion | null> {
    const taskMetrics = metrics.taskTypeMetrics;
    const bestCategory = Object.entries(taskMetrics)
      .sort(([_, a], [__, b]) => (b.successRate + b.qualityScore/10) - (a.successRate + a.qualityScore/10))[0];

    if (bestCategory && bestCategory[1].successRate > 0.8) {
      return {
        id: 'task-selection-optimization-1',
        type: 'task_selection',
        title: `${bestCategory[0]}タスクの優先実行`,
        description: `高成功率・高品質のタスクカテゴリに重点配分`,
        impact: {
          timeReduction: 10,
          successRateImprovement: 20,
          riskReduction: 5
        },
        implementation: {
          complexity: 'medium',
          effort: 60,
          dependencies: ['task-selector']
        },
        confidence: 0.7
      };
    }

    return null;
  }

  private async analyzeRiskOptimization(metrics: IPerformanceMetrics): Promise<IOptimizationSuggestion | null> {
    if (metrics.overall.successRate < 0.7) {
      return {
        id: 'risk-optimization-1',
        type: 'risk_adjustment',
        title: 'リスクレベルの動的調整',
        description: '低成功率時に自動的にリスクレベルを下げる',
        impact: {
          timeReduction: 0,
          successRateImprovement: 25,
          riskReduction: 30
        },
        implementation: {
          complexity: 'high',
          effort: 120,
          dependencies: ['risk-analyzer', 'feedback-loop']
        },
        confidence: 0.9
      };
    }

    return null;
  }

  private async analyzeResourceOptimization(metrics: IPerformanceMetrics): Promise<IOptimizationSuggestion | null> {
    if (metrics.overall.efficiencyScore < 70) {
      return {
        id: 'resource-optimization-1',
        type: 'resource_allocation',
        title: 'リソース配分の最適化',
        description: 'システム負荷に応じた並列度調整',
        impact: {
          timeReduction: 20,
          successRateImprovement: 10,
          riskReduction: 0
        },
        implementation: {
          complexity: 'high',
          effort: 180,
          dependencies: ['load-monitor', 'parallel-executor']
        },
        confidence: 0.6
      };
    }

    return null;
  }

  // ユーティリティメソッド
  private groupBy<T, K>(array: T[], keyFn: (item: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>();
    for (const item of array) {
      const key = keyFn(item);
      const group = map.get(key) || [];
      group.push(item);
      map.set(key, group);
    }
    return map;
  }

  private getTaskCategory(taskId: string): string {
    // タスクIDから簡易的にカテゴリを推定
    if (taskId.includes('test')) {return 'testing';}
    if (taskId.includes('doc')) {return 'documentation';}
    if (taskId.includes('analyze')) {return 'investigation';}
    return 'implementation';
  }

  private matchesContext(pattern: ILearningPattern, context: any): boolean {
    const conditions = pattern.pattern.conditions;
    
    for (const [key, value] of Object.entries(conditions)) {
      if (context[key] !== value) {
        return false;
      }
    }
    
    return true;
  }

  private analyzeTrends(): any {
    if (this.executionHistory.length < 10) {
      return { successRateTrend: 0, efficiencyTrend: 0, qualityTrend: 0 };
    }

    const recentData = this.executionHistory.slice(-50);
    const olderData = this.executionHistory.slice(-100, -50);

    const recentSuccessRate = recentData.filter(h => h.outcome === 'success').length / recentData.length;
    const olderSuccessRate = olderData.filter(h => h.outcome === 'success').length / olderData.length;

    const successRateTrend = recentSuccessRate - olderSuccessRate;

    // 簡易トレンド計算
    return {
      successRateTrend,
      efficiencyTrend: 0, // TODO: 実装
      qualityTrend: 0 // TODO: 実装
    };
  }

  private getEmptyMetrics(): IPerformanceMetrics {
    return {
      overall: {
        totalExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
        efficiencyScore: 0
      },
      timeBasedMetrics: {},
      taskTypeMetrics: {},
      trends: {
        successRateTrend: 0,
        efficiencyTrend: 0,
        qualityTrend: 0
      }
    };
  }

  // データの保存・読み込み
  private async saveExecutionHistory(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.metricsFile), { recursive: true });
      await fs.writeFile(this.metricsFile, JSON.stringify(this.executionHistory, null, 2));
    } catch (error) {
      console.warn('⚠️ 実行履歴の保存に失敗:', error);
    }
  }

  private async loadExecutionHistory(): Promise<void> {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf8');
      this.executionHistory = JSON.parse(data);
    } catch (error) {
      this.executionHistory = [];
    }
  }

  private async saveLearnedPatterns(): Promise<void> {
    try {
      const data = Array.from(this.learnedPatterns.entries());
      await fs.mkdir(path.dirname(this.patternsFile), { recursive: true });
      await fs.writeFile(this.patternsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('⚠️ 学習パターンの保存に失敗:', error);
    }
  }

  private async loadLearnedPatterns(): Promise<void> {
    try {
      const data = await fs.readFile(this.patternsFile, 'utf8');
      const entries = JSON.parse(data);
      this.learnedPatterns = new Map(entries);
    } catch (error) {
      this.learnedPatterns = new Map();
    }
  }

  private async saveOptimizations(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.optimizationsFile), { recursive: true });
      await fs.writeFile(this.optimizationsFile, JSON.stringify(this.optimizationSuggestions, null, 2));
    } catch (error) {
      console.warn('⚠️ 最適化データの保存に失敗:', error);
    }
  }

  private async loadOptimizations(): Promise<void> {
    try {
      const data = await fs.readFile(this.optimizationsFile, 'utf8');
      this.optimizationSuggestions = JSON.parse(data);
    } catch (error) {
      this.optimizationSuggestions = [];
    }
  }
}