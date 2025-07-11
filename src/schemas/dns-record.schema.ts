/**
 * DNSレコード関連のZodスキーマ定義
 * 型安全性とランタイムバリデーションを提供
 */

import { z } from 'zod';

// DNSレコードタイプの定義
export const DNSRecordTypeSchema = z.enum([
  'A',
  'AAAA',
  'CNAME',
  'MX',
  'TXT',
  'NS',
  'SOA',
  'PTR',
  'SRV',
  'CAA',
  'DS',
  'DNSKEY',
  'HTTPS',
  'SVCB',
  'TLSA'
]);

// DNSレコードの基本スキーマ
export const DNSRecordSchema = z.object({
  // 必須フィールド
  type: DNSRecordTypeSchema,
  name: z.string().min(1, 'レコード名は必須です'),
  content: z.string().min(1, 'コンテンツは必須です'),
  
  // オプションフィールド
  ttl: z.number()
    .positive('TTLは正の数である必要があります')
    .max(86400, 'TTLは86400秒以下である必要があります')
    .optional(),
  priority: z.number()
    .nonnegative('優先度は0以上である必要があります')
    .max(65535, '優先度は65535以下である必要があります')
    .optional(),
  proxied: z.boolean().optional(),
  
  // 日時フィールド（ISO 8601形式）
  created_on: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/, { message: '無効な日時形式です' })
    .optional(),
  modified_on: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/, { message: '無効な日時形式です' })
    .optional(),
  
  // その他
  comment: z.string().max(1024).optional(),
  tags: z.array(z.string()).optional(),
  
  // プロバイダー固有フィールド
  provider: z.string().optional(),
  zone_id: z.string().optional(),
  zone_name: z.string().optional(),
  data: z.record(z.unknown()).optional(), // プロバイダー固有のデータ
});

// リスクカテゴリーの定義
export const RiskCategorySchema = z.enum(['critical', 'high', 'medium', 'low', 'safe']);

// 分析結果のスキーマ
export const AnalysisResultSchema = z.object({
  record: DNSRecordSchema,
  riskScore: z.number()
    .min(0)
    .max(100),
  reasons: z.array(z.string()).min(1),
  category: RiskCategorySchema,
  recommendation: z.string().min(1),
  
  // 追加の分析情報
  matchedPatterns: z.array(z.string()).optional(),
  lastUsed: z.string().optional(),
  references: z.array(z.string()).optional(),
});

// CSVインポート用のスキーマ（Cloudflare形式）
export const CloudflareCSVRowSchema = z.object({
  Type: z.string(),
  Name: z.string(),
  Content: z.string(),
  TTL: z.union([z.string(), z.number()]).optional(),
  Priority: z.union([z.string(), z.number()]).optional(),
  Proxied: z.union([z.string(), z.boolean()]).optional(),
  'Created On': z.string().optional(),
  'Modified On': z.string().optional(),
  Comment: z.string().optional(),
  Tags: z.string().optional(),
});

// プロバイダー別CSVスキーマ
export const Route53CSVRowSchema = z.object({
  Name: z.string(),
  Type: z.string(),
  Value: z.string(),
  TTL: z.union([z.string(), z.number()]).optional(),
  SetIdentifier: z.string().optional(),
  Weight: z.union([z.string(), z.number()]).optional(),
  Region: z.string().optional(),
  HealthCheckId: z.string().optional(),
});

export const GoogleCloudCSVRowSchema = z.object({
  name: z.string(),
  type: z.string(),
  ttl: z.union([z.string(), z.number()]).optional(),
  rrdatas: z.string(),
  kind: z.string().optional(),
});

// 汎用CSVスキーマ（自動検出用）
export const GenericCSVRowSchema = z.record(z.unknown());

// バリデーション結果の型
export const ValidationResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string().optional(),
  })).optional(),
});

// 型エクスポート
export type DNSRecord = z.infer<typeof DNSRecordSchema>;
export type DNSRecordType = z.infer<typeof DNSRecordTypeSchema>;
export type RiskCategory = z.infer<typeof RiskCategorySchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type CloudflareCSVRow = z.infer<typeof CloudflareCSVRowSchema>;
export type Route53CSVRow = z.infer<typeof Route53CSVRowSchema>;
export type GoogleCloudCSVRow = z.infer<typeof GoogleCloudCSVRowSchema>;
export type GenericCSVRow = z.infer<typeof GenericCSVRowSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ヘルパー関数
export function parseCSVRow(row: unknown, provider?: string): DNSRecord | null {
  try {
    let validatedRow: any;
    
    // プロバイダー別のバリデーション
    switch (provider?.toLowerCase()) {
      case 'cloudflare':
        validatedRow = CloudflareCSVRowSchema.parse(row);
        return DNSRecordSchema.parse({
          type: validatedRow.Type,
          name: validatedRow.Name,
          content: validatedRow.Content,
          ttl: validatedRow.TTL ? parseInt(String(validatedRow.TTL)) : undefined,
          priority: validatedRow.Priority ? parseInt(String(validatedRow.Priority)) : undefined,
          proxied: validatedRow.Proxied === 'true' || validatedRow.Proxied === true,
          created_on: validatedRow['Created On'],
          modified_on: validatedRow['Modified On'],
          comment: validatedRow.Comment,
          tags: validatedRow.Tags ? validatedRow.Tags.split(',').map((t: string) => t.trim()) : undefined,
          provider: 'cloudflare',
        });
        
      case 'route53':
      case 'aws':
        validatedRow = Route53CSVRowSchema.parse(row);
        return DNSRecordSchema.parse({
          type: validatedRow.Type,
          name: validatedRow.Name,
          content: validatedRow.Value,
          ttl: validatedRow.TTL ? parseInt(String(validatedRow.TTL)) : undefined,
          provider: 'route53',
          data: {
            setIdentifier: validatedRow.SetIdentifier,
            weight: validatedRow.Weight,
            region: validatedRow.Region,
            healthCheckId: validatedRow.HealthCheckId,
          },
        });
        
      case 'googlecloud':
      case 'gcp':
        validatedRow = GoogleCloudCSVRowSchema.parse(row);
        return DNSRecordSchema.parse({
          type: validatedRow.type.toUpperCase(),
          name: validatedRow.name,
          content: validatedRow.rrdatas,
          ttl: validatedRow.ttl ? parseInt(String(validatedRow.ttl)) : undefined,
          provider: 'googlecloud',
        });
        
      default:
        // 汎用的なパース
        GenericCSVRowSchema.parse(row);
        return null; // 自動検出が必要
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('CSVパースエラー:', error.issues);
    }
    return null;
  }
}

// バリデーションヘルパー
export function validateDNSRecord(record: unknown): ValidationResult {
  try {
    const data = DNSRecordSchema.parse(record);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      };
    }
    return {
      success: false,
      errors: [{ field: 'unknown', message: '不明なエラーが発生しました' }],
    };
  }
}