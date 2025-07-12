/**
 * 4フェーズ自動実行エンジン
 * investigate → plan → implement → test のサイクルを自動実行
 */

import { EventEmitter } from 'events';
import { IApprovalTask, ICurrentTask, ProgressManager } from './ProgressManager';
import { promises as fs } from 'fs';
// import path from 'path';

// フェーズ実行結果の型定義
export interface IPhaseResult {
  phase: 'investigate' | 'plan' | 'implement' | 'test';
  success: boolean;
  data: any;
  duration: number;
  errors?: string[];
  requiresApproval?: boolean;
  approvalTasks?: IApprovalTask[];
}

// タスク実行コンテキスト
export interface IExecutionContext {
  taskId: string;
  description: string;
  workingDirectory: string;
  riskLevel: 'low' | 'medium' | 'high';
  startTime: Date;
  maxDuration: number;
  config: IExecutionConfig;
}

// 実行設定
export interface IExecutionConfig {
  phases: {
    investigate: { maxDuration: number; autoSaveInterval: number };
    plan: { maxDuration: number; requireApproval: boolean };
    implement: { maxDuration: number; checkpointInterval: number; rollbackEnabled: boolean };
    test: { maxDuration: number; requiredCoverage: number; autoFixEnabled: boolean };
  };
  security: {
    safeDirectories: string[];
    prohibitedOperations: string[];
    requireApprovalFor: string[];
  };
  timeBasedRules: {
    nightMode: { hours: string; riskLevel: string; experimental: boolean };
    dayMode: { hours: string; approvalStrategy: string; conservative: boolean };
  };
}

/**
 * 4フェーズ自動実行エンジン
 */
export class ExecutionEngine extends EventEmitter {
  private progressManager: ProgressManager;
  private config: IExecutionConfig;
  private isExecuting = false;
  private currentContext: IExecutionContext | null = null;

  constructor(progressManager: ProgressManager, config: IExecutionConfig) {
    super();
    this.progressManager = progressManager;
    this.config = config;
  }

  /**
   * タスクを実行
   */
  async execute(task: ICurrentTask): Promise<boolean> {
    return this.executeFullCycle(task.description, task.riskLevel);
  }

  /**
   * 完全4フェーズサイクルの実行
   */
  async executeFullCycle(taskDescription: string, riskLevel: 'low' | 'medium' | 'high' = 'medium'): Promise<boolean> {
    if (this.isExecuting) {
      throw new Error('別の実行が進行中です');
    }

    this.isExecuting = true;
    
    try {
      // 実行コンテキストの設定
      this.currentContext = {
        taskId: this.generateTaskId(),
        description: taskDescription,
        workingDirectory: process.cwd(),
        riskLevel,
        startTime: new Date(),
        maxDuration: this.calculateMaxDuration(),
        config: this.config
      };

      // const task: ICurrentTask = {
      //   id: this.currentContext.taskId,
      //   title: taskDescription,
      //   description: taskDescription,
      //   category: 'investigation',
      //   riskLevel,
      //   startTime: this.currentContext.startTime,
      //   estimatedDuration: this.currentContext.maxDuration,
      //   status: 'in_progress'
      // };

      console.log(`\n🚀 4フェーズ自動実行開始\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📋 タスク: ${taskDescription}`);
      console.log(`🎯 リスクレベル: ${riskLevel}`);
      console.log(`⏰ 開始時刻: ${this.currentContext.startTime.toLocaleString()}`);
      console.log(`📁 作業ディレクトリ: ${this.currentContext.workingDirectory}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // フェーズ実行
      const phases = ['investigate', 'plan', 'implement', 'test'] as const;
      const results: IPhaseResult[] = [];

      for (const phase of phases) {
        try {
          console.log(`\n🔄 Phase ${phases.indexOf(phase) + 1}/4: ${this.getPhaseIcon(phase)} ${phase.toUpperCase()}`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          
          const result = await this.executePhase(phase, this.currentContext, results);
          results.push(result);

          // 進捗更新
          // const progress = ((phases.indexOf(phase) + 1) / phases.length) * 100;
          await this.progressManager.updatePhaseProgress(phase, 100);

          if (!result.success) {
            throw new Error(`Phase ${phase} failed: ${result.errors?.join(', ')}`);
          }

          // 承認が必要な場合の処理
          if (result.requiresApproval && result.approvalTasks) {
            console.log(`⏸️ 承認が必要です (${result.approvalTasks.length}件)`);
            for (const approvalTask of result.approvalTasks) {
              await this.progressManager.addToApprovalQueue(approvalTask);
            }
            
            // 別のタスクに切り替え
            console.log(`🔄 別のタスクに切り替えます...`);
            return await this.selectAndExecuteAlternativeTask();
          }

          // フェーズ完了
          await this.progressManager.completePhase(phase);
          console.log(`✅ ${phase} フェーズ完了 (${result.duration}ms)`);

        } catch (error) {
          console.error(`❌ ${phase} フェーズでエラー:`, error);
          
          // エラーレコードを追加
          await this.progressManager.addExecutionRecord({
            timestamp: new Date(),
            action: `${phase}_execution`,
            result: 'failure',
            duration: Date.now() - this.currentContext.startTime.getTime(),
            details: { error: error instanceof Error ? error.message : String(error) }
          });

          return false;
        }
      }

      // 全フェーズ完了
      console.log(`\n✅ 4フェーズサイクル完了\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`⏱️ 総実行時間: ${Date.now() - this.currentContext.startTime.getTime()}ms`);
      console.log(`📊 実行結果: ${results.filter(r => r.success).length}/${results.length} フェーズ成功`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // 成功レコードを追加
      await this.progressManager.addExecutionRecord({
        timestamp: new Date(),
        action: 'full_cycle_execution',
        result: 'success',
        duration: Date.now() - this.currentContext.startTime.getTime(),
        details: { results, taskId: this.currentContext.taskId }
      });

      return true;

    } finally {
      this.isExecuting = false;
      this.currentContext = null;
    }
  }

  /**
   * 個別フェーズの実行
   */
  private async executePhase(
    phase: 'investigate' | 'plan' | 'implement' | 'test',
    context: IExecutionContext,
    previousResults: IPhaseResult[]
  ): Promise<IPhaseResult> {
    const startTime = Date.now();
    const phaseConfig = this.config.phases[phase];

    try {
      console.log(`📋 ${phase} フェーズ開始 (最大${phaseConfig.maxDuration}ms)`);
      
      // フェーズ別実行
      let result: any;
      let requiresApproval = false;
      let approvalTasks: IApprovalTask[] = [];

      switch (phase) {
        case 'investigate':
          result = await this.executeInvestigatePhase(context);
          break;
        case 'plan':
          result = await this.executePlanPhase(context, previousResults);
          requiresApproval = (phaseConfig as any).requireApproval && context.riskLevel !== 'low';
          break;
        case 'implement':
          result = await this.executeImplementPhase(context, previousResults);
          requiresApproval = this.shouldRequireApproval(context, result);
          if (requiresApproval) {
            approvalTasks = this.generateApprovalTasks(context, result);
          }
          break;
        case 'test':
          result = await this.executeTestPhase(context, previousResults);
          break;
      }

      const duration = Date.now() - startTime;

      console.log(`✅ ${phase} フェーズ完了 (${duration}ms)`);
      if (result.summary) {
        console.log(`📄 概要: ${result.summary}`);
      }

      return {
        phase,
        success: true,
        data: result,
        duration,
        requiresApproval,
        approvalTasks
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`❌ ${phase} フェーズエラー (${duration}ms):`, error);
      
      return {
        phase,
        success: false,
        data: null,
        duration,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 調査フェーズの実行
   */
  private async executeInvestigatePhase(context: IExecutionContext): Promise<any> {
    console.log(`🔍 コードベース分析中...`);

    // ここで実際のコードベース分析を実行
    // 例: ファイル構造の分析、依存関係の調査、既存コードの理解など
    
    const analysis = {
      codebaseStructure: await this.analyzeCodebaseStructure(context.workingDirectory),
      dependencies: await this.analyzeDependencies(),
      riskAssessment: await this.performRiskAssessment(context),
      recommendations: await this.generateRecommendations(context),
      summary: `コードベース分析完了: ${context.description}に関連する要素を特定`
    };

    console.log(`📊 分析結果:`);
    console.log(`  - ファイル数: ${analysis.codebaseStructure.fileCount}`);
    console.log(`  - 依存関係: ${analysis.dependencies.length}件`);
    console.log(`  - リスク評価: ${analysis.riskAssessment.level}`);
    console.log(`  - 推奨事項: ${analysis.recommendations.length}件`);

    return analysis;
  }

  /**
   * 計画フェーズの実行
   */
  private async executePlanPhase(context: IExecutionContext, previousResults: IPhaseResult[]): Promise<any> {
    console.log(`📋 実装計画作成中...`);

    const investigateResult = previousResults.find(r => r.phase === 'investigate');
    if (!investigateResult?.success) {
      throw new Error('調査フェーズの結果が必要です');
    }

    const plan = {
      approach: await this.determineApproach(context, investigateResult.data),
      steps: await this.createImplementationSteps(context, investigateResult.data),
      estimatedChanges: await this.estimateChanges(context, investigateResult.data),
      riskMitigation: await this.planRiskMitigation(context, investigateResult.data),
      summary: `実装計画作成完了: ${context.description}の実装方針を決定`
    };

    console.log(`📋 計画詳細:`);
    console.log(`  - アプローチ: ${plan.approach}`);
    console.log(`  - 実装ステップ: ${plan.steps.length}件`);
    console.log(`  - 変更予定: ${plan.estimatedChanges.length}箇所`);
    console.log(`  - リスク軽減: ${plan.riskMitigation.length}項目`);

    return plan;
  }

  /**
   * 実装フェーズの実行
   */
  private async executeImplementPhase(context: IExecutionContext, previousResults: IPhaseResult[]): Promise<any> {
    console.log(`⚙️ コード実装中...`);

    const planResult = previousResults.find(r => r.phase === 'plan');
    if (!planResult?.success) {
      throw new Error('計画フェーズの結果が必要です');
    }

    const implementation = {
      filesModified: await this.modifyFiles(context, planResult.data),
      codeChanges: await this.applyCodeChanges(context, planResult.data),
      testsAdded: await this.addTests(context, planResult.data),
      configChanges: await this.updateConfiguration(context, planResult.data),
      summary: `実装完了: ${context.description}の変更を適用`
    };

    console.log(`⚙️ 実装結果:`);
    console.log(`  - 変更ファイル: ${implementation.filesModified.length}件`);
    console.log(`  - コード変更: ${implementation.codeChanges.length}箇所`);
    console.log(`  - テスト追加: ${implementation.testsAdded.length}件`);
    console.log(`  - 設定変更: ${implementation.configChanges.length}件`);

    return implementation;
  }

  /**
   * テストフェーズの実行
   */
  private async executeTestPhase(context: IExecutionContext, previousResults: IPhaseResult[]): Promise<any> {
    console.log(`🧪 テスト実行中...`);

    const implementResult = previousResults.find(r => r.phase === 'implement');
    if (!implementResult?.success) {
      throw new Error('実装フェーズの結果が必要です');
    }

    const testResults = {
      testResults: await this.runTests(context, implementResult.data),
      coverage: await this.measureCoverage(context),
      failedTests: await this.identifyFailedTests(context),
      performanceMetrics: await this.measurePerformance(context),
      summary: `テスト完了: ${context.description}の動作を確認`
    };

    console.log(`🧪 テスト結果:`);
    console.log(`  - テスト実行: ${testResults.testResults.total}件`);
    console.log(`  - カバレッジ: ${testResults.coverage}%`);
    console.log(`  - 失敗テスト: ${testResults.failedTests.length}件`);
    console.log(`  - パフォーマンス: ${testResults.performanceMetrics.executionTime}ms`);

    return testResults;
  }

  /**
   * 代替タスクの選択と実行
   */
  private async selectAndExecuteAlternativeTask(): Promise<boolean> {
    console.log(`\n🔄 代替タスク選択中...`);
    
    // ここで実際の代替タスク選択ロジックを実装
    // 承認待ちにならない安全なタスクを選択
    
    const alternativeTask = await this.findSafeAlternativeTask();
    
    if (alternativeTask) {
      console.log(`🎯 代替タスク選択: ${alternativeTask.description}`);
      return await this.executeFullCycle(alternativeTask.description, alternativeTask.riskLevel);
    } else {
      console.log(`⏸️ 実行可能な代替タスクが見つかりません`);
      return false;
    }
  }

  // ユーティリティメソッド
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  private calculateMaxDuration(): number {
    return Object.values(this.config.phases).reduce((sum, phase) => sum + phase.maxDuration, 0);
  }

  private getPhaseIcon(phase: string): string {
    const icons = {
      investigate: '🔍',
      plan: '📋',
      implement: '⚙️',
      test: '🧪'
    };
    return icons[phase as keyof typeof icons] || '❓';
  }

  private shouldRequireApproval(context: IExecutionContext, result: any): boolean {
    // リスクレベルと変更内容に基づいて承認要否を判定
    if (context.riskLevel === 'high') {return true;}
    if (result.filesModified?.length > 5) {return true;}
    if (result.configChanges?.length > 0) {return true;}
    return false;
  }

  private generateApprovalTasks(context: IExecutionContext, result: any): IApprovalTask[] {
    // 承認タスクを生成
    return result.codeChanges?.map((change: any, index: number) => ({
      id: `approval-${context.taskId}-${index}`,
      command: `apply-change-${index}`,
      context: {
        reason: `実装変更の適用: ${change.description}`,
        parentTask: context.taskId,
        riskLevel: context.riskLevel,
        expectedChanges: [change.file],
        workingDirectory: context.workingDirectory,
        timestamp: new Date()
      },
      dependencies: []
    })) || [];
  }

  // ダミー実装（実際の実装では適切なロジックを実装）
  private async analyzeCodebaseStructure(workingDir: string): Promise<any> {
    const files = await this.getFileList(workingDir);
    return { fileCount: files.length, structure: 'analyzed' };
  }

  private async analyzeDependencies(): Promise<string[]> {
    return ['dependency1', 'dependency2'];
  }

  private async performRiskAssessment(context: IExecutionContext): Promise<any> {
    return { level: context.riskLevel, factors: ['factor1', 'factor2'] };
  }

  private async generateRecommendations(context: IExecutionContext): Promise<string[]> {
    return [`${context.description}に関する推奨事項1`, '推奨事項2'];
  }

  private async determineApproach(context: IExecutionContext, investigateData: any): Promise<string> {
    return `${context.description}の段階的実装アプローチ`;
  }

  private async createImplementationSteps(context: IExecutionContext, investigateData: any): Promise<string[]> {
    return ['ステップ1', 'ステップ2', 'ステップ3'];
  }

  private async estimateChanges(context: IExecutionContext, investigateData: any): Promise<string[]> {
    return ['変更1', '変更2'];
  }

  private async planRiskMitigation(context: IExecutionContext, investigateData: any): Promise<string[]> {
    return ['リスク軽減策1', 'リスク軽減策2'];
  }

  private async modifyFiles(context: IExecutionContext, planData: any): Promise<string[]> {
    return ['file1.ts', 'file2.ts'];
  }

  private async applyCodeChanges(context: IExecutionContext, planData: any): Promise<any[]> {
    return [{ file: 'file1.ts', description: '変更1' }];
  }

  private async addTests(context: IExecutionContext, planData: any): Promise<string[]> {
    return ['test1.test.ts'];
  }

  private async updateConfiguration(context: IExecutionContext, planData: any): Promise<any[]> {
    return [];
  }

  private async runTests(context: IExecutionContext, implementData: any): Promise<any> {
    return { total: 10, passed: 9, failed: 1 };
  }

  private async measureCoverage(context: IExecutionContext): Promise<number> {
    return 85;
  }

  private async identifyFailedTests(context: IExecutionContext): Promise<string[]> {
    return ['failedTest1'];
  }

  private async measurePerformance(context: IExecutionContext): Promise<any> {
    return { executionTime: 150 };
  }

  private async findSafeAlternativeTask(): Promise<{ description: string; riskLevel: 'low' | 'medium' | 'high' } | null> {
    // 安全な代替タスクを検索
    return {
      description: 'ドキュメント更新',
      riskLevel: 'low'
    };
  }

  private async getFileList(directory: string): Promise<string[]> {
    try {
      const files = await fs.readdir(directory);
      return files.filter(file => !file.startsWith('.'));
    } catch {
      return [];
    }
  }
}