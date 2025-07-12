/**
 * 依存関係分析エンジン
 * タスク間の依存関係を分析し、実行順序を最適化する
 */

import { EventEmitter } from 'events';
import { ITaskDefinition } from './TaskSelector';
import { promises as fs } from 'fs';
import path from 'path';

// 依存関係グラフのノード
export interface IDependencyNode {
  taskId: string;
  task: ITaskDefinition;
  dependencies: string[];
  dependents: string[];
  status: 'pending' | 'ready' | 'blocked' | 'completed' | 'failed';
  blockingTasks: string[];
  enabledTasks: string[];
  depth: number;
  criticalPath: boolean;
}

// 依存関係分析結果
export interface IDependencyAnalysis {
  independentTasks: IDependencyNode[];
  dependentGroups: {
    rootTask: IDependencyNode;
    childTasks: IDependencyNode[];
    executionOrder: string[];
  }[];
  blockedTasks: IDependencyNode[];
  criticalPath: IDependencyNode[];
  parallelGroups: IDependencyNode[][];
  estimatedTotalTime: number;
  optimizedSchedule: {
    phase: number;
    tasks: IDependencyNode[];
    estimatedDuration: number;
  }[];
}

// ファイル依存関係
export interface IFileDependency {
  file: string;
  dependencies: string[];
  dependents: string[];
  type: 'source' | 'test' | 'config' | 'documentation';
  lastModified: Date;
  changeImpact: 'low' | 'medium' | 'high';
}

// プロジェクト構造分析
export interface IProjectStructure {
  files: IFileDependency[];
  modules: {
    name: string;
    files: string[];
    dependencies: string[];
    stability: number; // 0-1
    complexity: number; // 0-10
  }[];
  testCoverage: {
    file: string;
    coverage: number;
    missingTests: string[];
  }[];
}

/**
 * 依存関係分析エンジン
 */
export class DependencyAnalyzer extends EventEmitter {
  private dependencyGraphFile: string;
  private projectStructureFile: string;
  private dependencyGraph: Map<string, IDependencyNode>;
  private projectStructure: IProjectStructure | null = null;

  constructor() {
    super();
    this.dependencyGraphFile = path.join(process.cwd(), '.dza', 'dependency-graph.json');
    this.projectStructureFile = path.join(process.cwd(), '.dza', 'project-structure.json');
    this.dependencyGraph = new Map();
  }

  /**
   * 依存関係分析の実行
   */
  async analyzeDependencies(tasks: ITaskDefinition[]): Promise<IDependencyAnalysis> {
    console.log(`\n🔗 依存関係分析中...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // プロジェクト構造を分析
    this.projectStructure = await this.analyzeProjectStructure();

    // 依存関係グラフを構築
    await this.buildDependencyGraph(tasks);

    // 依存関係を解決
    const analysis = await this.resolveDependencies();

    console.log(`✅ 依存関係分析完了`);
    console.log(`  ├─ 独立タスク: ${analysis.independentTasks.length}件`);
    console.log(`  ├─ 依存グループ: ${analysis.dependentGroups.length}件`);
    console.log(`  ├─ ブロック中: ${analysis.blockedTasks.length}件`);
    console.log(`  ├─ 並列実行可能: ${analysis.parallelGroups.length}グループ`);
    console.log(`  └─ 推定総時間: ${Math.round(analysis.estimatedTotalTime / 60000)}分`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 結果をキャッシュ
    await this.saveDependencyGraph();

    return analysis;
  }

  /**
   * 特定タスクの依存関係チェック
   */
  async checkTaskDependencies(taskId: string): Promise<{
    canExecute: boolean;
    blockedBy: string[];
    enabledBy: string[];
    willEnable: string[];
  }> {
    const node = this.dependencyGraph.get(taskId);
    if (!node) {
      return { canExecute: false, blockedBy: [], enabledBy: [], willEnable: [] };
    }

    const blockedBy = node.dependencies.filter(depId => {
      const depNode = this.dependencyGraph.get(depId);
      return depNode?.status !== 'completed';
    });

    const canExecute = blockedBy.length === 0;

    // このタスクが完了すると有効になるタスク
    const willEnable = node.dependents.filter(depId => {
      const depNode = this.dependencyGraph.get(depId);
      if (!depNode) {return false;}
      
      const remainingDeps = depNode.dependencies.filter(id => {
        const n = this.dependencyGraph.get(id);
        return n?.status !== 'completed' && id !== taskId;
      });
      
      return remainingDeps.length === 0;
    });

    return {
      canExecute,
      blockedBy,
      enabledBy: node.dependencies,
      willEnable
    };
  }

  /**
   * タスク完了時の依存関係更新
   */
  async markTaskCompleted(taskId: string): Promise<string[]> {
    const node = this.dependencyGraph.get(taskId);
    if (!node) {return [];}

    node.status = 'completed';

    // 依存していたタスクの状態を更新
    const newlyEnabledTasks: string[] = [];

    for (const dependentId of node.dependents) {
      const dependentNode = this.dependencyGraph.get(dependentId);
      if (!dependentNode) {continue;}

      const check = await this.checkTaskDependencies(dependentId);
      if (check.canExecute && dependentNode.status === 'blocked') {
        dependentNode.status = 'ready';
        newlyEnabledTasks.push(dependentId);
      }
    }

    console.log(`🔗 タスク完了: ${taskId}`);
    if (newlyEnabledTasks.length > 0) {
      console.log(`✅ 新たに実行可能: ${newlyEnabledTasks.join(', ')}`);
    }

    await this.saveDependencyGraph();
    
    return newlyEnabledTasks;
  }

  /**
   * 次に実行すべきタスクの推奨
   */
  async getNextRecommendedTasks(maxTasks: number = 3): Promise<IDependencyNode[]> {
    const readyTasks = Array.from(this.dependencyGraph.values())
      .filter(node => node.status === 'ready');

    // スコアリング（クリティカルパス、深度、影響度を考慮）
    const scoredTasks = readyTasks.map(node => ({
      node,
      score: this.calculateTaskPriority(node)
    }));

    scoredTasks.sort((a, b) => b.score - a.score);

    return scoredTasks.slice(0, maxTasks).map(item => item.node);
  }

  /**
   * プロジェクト構造の分析
   */
  private async analyzeProjectStructure(): Promise<IProjectStructure> {
    console.log(`📁 プロジェクト構造分析中...`);

    const files: IFileDependency[] = [];
    const modules: any[] = [];
    const testCoverage: any[] = [];

    // srcディレクトリを分析
    const srcDir = path.join(process.cwd(), 'src');
    try {
      const srcFiles = await this.scanDirectory(srcDir, ['.ts', '.js']);
      
      for (const file of srcFiles) {
        const dependency = await this.analyzeFileDependencies(file);
        files.push(dependency);
      }

      // モジュール分析
      const moduleMap = await this.analyzeModules(files);
      modules.push(...moduleMap.values());

      // テストカバレッジ分析
      const coverage = await this.analyzeTestCoverage(files);
      testCoverage.push(...coverage);

    } catch (error) {
      console.log(`⚠️ プロジェクト構造分析でエラー: ${error}`);
    }

    console.log(`📊 プロジェクト構造:`);
    console.log(`  ├─ ファイル数: ${files.length}`);
    console.log(`  ├─ モジュール数: ${modules.length}`);
    console.log(`  └─ テスト対象: ${testCoverage.length}`);

    return { files, modules, testCoverage };
  }

  /**
   * ファイルの依存関係分析
   */
  private async analyzeFileDependencies(filePath: string): Promise<IFileDependency> {
    const dependencies: string[] = [];
    const dependents: string[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // import文を解析
      const importMatches = content.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
      for (const match of importMatches) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          // 相対パスの場合は絶対パスに変換
          const absolutePath = path.resolve(path.dirname(filePath), importPath);
          dependencies.push(absolutePath);
        }
      }

      // ファイル統計
      const stats = await fs.stat(filePath);
      
      return {
        file: filePath,
        dependencies,
        dependents, // 後で逆引きで設定
        type: this.getFileType(filePath),
        lastModified: stats.mtime,
        changeImpact: this.assessChangeImpact(filePath, content)
      };

    } catch (error) {
      return {
        file: filePath,
        dependencies: [],
        dependents: [],
        type: 'source',
        lastModified: new Date(),
        changeImpact: 'low'
      };
    }
  }

  /**
   * 依存関係グラフの構築
   */
  private async buildDependencyGraph(tasks: ITaskDefinition[]): Promise<void> {
    this.dependencyGraph.clear();

    // ノードを作成
    for (const task of tasks) {
      const node: IDependencyNode = {
        taskId: task.id,
        task,
        dependencies: [...task.dependencies],
        dependents: [],
        status: task.dependencies.length === 0 ? 'ready' : 'blocked',
        blockingTasks: [],
        enabledTasks: [],
        depth: 0,
        criticalPath: false
      };

      this.dependencyGraph.set(task.id, node);
    }

    // 依存関係を解決
    for (const [taskId, node] of this.dependencyGraph) {
      for (const depId of node.dependencies) {
        const depNode = this.dependencyGraph.get(depId);
        if (depNode) {
          depNode.dependents.push(taskId);
        }
      }
    }

    // 深度を計算
    this.calculateDepths();

    // クリティカルパスを特定
    this.identifyCriticalPath();
  }

  /**
   * 依存関係解決
   */
  private async resolveDependencies(): Promise<IDependencyAnalysis> {
    const independentTasks: IDependencyNode[] = [];
    const dependentGroups: any[] = [];
    const blockedTasks: IDependencyNode[] = [];
    const criticalPath: IDependencyNode[] = [];

    for (const [_, node] of this.dependencyGraph) {
      if (node.dependencies.length === 0) {
        independentTasks.push(node);
      } else if (node.status === 'blocked') {
        blockedTasks.push(node);
      }

      if (node.criticalPath) {
        criticalPath.push(node);
      }
    }

    // 依存グループを分析
    const processedGroups = new Set<string>();
    for (const [_, node] of this.dependencyGraph) {
      if (node.dependencies.length > 0 && !processedGroups.has(node.taskId)) {
        const group = await this.analyzeDependencyGroup(node);
        dependentGroups.push(group);
        
        for (const task of group.childTasks) {
          processedGroups.add(task.taskId);
        }
      }
    }

    // 並列実行グループを特定
    const parallelGroups = this.identifyParallelGroups();

    // 実行スケジュールを最適化
    const optimizedSchedule = this.optimizeExecutionSchedule();

    // 推定総時間を計算
    const estimatedTotalTime = this.calculateEstimatedTime(optimizedSchedule);

    return {
      independentTasks,
      dependentGroups,
      blockedTasks,
      criticalPath,
      parallelGroups,
      estimatedTotalTime,
      optimizedSchedule
    };
  }

  /**
   * 深度計算
   */
  private calculateDepths(): void {
    const visited = new Set<string>();
    
    const dfs = (nodeId: string, currentDepth: number): number => {
      const node = this.dependencyGraph.get(nodeId);
      if (!node || visited.has(nodeId)) {return currentDepth;}
      
      visited.add(nodeId);
      
      let maxDepth = currentDepth;
      for (const depId of node.dependencies) {
        const depDepth = dfs(depId, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depDepth);
      }
      
      node.depth = maxDepth;
      return maxDepth;
    };

    for (const [nodeId, _] of this.dependencyGraph) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, 0);
      }
    }
  }

  /**
   * クリティカルパス特定
   */
  private identifyCriticalPath(): void {
    // 最長パスを計算
    let longestPath: IDependencyNode[] = [];
    let maxTime = 0;

    for (const [_, node] of this.dependencyGraph) {
      if (node.dependents.length === 0) { // 終端ノード
        const path = this.calculateLongestPath(node);
        const pathTime = path.reduce((sum, n) => sum + n.task.estimatedDuration, 0);
        
        if (pathTime > maxTime) {
          maxTime = pathTime;
          longestPath = path;
        }
      }
    }

    // クリティカルパスをマーク
    for (const node of longestPath) {
      node.criticalPath = true;
    }
  }

  /**
   * 最長パス計算
   */
  private calculateLongestPath(endNode: IDependencyNode): IDependencyNode[] {
    const path: IDependencyNode[] = [endNode];
    let currentNode = endNode;

    while (currentNode.dependencies.length > 0) {
      let longestDep: IDependencyNode | null = null;
      let maxTime = 0;

      for (const depId of currentNode.dependencies) {
        const depNode = this.dependencyGraph.get(depId);
        if (depNode && depNode.task.estimatedDuration > maxTime) {
          maxTime = depNode.task.estimatedDuration;
          longestDep = depNode;
        }
      }

      if (longestDep) {
        path.unshift(longestDep);
        currentNode = longestDep;
      } else {
        break;
      }
    }

    return path;
  }

  /**
   * 並列実行グループの特定
   */
  private identifyParallelGroups(): IDependencyNode[][] {
    const groups: IDependencyNode[][] = [];
    const processed = new Set<string>();

    for (const [_, node] of this.dependencyGraph) {
      if (processed.has(node.taskId)) {continue;}

      const group = this.findParallelTasks(node, processed);
      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * 並列実行可能なタスクを検索
   */
  private findParallelTasks(startNode: IDependencyNode, processed: Set<string>): IDependencyNode[] {
    const group = [startNode];
    processed.add(startNode.taskId);

    // 同じ深度で依存関係のないタスクを検索
    for (const [_, node] of this.dependencyGraph) {
      if (processed.has(node.taskId)) {continue;}
      if (node.depth !== startNode.depth) {continue;}

      // 相互に依存関係がないかチェック
      const hasConflict = group.some(groupNode => 
        node.dependencies.includes(groupNode.taskId) ||
        groupNode.dependencies.includes(node.taskId)
      );

      if (!hasConflict) {
        group.push(node);
        processed.add(node.taskId);
      }
    }

    return group;
  }

  // ユーティリティメソッド
  private async scanDirectory(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const subFiles = await this.scanDirectory(fullPath, extensions);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // ディレクトリアクセスエラーは無視
    }
    
    return files;
  }

  private getFileType(filePath: string): 'source' | 'test' | 'config' | 'documentation' {
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {return 'test';}
    if (filePath.includes('config') || filePath.endsWith('.json')) {return 'config';}
    if (filePath.endsWith('.md')) {return 'documentation';}
    return 'source';
  }

  private assessChangeImpact(filePath: string, content: string): 'low' | 'medium' | 'high' {
    // ファイル名やコンテンツに基づいて影響度を評価
    if (filePath.includes('index.') || filePath.includes('main.')) {return 'high';}
    if (content.includes('export') && content.length > 1000) {return 'medium';}
    return 'low';
  }

  private async analyzeDependencyGroup(rootNode: IDependencyNode): Promise<any> {
    // 簡易実装
    return {
      rootTask: rootNode,
      childTasks: [rootNode],
      executionOrder: [rootNode.taskId]
    };
  }

  private optimizeExecutionSchedule(): any[] {
    // 簡易実装
    return [];
  }

  private calculateEstimatedTime(schedule: any[]): number {
    // 簡易実装
    return Array.from(this.dependencyGraph.values())
      .reduce((sum, node) => sum + node.task.estimatedDuration, 0);
  }

  private calculateTaskPriority(node: IDependencyNode): number {
    let score = 0;
    
    // クリティカルパスボーナス
    if (node.criticalPath) {score += 50;}
    
    // 深度による調整（浅い方が高優先度）
    score += (10 - node.depth) * 5;
    
    // 依存タスク数（多い方が高優先度）
    score += node.dependents.length * 3;
    
    // タスクの基本優先度
    score += node.task.priority * 2;
    
    return score;
  }

  private async analyzeModules(files: IFileDependency[]): Promise<Map<string, any>> {
    return new Map();
  }

  private async analyzeTestCoverage(files: IFileDependency[]): Promise<any[]> {
    return [];
  }

  // データ保存・読み込み
  private async saveDependencyGraph(): Promise<void> {
    try {
      const data = {
        nodes: Array.from(this.dependencyGraph.entries()),
        timestamp: new Date().toISOString()
      };
      
      await fs.mkdir(path.dirname(this.dependencyGraphFile), { recursive: true });
      await fs.writeFile(this.dependencyGraphFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('⚠️ 依存関係グラフの保存に失敗:', error);
    }
  }

  private async loadDependencyGraph(): Promise<void> {
    try {
      const data = await fs.readFile(this.dependencyGraphFile, 'utf8');
      const parsed = JSON.parse(data);
      
      this.dependencyGraph = new Map(parsed.nodes);
    } catch (error) {
      // ファイルが存在しない場合は空のグラフから開始
      this.dependencyGraph = new Map();
    }
  }
}