/**
 * patternLoader.ts のユニットテスト
 */

import { loadPatternConfig, getDefaultPatternConfig } from './patternLoader';
import { PatternConfig } from '../types/dns';
import { promises as fs } from 'fs';
import path from 'path';

describe('patternLoader', () => {
  const tempDir = path.join(process.cwd(), 'test', 'temp');
  const tempPatternFile = path.join(tempDir, 'test-patterns.json');

  beforeAll(async () => {
    // テスト用の一時ディレクトリ作成
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // 一時ディレクトリのクリーンアップ
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // エラーは無視
    }
  });

  describe('loadPatternConfig', () => {
    const validConfig: PatternConfig = {
      version: '1.0.0',
      description: 'テスト用パターン設定',
      patterns: {
        prefixes: {
          high: ['old-', 'tmp-'],
          medium: ['backup-'],
          low: ['new-'],
        },
        suffixes: {
          high: ['-old', '-tmp'],
          medium: ['-backup'],
          low: ['-new'],
        },
        keywords: {
          high: ['obsolete'],
          medium: ['archive'],
          low: ['future'],
        },
      },
      scoring: {
        high: 80,
        medium: 50,
        low: 30,
        base: 10,
      },
      thresholds: {
        critical: 90,
        high: 70,
        medium: 50,
        low: 30,
        safe: 0,
      },
    };

    it('正常なパターンファイルを読み込める', async () => {
      // テスト用パターンファイルを作成
      await fs.writeFile(tempPatternFile, JSON.stringify(validConfig, null, 2));

      const config = await loadPatternConfig(tempPatternFile);

      expect(config).toEqual(validConfig);
      expect(config.version).toBe('1.0.0');
      expect(config.patterns.prefixes.high).toContain('old-');
    });

    it('存在しないファイルでエラーが発生する', async () => {
      const nonExistentFile = path.join(tempDir, 'non-existent.json');

      await expect(loadPatternConfig(nonExistentFile)).rejects.toThrow(
        'パターン設定読み込みエラー',
      );
    });

    it('不正なJSONでエラーが発生する', async () => {
      const invalidJson = '{ "version": "1.0.0", invalid json }';
      await fs.writeFile(tempPatternFile, invalidJson);

      await expect(loadPatternConfig(tempPatternFile)).rejects.toThrow(
        'パターン設定読み込みエラー',
      );
    });

    it('バージョン情報がない設定でエラーが発生する', async () => {
      const invalidConfig = { ...validConfig } as Partial<PatternConfig>;
      delete invalidConfig.version;
      await fs.writeFile(tempPatternFile, JSON.stringify(invalidConfig));

      await expect(loadPatternConfig(tempPatternFile)).rejects.toThrow(
        'バージョン情報が必要です',
      );
    });

    it('パターン定義がない設定でエラーが発生する', async () => {
      const invalidConfig = { ...validConfig } as Partial<PatternConfig>;
      delete invalidConfig.patterns;
      await fs.writeFile(tempPatternFile, JSON.stringify(invalidConfig));

      await expect(loadPatternConfig(tempPatternFile)).rejects.toThrow(
        'パターン定義が必要です',
      );
    });

    it('不完全なパターン定義でエラーが発生する', async () => {
      const invalidConfig = {
        ...validConfig,
        patterns: {
          prefixes: { high: ['old-'] },
          // suffixes と keywords が不足
        },
      };
      await fs.writeFile(tempPatternFile, JSON.stringify(invalidConfig));

      await expect(loadPatternConfig(tempPatternFile)).rejects.toThrow(
        'prefixes, suffixes, keywordsの定義が必要です',
      );
    });

    it('スコアリング設定がない設定でエラーが発生する', async () => {
      const invalidConfig = { ...validConfig } as Partial<PatternConfig>;
      delete invalidConfig.scoring;
      await fs.writeFile(tempPatternFile, JSON.stringify(invalidConfig));

      await expect(loadPatternConfig(tempPatternFile)).rejects.toThrow(
        'スコアリング設定が必要です',
      );
    });

    it('閾値設定がない設定でエラーが発生する', async () => {
      const invalidConfig = { ...validConfig } as Partial<PatternConfig>;
      delete invalidConfig.thresholds;
      await fs.writeFile(tempPatternFile, JSON.stringify(invalidConfig));

      await expect(loadPatternConfig(tempPatternFile)).rejects.toThrow(
        '閾値設定が必要です',
      );
    });

    it('不正なスコアリング設定でエラーが発生する', async () => {
      const invalidConfig = {
        ...validConfig,
        scoring: {
          high: 30,
          medium: 50,
          low: 80,
          base: 10,
        },
      };
      await fs.writeFile(tempPatternFile, JSON.stringify(invalidConfig));

      await expect(loadPatternConfig(tempPatternFile)).rejects.toThrow(
        'スコアリング設定が不正です',
      );
    });

    it('不正な閾値設定でエラーが発生する', async () => {
      const invalidConfig = {
        ...validConfig,
        thresholds: {
          critical: 30,
          high: 50,
          medium: 70,
          low: 90,
          safe: 0,
        },
      };
      await fs.writeFile(tempPatternFile, JSON.stringify(invalidConfig));

      await expect(loadPatternConfig(tempPatternFile)).rejects.toThrow(
        '閾値設定が不正です',
      );
    });
  });

  describe('getDefaultPatternConfig', () => {
    it('有効なデフォルト設定を返す', () => {
      const defaultConfig = getDefaultPatternConfig();

      expect(defaultConfig.version).toBeDefined();
      expect(defaultConfig.patterns).toBeDefined();
      expect(defaultConfig.scoring).toBeDefined();
      expect(defaultConfig.thresholds).toBeDefined();

      // デフォルト設定の構造チェック
      expect(defaultConfig.patterns.prefixes.high).toContain('old-');
      expect(defaultConfig.patterns.suffixes.high).toContain('-old');
      expect(defaultConfig.patterns.keywords.high).toContain('obsolete');

      // スコアリング設定の順序チェック
      expect(defaultConfig.scoring.high).toBeGreaterThan(
        defaultConfig.scoring.medium,
      );
      expect(defaultConfig.scoring.medium).toBeGreaterThan(
        defaultConfig.scoring.low,
      );
      expect(defaultConfig.scoring.low).toBeGreaterThan(
        defaultConfig.scoring.base,
      );

      // 閾値設定の順序チェック
      expect(defaultConfig.thresholds.critical).toBeGreaterThan(
        defaultConfig.thresholds.high,
      );
      expect(defaultConfig.thresholds.high).toBeGreaterThan(
        defaultConfig.thresholds.medium,
      );
      expect(defaultConfig.thresholds.medium).toBeGreaterThan(
        defaultConfig.thresholds.low,
      );
      expect(defaultConfig.thresholds.low).toBeGreaterThan(
        defaultConfig.thresholds.safe,
      );
    });

    it('デフォルト設定がバリデーションを通過する', async () => {
      const defaultConfig = getDefaultPatternConfig();

      // テスト用ファイルに書き込んでロードテスト
      await fs.writeFile(
        tempPatternFile,
        JSON.stringify(defaultConfig, null, 2),
      );

      // エラーが発生しないことを確認
      await expect(loadPatternConfig(tempPatternFile)).resolves.toEqual(
        defaultConfig,
      );
    });
  });
});

// テスト終了後のクリーンアップ
afterAll(async () => {
  // ファイルシステム関連のモックをクリア
  jest.restoreAllMocks();
});
