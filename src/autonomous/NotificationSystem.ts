/**
 * 通知システムとコンフィグ管理
 * 自律モードの状態変化や重要なイベントを通知する
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';

// 通知の種類
export type NotificationType = 
  | 'info' | 'success' | 'warning' | 'error' | 'critical'
  | 'task_started' | 'task_completed' | 'task_failed'
  | 'approval_required' | 'queue_overflow' | 'session_ended'
  | 'optimization_available' | 'learning_update';

// 通知データ
export interface INotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'system' | 'task' | 'performance' | 'security' | 'user';
  data?: any;
  actions?: {
    label: string;
    action: string;
    style: 'primary' | 'secondary' | 'danger';
  }[];
  persistent: boolean;
  read: boolean;
}

// 通知設定
export interface INotificationConfig {
  enabled: boolean;
  channels: {
    console: boolean;
    file: boolean;
    email?: {
      enabled: boolean;
      recipient: string;
      smtp?: any;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      headers?: { [key: string]: string };
    };
  };
  filters: {
    minPriority: 'low' | 'medium' | 'high' | 'critical';
    categories: string[];
    types: NotificationType[];
  };
  formatting: {
    timestamps: boolean;
    colors: boolean;
    emojis: boolean;
    verbose: boolean;
  };
  limits: {
    maxNotifications: number;
    retentionDays: number;
    rateLimitPerHour: number;
  };
}

// システム設定
export interface ISystemConfig {
  autonomous: {
    enabled: boolean;
    version: string;
    maxExecutionTime: string;
    autoRestart: boolean;
    pauseOnCriticalError: boolean;
  };
  performance: {
    monitoringEnabled: boolean;
    metricsInterval: number;
    alertThresholds: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
      taskFailureRate: number;
    };
  };
  security: {
    auditLogging: boolean;
    sensitiveDataMasking: boolean;
    allowedOperations: string[];
    blockedPatterns: string[];
  };
  notifications: INotificationConfig;
}

/**
 * 通知システム
 */
export class NotificationSystem extends EventEmitter {
  private config: ISystemConfig;
  private notifications: INotification[] = [];
  private configFile: string;
  private notificationsFile: string;
  private rateLimitTracker: Map<string, number> = new Map();

  constructor() {
    super();
    this.configFile = path.join(process.cwd(), '.dza', 'system-config.json');
    this.notificationsFile = path.join(process.cwd(), '.dza', 'notifications.json');
    this.config = this.getDefaultConfig();
  }

  /**
   * システム初期化
   */
  async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      await this.loadNotifications();
      
      console.log('📢 通知システムを初期化しました');
      console.log(`  ├─ 通知履歴: ${this.notifications.length}件`);
      console.log(`  ├─ コンソール出力: ${this.config.notifications.channels.console ? '有効' : '無効'}`);
      console.log(`  └─ ファイル出力: ${this.config.notifications.channels.file ? '有効' : '無効'}`);
      
      // 古い通知のクリーンアップ
      await this.cleanupOldNotifications();
      
    } catch (error) {
      console.log('⚠️ 通知設定が見つかりません。デフォルト設定を使用します。');
      await this.saveConfig();
    }
  }

  /**
   * 通知の送信
   */
  async notify(
    type: NotificationType,
    title: string,
    message: string,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      category?: 'system' | 'task' | 'performance' | 'security' | 'user';
      data?: any;
      actions?: any[];
      persistent?: boolean;
    } = {}
  ): Promise<string> {
    
    const notification: INotification = {
      id: this.generateNotificationId(),
      type,
      title,
      message,
      timestamp: new Date(),
      priority: options.priority || 'medium',
      category: options.category || 'system',
      data: options.data,
      actions: options.actions,
      persistent: options.persistent || false,
      read: false
    };

    // フィルタリング
    if (!this.shouldSendNotification(notification)) {
      return notification.id;
    }

    // レート制限チェック
    if (!this.checkRateLimit(notification)) {
      console.log(`⚠️ 通知レート制限に達しました: ${type}`);
      return notification.id;
    }

    // 通知を記録
    this.notifications.push(notification);
    
    // 上限チェック
    if (this.notifications.length > this.config.notifications.limits.maxNotifications) {
      this.notifications = this.notifications.slice(-this.config.notifications.limits.maxNotifications);
    }

    // 各チャンネルに送信
    await this.sendToChannels(notification);

    // イベント発火
    this.emit('notification', notification);

    // データ保存
    await this.saveNotifications();

    return notification.id;
  }

  /**
   * 重要な通知（クリティカル）
   */
  async critical(title: string, message: string, data?: any): Promise<string> {
    return this.notify('critical', title, message, {
      priority: 'critical',
      persistent: true,
      data
    });
  }

  /**
   * エラー通知
   */
  async error(title: string, message: string, error?: Error): Promise<string> {
    return this.notify('error', title, message, {
      priority: 'high',
      data: error ? { error: error.message, stack: error.stack } : undefined
    });
  }

  /**
   * 警告通知
   */
  async warning(title: string, message: string, data?: any): Promise<string> {
    return this.notify('warning', title, message, {
      priority: 'medium',
      data
    });
  }

  /**
   * 成功通知
   */
  async success(title: string, message: string, data?: any): Promise<string> {
    return this.notify('success', title, message, {
      priority: 'low',
      data
    });
  }

  /**
   * 情報通知
   */
  async info(title: string, message: string, data?: any): Promise<string> {
    return this.notify('info', title, message, {
      priority: 'low',
      data
    });
  }

  /**
   * タスク関連通知
   */
  async taskNotification(
    type: 'task_started' | 'task_completed' | 'task_failed',
    taskId: string,
    details: any
  ): Promise<string> {
    const titles = {
      task_started: '🚀 タスク開始',
      task_completed: '✅ タスク完了',
      task_failed: '❌ タスク失敗'
    };

    const priorities = {
      task_started: 'low' as const,
      task_completed: 'low' as const,
      task_failed: 'high' as const
    };

    return this.notify(type, titles[type], `タスク: ${taskId}`, {
      priority: priorities[type],
      category: 'task',
      data: { taskId, ...details }
    });
  }

  /**
   * 承認要求通知
   */
  async approvalRequired(taskId: string, reason: string, riskLevel: string): Promise<string> {
    return this.notify('approval_required', '📋 承認が必要です', reason, {
      priority: riskLevel === 'high' ? 'high' : 'medium',
      category: 'user',
      data: { taskId, reason, riskLevel },
      actions: [
        { label: '承認', action: 'approve', style: 'primary' },
        { label: '却下', action: 'reject', style: 'danger' },
        { label: '詳細', action: 'details', style: 'secondary' }
      ],
      persistent: true
    });
  }

  /**
   * 最適化提案通知
   */
  async optimizationAvailable(suggestions: any[]): Promise<string> {
    return this.notify('optimization_available', '⚡ 最適化提案があります', 
      `${suggestions.length}件の最適化案が見つかりました`, {
      priority: 'medium',
      category: 'performance',
      data: { suggestions },
      actions: [
        { label: '確認', action: 'view_optimizations', style: 'primary' },
        { label: '後で', action: 'snooze', style: 'secondary' }
      ]
    });
  }

  /**
   * 未読通知の取得
   */
  getUnreadNotifications(): INotification[] {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * 通知の既読マーク
   */
  async markAsRead(notificationIds: string[]): Promise<void> {
    for (const id of notificationIds) {
      const notification = this.notifications.find(n => n.id === id);
      if (notification) {
        notification.read = true;
      }
    }
    
    await this.saveNotifications();
  }

  /**
   * 通知設定の更新
   */
  async updateConfig(updates: Partial<ISystemConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
    
    console.log('⚙️ システム設定を更新しました');
  }

  /**
   * 設定の取得
   */
  getConfig(): ISystemConfig {
    return { ...this.config };
  }

  /**
   * システム状態の監視開始
   */
  startMonitoring(): void {
    if (!this.config.performance.monitoringEnabled) {return;}

    // CPU/メモリ監視
    setInterval(async () => {
      const stats = await this.getSystemStats();
      
      if (stats.cpuUsage > this.config.performance.alertThresholds.cpuUsage) {
        await this.warning('高CPU使用率', `CPU使用率: ${stats.cpuUsage.toFixed(1)}%`);
      }
      
      if (stats.memoryUsage > this.config.performance.alertThresholds.memoryUsage) {
        await this.warning('高メモリ使用率', `メモリ使用率: ${stats.memoryUsage.toFixed(1)}%`);
      }
      
    }, this.config.performance.metricsInterval);

    console.log('📊 システム監視を開始しました');
  }

  /**
   * フィルタリング判定
   */
  private shouldSendNotification(notification: INotification): boolean {
    const config = this.config.notifications;
    
    if (!config.enabled) {return false;}
    
    // 優先度フィルタ
    const priorities = ['low', 'medium', 'high', 'critical'];
    const minIndex = priorities.indexOf(config.filters.minPriority);
    const notificationIndex = priorities.indexOf(notification.priority);
    
    if (notificationIndex < minIndex) {return false;}
    
    // カテゴリフィルタ
    if (config.filters.categories.length > 0 && 
        !config.filters.categories.includes(notification.category)) {
      return false;
    }
    
    // タイプフィルタ
    if (config.filters.types.length > 0 && 
        !config.filters.types.includes(notification.type)) {
      return false;
    }
    
    return true;
  }

  /**
   * レート制限チェック
   */
  private checkRateLimit(notification: INotification): boolean {
    const key = `${notification.type}-${Math.floor(Date.now() / (60 * 60 * 1000))}`;
    const currentCount = this.rateLimitTracker.get(key) || 0;
    
    if (currentCount >= this.config.notifications.limits.rateLimitPerHour) {
      return false;
    }
    
    this.rateLimitTracker.set(key, currentCount + 1);
    return true;
  }

  /**
   * 各チャンネルに送信
   */
  private async sendToChannels(notification: INotification): Promise<void> {
    const config = this.config.notifications;
    
    // コンソール出力
    if (config.channels.console) {
      this.sendToConsole(notification);
    }
    
    // ファイル出力
    if (config.channels.file) {
      await this.sendToFile(notification);
    }
    
    // メール通知
    if (config.channels.email?.enabled) {
      await this.sendToEmail(notification);
    }
    
    // Webhook通知
    if (config.channels.webhook?.enabled) {
      await this.sendToWebhook(notification);
    }
  }

  /**
   * コンソール出力
   */
  private sendToConsole(notification: INotification): void {
    const config = this.config.notifications.formatting;
    let output = '';
    
    // 絵文字とアイコン
    if (config.emojis) {
      const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        critical: '🚨',
        task_started: '🚀',
        task_completed: '✅',
        task_failed: '❌',
        approval_required: '📋',
        queue_overflow: '📊',
        session_ended: '🏁',
        optimization_available: '⚡',
        learning_update: '🧠'
      };
      output += icons[notification.type] || '📢';
      output += ' ';
    }
    
    // タイトル
    output += notification.title;
    
    // タイムスタンプ
    if (config.timestamps) {
      output += ` [${notification.timestamp.toLocaleTimeString()}]`;
    }
    
    console.log(output);
    
    // 詳細メッセージ
    if (config.verbose && notification.message) {
      console.log(`   ${notification.message}`);
    }
    
    // データ
    if (config.verbose && notification.data) {
      console.log(`   データ:`, notification.data);
    }
  }

  /**
   * ファイル出力
   */
  private async sendToFile(notification: INotification): Promise<void> {
    try {
      const logEntry = {
        timestamp: notification.timestamp.toISOString(),
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        data: notification.data
      };
      
      const logFile = path.join(process.cwd(), '.dza', 'notifications.log');
      await fs.mkdir(path.dirname(logFile), { recursive: true });
      
      const logLine = `${JSON.stringify(logEntry)  }\n`;
      await fs.appendFile(logFile, logLine);
      
    } catch (error) {
      console.error('📢 通知のファイル出力に失敗:', error);
    }
  }

  /**
   * メール通知（簡易実装）
   */
  private async sendToEmail(notification: INotification): Promise<void> {
    // 実際の実装では、nodemailer等を使用
    console.log(`📧 メール通知: ${notification.title}`);
  }

  /**
   * Webhook通知
   */
  private async sendToWebhook(notification: INotification): Promise<void> {
    try {
      const webhook = this.config.notifications.channels.webhook;
      if (!webhook?.url) {return;}
      
      const payload = {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        timestamp: notification.timestamp.toISOString(),
        data: notification.data
      };
      
      // 実際の実装では、fetch等でHTTP POSTリクエストを送信
      console.log(`🔗 Webhook通知: ${webhook.url}`);
      
    } catch (error) {
      console.error('🔗 Webhook通知に失敗:', error);
    }
  }

  /**
   * システム統計の取得
   */
  private async getSystemStats(): Promise<any> {
    try {
      const { loadavg, totalmem, freemem } = await import('os');
      const load = loadavg();
      const totalMem = totalmem();
      const freeMem = freemem();
      
      return {
        cpuUsage: load[0] * 100,
        memoryUsage: ((totalMem - freeMem) / totalMem) * 100,
        diskUsage: 0 // 簡易実装
      };
      
    } catch (error) {
      return { cpuUsage: 0, memoryUsage: 0, diskUsage: 0 };
    }
  }

  /**
   * 古い通知のクリーンアップ
   */
  private async cleanupOldNotifications(): Promise<void> {
    const retentionMs = this.config.notifications.limits.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - retentionMs);
    
    const initialCount = this.notifications.length;
    this.notifications = this.notifications.filter(n => 
      new Date(n.timestamp) > cutoffDate || n.persistent
    );
    
    const removedCount = initialCount - this.notifications.length;
    if (removedCount > 0) {
      console.log(`🗑️ 古い通知を削除しました: ${removedCount}件`);
      await this.saveNotifications();
    }
  }

  // ユーティリティメソッド
  private generateNotificationId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  // デフォルト設定
  private getDefaultConfig(): ISystemConfig {
    return {
      autonomous: {
        enabled: true,
        version: '1.0.0',
        maxExecutionTime: '24h',
        autoRestart: true,
        pauseOnCriticalError: true
      },
      performance: {
        monitoringEnabled: true,
        metricsInterval: 60000, // 1分
        alertThresholds: {
          cpuUsage: 80,
          memoryUsage: 85,
          diskUsage: 90,
          taskFailureRate: 0.3
        }
      },
      security: {
        auditLogging: true,
        sensitiveDataMasking: true,
        allowedOperations: ['read', 'analyze', 'test', 'document'],
        blockedPatterns: ['rm -rf', 'format', 'delete']
      },
      notifications: {
        enabled: true,
        channels: {
          console: true,
          file: true
        },
        filters: {
          minPriority: 'low',
          categories: [],
          types: []
        },
        formatting: {
          timestamps: true,
          colors: true,
          emojis: true,
          verbose: false
        },
        limits: {
          maxNotifications: 1000,
          retentionDays: 7,
          rateLimitPerHour: 100
        }
      }
    };
  }

  // データの保存・読み込み
  private async saveConfig(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.configFile), { recursive: true });
      await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.warn('⚠️ 設定の保存に失敗:', error);
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configFile, 'utf8');
      this.config = { ...this.getDefaultConfig(), ...JSON.parse(data) };
    } catch (error) {
      this.config = this.getDefaultConfig();
    }
  }

  private async saveNotifications(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.notificationsFile), { recursive: true });
      await fs.writeFile(this.notificationsFile, JSON.stringify(this.notifications, null, 2));
    } catch (error) {
      console.warn('⚠️ 通知データの保存に失敗:', error);
    }
  }

  private async loadNotifications(): Promise<void> {
    try {
      const data = await fs.readFile(this.notificationsFile, 'utf8');
      this.notifications = JSON.parse(data);
    } catch (error) {
      this.notifications = [];
    }
  }
}