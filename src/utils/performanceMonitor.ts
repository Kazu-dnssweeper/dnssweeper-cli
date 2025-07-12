/**
 * パフォーマンス監視ユーティリティ
 */

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  memoryUsed: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private timers: Map<string, number> = new Map();
  private initialMemory: Map<string, number> = new Map();

  /**
   * 計測開始
   */
  startTimer(operation: string): void {
    this.timers.set(operation, Date.now());
    this.initialMemory.set(operation, process.memoryUsage().heapUsed);
  }

  /**
   * 計測終了
   */
  endTimer(operation: string, metadata?: Record<string, any>): PerformanceMetrics | null {
    const startTime = this.timers.get(operation);
    const initialMem = this.initialMemory.get(operation);
    
    if (!startTime || !initialMem) {
      return null;
    }

    const duration = Date.now() - startTime;
    const memoryUsed = process.memoryUsage().heapUsed - initialMem;

    const metric: PerformanceMetrics = {
      operation,
      duration,
      memoryUsed,
      timestamp: new Date(),
      metadata,
    };

    this.metrics.push(metric);
    this.timers.delete(operation);
    this.initialMemory.delete(operation);

    return metric;
  }

  /**
   * 非同期処理の計測
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTimer(operation);
    try {
      const result = await fn();
      this.endTimer(operation, metadata);
      return result;
    } catch (error) {
      this.endTimer(operation, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * 同期処理の計測
   */
  measureSync<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    this.startTimer(operation);
    try {
      const result = fn();
      this.endTimer(operation, metadata);
      return result;
    } catch (error) {
      this.endTimer(operation, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * メトリクス取得
   */
  getMetrics(operation?: string): PerformanceMetrics[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return [...this.metrics];
  }

  /**
   * 統計情報取得
   */
  getStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    avgMemory: number;
    totalMemory: number;
  } | null {
    const targetMetrics = operation
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (targetMetrics.length === 0) {
      return null;
    }

    const durations = targetMetrics.map(m => m.duration);
    const memories = targetMetrics.map(m => m.memoryUsed);

    return {
      count: targetMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      avgMemory: memories.reduce((a, b) => a + b, 0) / memories.length,
      totalMemory: memories.reduce((a, b) => a + b, 0),
    };
  }

  /**
   * レポート生成
   */
  generateReport(): string {
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    const reports: string[] = ['=== Performance Report ===\n'];

    for (const op of operations) {
      const stats = this.getStats(op);
      if (stats) {
        reports.push(`Operation: ${op}`);
        reports.push(`  Count: ${stats.count}`);
        reports.push(`  Avg Duration: ${stats.avgDuration.toFixed(2)}ms`);
        reports.push(`  Min/Max Duration: ${stats.minDuration}ms / ${stats.maxDuration}ms`);
        reports.push(`  Avg Memory: ${(stats.avgMemory / 1024 / 1024).toFixed(2)}MB`);
        reports.push(`  Total Memory: ${(stats.totalMemory / 1024 / 1024).toFixed(2)}MB\n`);
      }
    }

    return reports.join('\n');
  }

  /**
   * メトリクスクリア
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
    this.initialMemory.clear();
  }

  /**
   * CSV形式でエクスポート
   */
  exportToCSV(): string {
    const headers = ['Operation', 'Duration(ms)', 'Memory(MB)', 'Timestamp'];
    const rows = this.metrics.map(m => [
      m.operation,
      m.duration.toString(),
      (m.memoryUsed / 1024 / 1024).toFixed(2),
      m.timestamp.toISOString(),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}