/**
 * パターン設定ファイルの読み込み機能
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { PatternConfig } from '../types/dns';

/**
 * patterns.jsonファイルを読み込む
 * @param patternFilePath - パターンファイルのパス（省略時はデフォルト）
 * @returns パターン設定
 */
export async function loadPatternConfig(
  patternFilePath?: string,
): Promise<PatternConfig> {
  try {
    // デフォルトのパターンファイルパスを設定
    const defaultPatternPath = join(process.cwd(), 'patterns.json');
    const filePath = patternFilePath || defaultPatternPath;

    // ファイルの存在確認
    await fs.access(filePath);

    // ファイル読み込み
    const configContent = await fs.readFile(filePath, 'utf-8');

    // JSON解析
    const config = JSON.parse(configContent) as PatternConfig;

    // 基本的なバリデーション
    validatePatternConfig(config);

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`パターン設定読み込みエラー: ${error.message}`);
    }
    throw new Error(`パターン設定読み込みエラー: ${String(error)}`);
  }
}

/**
 * パターン設定のバリデーション
 * @param config - 検証するパターン設定
 */
function validatePatternConfig(config: PatternConfig): void {
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

  // スコアリング設定の妥当性チェック
  const { high, medium, low, base } = config.scoring;
  if (high <= medium || medium <= low || low <= base) {
    throw new Error('スコアリング設定が不正です (high > medium > low > base)');
  }

  // 閾値設定の妥当性チェック
  const {
    critical,
    high: highThreshold,
    medium: mediumThreshold,
    low: lowThreshold,
    safe,
  } = config.thresholds;
  if (
    critical <= highThreshold ||
    highThreshold <= mediumThreshold ||
    mediumThreshold <= lowThreshold ||
    lowThreshold <= safe
  ) {
    throw new Error(
      '閾値設定が不正です (critical > high > medium > low > safe)',
    );
  }
}

/**
 * デフォルトのパターン設定を生成
 * @returns デフォルトのパターン設定
 */
export function getDefaultPatternConfig(): PatternConfig {
  return {
    version: '1.0.0',
    description: 'デフォルトDNSレコード判定パターン',
    patterns: {
      prefixes: {
        high: ['old-', 'temp-', 'tmp-', 'test-', 'dev-', 'staging-', 'demo-'],
        medium: ['backup-', 'bak-', 'copy-', 'legacy-'],
        low: ['new-', 'v2-', 'beta-'],
      },
      suffixes: {
        high: ['-old', '-temp', '-tmp', '-test', '-dev', '-bak', '-backup'],
        medium: ['-staging', '-demo', '-legacy', '-copy'],
        low: ['-new', '-v2', '-beta'],
      },
      keywords: {
        high: ['obsolete', 'deprecated', 'unused', 'delete'],
        medium: ['archive', 'historical', 'previous'],
        low: ['future', 'upcoming', 'planned'],
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
}
