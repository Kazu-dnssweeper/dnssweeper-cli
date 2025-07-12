/**
 * パターンファイルの監視機能
 */

import { watch, FSWatcher } from 'fs';
import { EventEmitter } from 'events';
import { PatternConfig } from '../types/dns';
import { loadPatternConfig } from './patternLoader';

export interface PatternChangeEvent {
  filePath: string;
  config: PatternConfig;
  timestamp: Date;
}

export class PatternWatcher extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceDelay: number;

  constructor(debounceDelay: number = 1000) {
    super();
    this.debounceDelay = debounceDelay;
  }

  /**
   * パターンファイルの監視を開始
   */
  watch(filePath: string): void {
    // 既に監視中の場合はスキップ
    if (this.watchers.has(filePath)) {
      return;
    }

    try {
      const watcher = watch(filePath, async (eventType) => {
        if (eventType === 'change') {
          this.handleFileChange(filePath);
        }
      });

      watcher.on('error', (error) => {
        console.error(`ファイル監視エラー (${filePath}):`, error);
        this.emit('error', { filePath, error });
      });

      this.watchers.set(filePath, watcher);
      this.emit('watching', { filePath });
    } catch (error) {
      console.error(`監視開始エラー (${filePath}):`, error);
      this.emit('error', { filePath, error });
    }
  }

  /**
   * パターンファイルの監視を停止
   */
  unwatch(filePath: string): void {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(filePath);
      
      // デバウンスタイマーもクリア
      const timer = this.debounceTimers.get(filePath);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(filePath);
      }
      
      this.emit('unwatched', { filePath });
    }
  }

  /**
   * すべての監視を停止
   */
  unwatchAll(): void {
    for (const filePath of this.watchers.keys()) {
      this.unwatch(filePath);
    }
  }

  /**
   * ファイル変更ハンドラー（デバウンス付き）
   */
  private handleFileChange(filePath: string): void {
    // 既存のタイマーをクリア
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // デバウンスタイマーを設定
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(filePath);
      
      try {
        // 新しいパターン設定を読み込み
        const config = await loadPatternConfig(filePath);
        
        const event: PatternChangeEvent = {
          filePath,
          config,
          timestamp: new Date(),
        };
        
        this.emit('change', event);
      } catch (error) {
        console.error(`パターン再読み込みエラー (${filePath}):`, error);
        this.emit('error', { filePath, error });
      }
    }, this.debounceDelay);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * 監視中のファイル一覧を取得
   */
  getWatchedFiles(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * 監視統計情報を取得
   */
  getStats(): {
    watchedFiles: number;
    pendingChanges: number;
    files: string[];
  } {
    return {
      watchedFiles: this.watchers.size,
      pendingChanges: this.debounceTimers.size,
      files: this.getWatchedFiles(),
    };
  }
}