/**
 * パターン設定関連のZodスキーマ定義
 * patterns.jsonの型安全性を保証
 */

import { z } from 'zod';

// パターンカテゴリーの定義
export const PatternCategorySchema = z.enum(['critical', 'high', 'medium', 'low']);

// 基本的なパターンルールのスキーマ
export const PatternRuleSchema = z.object({
  pattern: z.string().min(1),
  score: z.number()
    .min(0)
    .max(100),
  category: PatternCategorySchema,
  description: z.string().min(1),
  recommendation: z.string().min(1),
  
  // オプションフィールド
  examples: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  enabled: z.boolean().default(true),
});

// 正規表現パターンルール（追加のバリデーション付き）
export const RegexPatternRuleSchema = PatternRuleSchema.extend({
  pattern: z.string().refine(
    (val) => {
      try {
        new RegExp(val);
        return true;
      } catch {
        return false;
      }
    },
    '無効な正規表現パターンです'
  ),
  flags: z.string().optional(), // 正規表現フラグ（i, g, m など）
});

// レコードタイプ別のルール
export const RecordTypeModifierSchema = z.object({
  condition: z.string().min(1),
  scoreAdjustment: z.number()
    .min(-100)
    .max(100),
  description: z.string().optional(),
});

export const RecordTypeRuleSchema = z.object({
  baseScore: z.number()
    .min(0)
    .max(100),
  modifiers: z.array(RecordTypeModifierSchema),
  description: z.string().optional(),
});

// パターン設定全体のスキーマ
export const PatternsConfigSchema = z.object({
  version: z.string()
    .regex(/^\d+\.\d+\.\d+$/, { message: 'バージョンはセマンティックバージョニング形式である必要があります' }),
  
  // メタデータ
  metadata: z.object({
    lastUpdated: z.string().datetime().optional(),
    author: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
  
  // パターン定義
  patterns: z.object({
    prefixes: z.array(PatternRuleSchema),
    suffixes: z.array(PatternRuleSchema),
    contains: z.array(PatternRuleSchema),
    regex: z.array(RegexPatternRuleSchema),
  }),
  
  // レコードタイプ別ルール
  recordTypeRules: z.record(z.string(), RecordTypeRuleSchema),
  
  // グローバル設定
  settings: z.object({
    defaultScore: z.number().default(0),
    scoringMode: z.enum(['additive', 'maximum', 'average']).default('additive'),
    enableAutoUpdate: z.boolean().default(false),
    cacheTimeout: z.number().positive().default(3600),
  }).optional(),
  
  // カスタムルール（拡張用）
  customRules: z.array(z.object({
    name: z.string(),
    type: z.string(),
    config: z.record(z.string(), z.unknown()),
  })).optional(),
});

// パターンマッチ結果のスキーマ
export const PatternMatchResultSchema = z.object({
  matched: z.boolean(),
  pattern: z.string(),
  type: z.enum(['prefix', 'suffix', 'contains', 'regex']),
  score: z.number(),
  category: PatternCategorySchema,
  description: z.string(),
  recommendation: z.string(),
  matchedText: z.string().optional(),
});

// バリデーション結果のスキーマ
export const PatternValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({
    type: z.string(),
    pattern: z.string(),
    message: z.string(),
  })).optional(),
  warnings: z.array(z.object({
    type: z.string(),
    pattern: z.string(),
    message: z.string(),
  })).optional(),
});

// 型エクスポート
export type PatternCategory = z.infer<typeof PatternCategorySchema>;
export type PatternRule = z.infer<typeof PatternRuleSchema>;
export type RegexPatternRule = z.infer<typeof RegexPatternRuleSchema>;
export type RecordTypeModifier = z.infer<typeof RecordTypeModifierSchema>;
export type RecordTypeRule = z.infer<typeof RecordTypeRuleSchema>;
export type PatternsConfig = z.infer<typeof PatternsConfigSchema>;
export type PatternMatchResult = z.infer<typeof PatternMatchResultSchema>;
export type PatternValidationResult = z.infer<typeof PatternValidationResultSchema>;

// ヘルパー関数

/**
 * patterns.jsonファイルをバリデート
 */
export function validatePatternsConfig(config: unknown): PatternValidationResult {
  try {
    PatternsConfigSchema.parse(config);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(e => ({
        type: e.path.join('.'),
        pattern: '',
        message: e.message,
      }));
      return { valid: false, errors };
    }
    return {
      valid: false,
      errors: [{ type: 'unknown', pattern: '', message: '不明なエラーが発生しました' }],
    };
  }
}

/**
 * パターンルールの重複をチェック
 */
export function checkDuplicatePatterns(config: PatternsConfig): PatternValidationResult {
  const warnings: Array<{ type: string; pattern: string; message: string }> = [];
  const patternSets = new Map<string, Set<string>>();
  
  // 各パターンタイプごとに重複をチェック
  Object.entries(config.patterns).forEach(([type, patterns]) => {
    const set = new Set<string>();
    patterns.forEach((rule: PatternRule | RegexPatternRule) => {
      if (set.has(rule.pattern)) {
        warnings.push({
          type,
          pattern: rule.pattern,
          message: `重複するパターンが見つかりました: ${rule.pattern}`,
        });
      }
      set.add(rule.pattern);
    });
    patternSets.set(type, set);
  });
  
  return {
    valid: warnings.length === 0,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * パターンのパフォーマンスをチェック
 */
export function checkPatternPerformance(pattern: string, type: 'regex' | 'other'): boolean {
  if (type !== 'regex') {return true;}
  
  try {
    new RegExp(pattern);
    // 複雑な正規表現のチェック（例：ネストされた量指定子）
    const complexPatterns = [
      /(\*|\+|\?|\{[^}]+\}){2,}/, // 連続する量指定子
      /\([^)]*\*[^)]*\)/, // グループ内の*
      /\[[^\]]*\^[^\]]*\]/, // 否定文字クラス
    ];
    
    for (const complexPattern of complexPatterns) {
      if (complexPattern.test(pattern)) {
        console.warn(`パフォーマンスに影響する可能性のあるパターン: ${pattern}`);
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * パターンマッチングのテスト
 */
export function testPatternMatch(
  text: string,
  rule: PatternRule | RegexPatternRule,
  type: 'prefix' | 'suffix' | 'contains' | 'regex'
): PatternMatchResult {
  let matched = false;
  let matchedText: string | undefined;
  
  switch (type) {
    case 'prefix':
      matched = text.toLowerCase().startsWith(rule.pattern.toLowerCase());
      if (matched) {matchedText = text.substring(0, rule.pattern.length);}
      break;
      
    case 'suffix':
      matched = text.toLowerCase().endsWith(rule.pattern.toLowerCase());
      if (matched) {matchedText = text.substring(text.length - rule.pattern.length);}
      break;
      
    case 'contains':
      const index = text.toLowerCase().indexOf(rule.pattern.toLowerCase());
      matched = index !== -1;
      if (matched) {matchedText = text.substring(index, index + rule.pattern.length);}
      break;
      
    case 'regex':
      try {
        const regex = new RegExp(rule.pattern, (rule as RegexPatternRule).flags || 'i');
        const match = text.match(regex);
        matched = match !== null;
        if (matched && match) {matchedText = match[0];}
      } catch {
        matched = false;
      }
      break;
  }
  
  return {
    matched,
    pattern: rule.pattern,
    type,
    score: rule.score,
    category: rule.category,
    description: rule.description,
    recommendation: rule.recommendation,
    matchedText,
  };
}