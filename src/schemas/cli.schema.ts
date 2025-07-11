/**
 * CLIコマンドラインオプションのZodスキーマ
 * コマンドライン引数の型安全性を保証
 */

import { z } from 'zod';
import { RiskCategorySchema } from './dns-record.schema';

/**
 * 出力フォーマットの定義
 */
export const OutputFormatSchema = z.enum(['table', 'json', 'csv']);

/**
 * analyzeコマンドのオプション
 */
export const AnalyzeOptionsSchema = z.object({
  // 基本オプション
  output: OutputFormatSchema.default('table'),
  outputFile: z.string().optional(),
  
  // フィルタリングオプション
  riskLevel: RiskCategorySchema.optional(),
  type: z.string().optional(),
  pattern: z.string().optional(),
  
  // プロバイダー設定
  provider: z.string().optional(),
  
  // 表示オプション
  verbose: z.boolean().default(false),
  quiet: z.boolean().default(false),
  noColor: z.boolean().default(false),
  
  // 言語設定
  english: z.boolean().default(false),
  
  // パフォーマンス設定
  stream: z.boolean().default(false),
  chunkSize: z.number().positive().default(1000),
  
  // デバッグ
  debug: z.boolean().default(false),
}).refine(
  data => !(data.verbose && data.quiet),
  { message: 'verboseとquietは同時に指定できません' }
);

/**
 * configコマンドのオプション
 */
export const ConfigOptionsSchema = z.object({
  action: z.enum(['show', 'set', 'reset']).optional(),
  key: z.string().optional(),
  value: z.string().optional(),
  global: z.boolean().default(false),
});

/**
 * validateコマンドのオプション
 */
export const ValidateOptionsSchema = z.object({
  strict: z.boolean().default(false),
  showWarnings: z.boolean().default(true),
  format: OutputFormatSchema.default('table'),
});

/**
 * CLIコマンドの定義
 */
export const CommandSchema = z.enum(['analyze', 'config', 'validate', 'help', 'version']);

/**
 * CLI全体の引数スキーマ
 */
export const CLIArgumentsSchema = z.object({
  command: CommandSchema,
  args: z.array(z.string()),
  options: z.record(z.unknown()),
});

// 型エクスポート
export type OutputFormat = z.infer<typeof OutputFormatSchema>;
export type AnalyzeOptions = z.infer<typeof AnalyzeOptionsSchema>;
export type ConfigOptions = z.infer<typeof ConfigOptionsSchema>;
export type ValidateOptions = z.infer<typeof ValidateOptionsSchema>;
export type Command = z.infer<typeof CommandSchema>;
export type CLIArguments = z.infer<typeof CLIArgumentsSchema>;

/**
 * コマンドラインオプションをバリデート
 */
export function validateAnalyzeOptions(options: unknown): AnalyzeOptions {
  try {
    return AnalyzeOptionsSchema.parse(options);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(e => {
        const path = e.path.join('.');
        return `${path}: ${e.message}`;
      });
      throw new Error(`オプションエラー:\n${messages.join('\n')}`);
    }
    throw error;
  }
}

/**
 * ファイルパスのバリデーション
 */
export const FilePathSchema = z.string().refine(
  (path) => {
    // 基本的なパスの妥当性チェック
    if (!path || path.length === 0) return false;
    
    // 危険な文字のチェック
    const dangerousChars = ['../', '\\..', '\0'];
    return !dangerousChars.some(char => path.includes(char));
  },
  { message: 'ファイルパスが無効です' }
);

/**
 * CSVファイルパスのバリデーション
 */
export const CSVFilePathSchema = FilePathSchema.refine(
  (path) => path.toLowerCase().endsWith('.csv'),
  { message: 'CSVファイルを指定してください' }
);

/**
 * パターンファイルパスのバリデーション
 */
export const PatternFilePathSchema = FilePathSchema.refine(
  (path) => path.toLowerCase().endsWith('.json'),
  { message: 'JSONファイルを指定してください' }
);

/**
 * 数値オプションのバリデーション
 */
export function parseNumericOption(value: string, name: string, min?: number, max?: number): number {
  const num = parseInt(value, 10);
  
  if (isNaN(num)) {
    throw new Error(`${name}は数値である必要があります: ${value}`);
  }
  
  if (min !== undefined && num < min) {
    throw new Error(`${name}は${min}以上である必要があります: ${num}`);
  }
  
  if (max !== undefined && num > max) {
    throw new Error(`${name}は${max}以下である必要があります: ${num}`);
  }
  
  return num;
}

/**
 * ブール値オプションのバリデーション
 */
export function parseBooleanOption(value: string | boolean, name: string): boolean {
  if (typeof value === 'boolean') return value;
  
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
    return true;
  }
  if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
    return false;
  }
  
  throw new Error(`${name}はtrue/falseである必要があります: ${value}`);
}