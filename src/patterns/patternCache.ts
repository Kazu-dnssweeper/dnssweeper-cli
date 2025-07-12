/**
 * パターン設定のキャッシュ管理
 */

import { PatternConfig } from '../types/dns';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';

export class PatternCache {
  private cache: Map<string, { config: PatternConfig; hash: string; timestamp: number }> = new Map();
  private ttl: number;

  constructor(ttlMinutes: number = 5) {
    this.ttl = ttlMinutes * 60 * 1000; // ミリ秒に変換
  }

  /**
   * キャッシュからパターン設定を取得
   */
  async get(filePath: string): Promise<PatternConfig | null> {
    const cached = this.cache.get(filePath);
    if (!cached) {
      return null;
    }

    // TTLチェック
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(filePath);
      return null;
    }

    // ファイルハッシュの検証
    try {
      const currentHash = await this.getFileHash(filePath);
      if (currentHash !== cached.hash) {
        this.cache.delete(filePath);
        return null;
      }
    } catch (error) {
      // ファイルが読めない場合はキャッシュをクリア
      this.cache.delete(filePath);
      return null;
    }

    return cached.config;
  }

  /**
   * パターン設定をキャッシュに保存
   */
  async set(filePath: string, config: PatternConfig): Promise<void> {
    try {
      const hash = await this.getFileHash(filePath);
      this.cache.set(filePath, {
        config,
        hash,
        timestamp: Date.now(),
      });
    } catch (error) {
      // ファイルハッシュが取得できない場合はキャッシュしない
      console.warn(`キャッシュ設定エラー: ${error}`);
    }
  }

  /**
   * キャッシュをクリア
   */
  clear(filePath?: string): void {
    if (filePath) {
      this.cache.delete(filePath);
    } else {
      this.cache.clear();
    }
  }

  /**
   * ファイルのハッシュ値を計算
   */
  private async getFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * キャッシュ統計情報を取得
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}