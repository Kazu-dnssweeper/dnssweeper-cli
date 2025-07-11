# DNSweeper Zodバリデーション導入ガイド

## 概要

DNSweeperにZodを導入し、型安全性とランタイムバリデーションを強化しました。これにより、実行時エラーの削減と開発時の型補完が向上します。

## 導入されたスキーマ

### 1. DNSレコードスキーマ（`src/schemas/dns-record.schema.ts`）

DNSレコードのバリデーションを提供：

```typescript
import { DNSRecordSchema, validateDNSRecord } from '@/schemas/dns-record.schema';

// バリデーション例
const result = validateDNSRecord({
  type: 'A',
  name: 'example.com',
  content: '192.168.1.1',
  ttl: 3600
});

if (result.success) {
  console.log('有効なDNSレコード:', result.data);
} else {
  console.error('バリデーションエラー:', result.errors);
}
```

### 2. パターン設定スキーマ（`src/schemas/pattern.schema.ts`）

patterns.jsonの型安全性を保証：

```typescript
import { PatternsConfigSchema, validatePatternsConfig } from '@/schemas/pattern.schema';

// パターン設定のバリデーション
const validation = validatePatternsConfig(patternsJson);
if (!validation.valid) {
  validation.errors?.forEach(error => {
    console.error(`${error.type}: ${error.message}`);
  });
}
```

### 3. CLIオプションスキーマ（`src/schemas/cli.schema.ts`）

コマンドライン引数の型安全性：

```typescript
import { validateAnalyzeOptions } from '@/schemas/cli.schema';

try {
  const options = validateAnalyzeOptions({
    output: 'json',
    riskLevel: 'high',
    verbose: true
  });
} catch (error) {
  console.error('無効なオプション:', error.message);
}
```

## エラーハンドリング

### 統一的なエラー処理（`src/utils/error-handler.ts`）

```typescript
import { handleError, withErrorHandling } from '@/utils/error-handler';

// エラーハンドリングラッパー
const safeAnalyze = withErrorHandling(analyzeFunction, 'DNS分析');

// Zodエラーの処理
try {
  const data = schema.parse(input);
} catch (error) {
  handleError(error, 'データバリデーション');
}
```

## 利点

### 1. 型安全性の向上
- コンパイル時の型チェック
- 実行時のバリデーション
- 自動的な型推論

### 2. エラーメッセージの改善
- 日本語/英語のローカライズ
- ユーザーフレンドリーなメッセージ
- 詳細なエラー情報

### 3. 開発効率の向上
- IDEの型補完
- リファクタリングの安全性
- ドキュメントとしての型定義

## プロバイダー別のバリデーション

各DNSプロバイダーのCSV形式に対応：

```typescript
// Cloudflare
CloudflareCSVRowSchema.parse(row);

// AWS Route 53
Route53CSVRowSchema.parse(row);

// Google Cloud DNS
GoogleCloudCSVRowSchema.parse(row);
```

## パフォーマンス考慮事項

### 1. 遅延バリデーション
大量のレコードを処理する際は、必要に応じてバリデーションを遅延：

```typescript
// ストリーミング処理時
if (recordCount % 1000 === 0) {
  // 1000件ごとにバリデーション
  validateBatch(records);
}
```

### 2. スキーマの再利用
スキーマは一度定義して再利用：

```typescript
// グローバルに定義
const recordSchema = DNSRecordSchema;

// 複数箇所で使用
function validateRecord(record: unknown) {
  return recordSchema.safeParse(record);
}
```

## マイグレーション

既存コードからの移行：

```typescript
// Before
if (!record.name || !record.type) {
  throw new Error('必須フィールドが不足');
}

// After
const validated = DNSRecordSchema.parse(record);
// 自動的にエラーをスロー
```

## 今後の拡張

### 1. カスタムバリデーター
```typescript
const CustomDNSSchema = DNSRecordSchema.extend({
  customField: z.string(),
}).refine(
  data => data.type === 'A' ? isValidIPv4(data.content) : true,
  'Aレコードには有効なIPv4アドレスが必要です'
);
```

### 2. 条件付きバリデーション
```typescript
const ConditionalSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('A'), content: IPv4Schema }),
  z.object({ type: z.literal('AAAA'), content: IPv6Schema }),
  z.object({ type: z.literal('CNAME'), content: HostnameSchema }),
]);
```

## トラブルシューティング

### 1. 型エラー
```bash
# TypeScriptの型を再生成
npm run type-check
```

### 2. スキーマの不一致
```typescript
// デバッグモードで詳細表示
process.env.DEBUG = 'true';
const result = schema.safeParse(data);
console.log(result);
```

### 3. パフォーマンス問題
```typescript
// プロファイリング
console.time('validation');
schema.parse(data);
console.timeEnd('validation');
```