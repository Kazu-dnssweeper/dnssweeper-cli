/**
 * リモートパターンファイルの読み込み機能
 */

import { PatternConfig } from '../types/dns';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import https from 'https';
import http from 'http';
import { URL } from 'url';

export interface RemotePatternOptions {
  cacheDir?: string;
  timeout?: number;
  maxSize?: number;
}

export class PatternRemoteLoader {
  private cacheDir: string;
  private timeout: number;
  private maxSize: number;

  constructor(options: RemotePatternOptions = {}) {
    this.cacheDir = options.cacheDir || join(tmpdir(), 'dnsweeper-patterns');
    this.timeout = options.timeout || 30000; // 30秒
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
  }

  /**
   * URLからパターンファイルをダウンロード
   */
  async downloadPattern(url: string): Promise<string> {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const request = protocol.get(url, { timeout: this.timeout }, (response) => {
        // ステータスコードチェック
        if (response.statusCode !== 200) {
          reject(new Error(`HTTPエラー: ${response.statusCode}`));
          return;
        }

        // Content-Lengthチェック
        const contentLength = parseInt(response.headers['content-length'] || '0', 10);
        if (contentLength > this.maxSize) {
          reject(new Error(`ファイルサイズが制限を超えています: ${contentLength} bytes`));
          return;
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;

        response.on('data', (chunk: Buffer) => {
          totalSize += chunk.length;
          
          // ダウンロード中のサイズチェック
          if (totalSize > this.maxSize) {
            request.destroy();
            reject(new Error(`ダウンロードサイズが制限を超えました`));
            return;
          }
          
          chunks.push(chunk);
        });

        response.on('end', () => {
          const content = Buffer.concat(chunks).toString('utf-8');
          resolve(content);
        });

        response.on('error', (error) => {
          reject(new Error(`ダウンロードエラー: ${error.message}`));
        });
      });

      request.on('error', (error) => {
        reject(new Error(`リクエストエラー: ${error.message}`));
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('リクエストタイムアウト'));
      });
    });
  }

  /**
   * リモートパターンをキャッシュ付きで読み込み
   */
  async loadRemotePattern(url: string, forceRefresh: boolean = false): Promise<PatternConfig> {
    // キャッシュディレクトリの作成
    await fs.mkdir(this.cacheDir, { recursive: true });

    // URLからキャッシュファイル名を生成
    const urlHash = createHash('md5').update(url).digest('hex');
    const cacheFile = join(this.cacheDir, `pattern-${urlHash}.json`);
    const metaFile = join(this.cacheDir, `pattern-${urlHash}.meta`);

    // キャッシュの確認
    if (!forceRefresh) {
      try {
        const cached = await this.loadFromCache(cacheFile, metaFile);
        if (cached) {
          return cached;
        }
      } catch {
        // キャッシュ読み込みエラーは無視
      }
    }

    // リモートからダウンロード
    const content = await this.downloadPattern(url);
    
    // JSONパース
    let config: PatternConfig;
    try {
      config = JSON.parse(content);
    } catch (error) {
      throw new Error(`JSONパースエラー: ${error}`);
    }

    // バリデーション（patternLoaderの関数を使用）
    this.validateRemotePattern(config);

    // キャッシュに保存
    await this.saveToCache(cacheFile, metaFile, config, url);

    return config;
  }

  /**
   * キャッシュから読み込み
   */
  private async loadFromCache(cacheFile: string, metaFile: string): Promise<PatternConfig | null> {
    try {
      // メタデータの読み込み
      const metaContent = await fs.readFile(metaFile, 'utf-8');
      const meta = JSON.parse(metaContent);

      // キャッシュの有効期限チェック（24時間）
      const cacheAge = Date.now() - new Date(meta.timestamp).getTime();
      if (cacheAge > 24 * 60 * 60 * 1000) {
        return null;
      }

      // キャッシュファイルの読み込み
      const content = await fs.readFile(cacheFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * キャッシュに保存
   */
  private async saveToCache(
    cacheFile: string,
    metaFile: string,
    config: PatternConfig,
    url: string
  ): Promise<void> {
    // パターン設定を保存
    await fs.writeFile(cacheFile, JSON.stringify(config, null, 2));

    // メタデータを保存
    const meta = {
      url,
      timestamp: new Date().toISOString(),
      version: config.version,
    };
    await fs.writeFile(metaFile, JSON.stringify(meta, null, 2));
  }

  /**
   * リモートパターンのバリデーション
   */
  private validateRemotePattern(config: PatternConfig): void {
    if (!config.version) {
      throw new Error('バージョン情報が必要です');
    }

    if (!config.patterns) {
      throw new Error('パターン定義が必要です');
    }

    if (
      !config.patterns.prefixes ||
      !config.patterns.suffixes ||
      !config.patterns.keywords
    ) {
      throw new Error('prefixes, suffixes, keywordsの定義が必要です');
    }

    if (!config.scoring) {
      throw new Error('スコアリング設定が必要です');
    }

    if (!config.thresholds) {
      throw new Error('閾値設定が必要です');
    }

    // リモートパターンの追加検証
    const totalPatterns = 
      Object.values(config.patterns.prefixes).flat().length +
      Object.values(config.patterns.suffixes).flat().length +
      Object.values(config.patterns.keywords).flat().length;

    if (totalPatterns > 1000) {
      throw new Error('パターン数が多すぎます（最大1000個）');
    }
  }

  /**
   * キャッシュをクリア
   */
  async clearCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.startsWith('pattern-')) {
          await fs.unlink(join(this.cacheDir, file));
        }
      }
    } catch {
      // エラーは無視
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  async getCacheStats(): Promise<{
    cacheDir: string;
    cachedPatterns: number;
    totalSize: number;
  }> {
    let cachedPatterns = 0;
    let totalSize = 0;

    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          cachedPatterns++;
          const stats = await fs.stat(join(this.cacheDir, file));
          totalSize += stats.size;
        }
      }
    } catch {
      // エラーは無視
    }

    return {
      cacheDir: this.cacheDir,
      cachedPatterns,
      totalSize,
    };
  }
}