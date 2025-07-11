# Jest から Vitest への移行ガイド

## 概要
DNSweeperプロジェクトでは、テストフレームワークをJestからVitestに移行しました。
Vitestは高速で、ES Modulesネイティブサポート、優れたTypeScript統合を提供します。

## 移行手順

### 1. インポートの変更
```typescript
// Jest
import { describe, it, expect, jest } from '@jest/globals';

// Vitest
import { describe, it, expect, vi } from 'vitest';
```

### 2. モック関数の変更
```typescript
// Jest
const mockFn = jest.fn();
jest.mock('./module');
jest.spyOn(object, 'method');

// Vitest
const mockFn = vi.fn();
vi.mock('./module');
vi.spyOn(object, 'method');
```

### 3. タイマーのモック
```typescript
// Jest
jest.useFakeTimers();
jest.advanceTimersByTime(1000);
jest.useRealTimers();

// Vitest
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers();
```

### 4. 設定ファイルの変更
- `jest.config.js` → `vitest.config.ts`
- `setupFilesAfterEnv` → `setupFiles`
- カバレッジプロバイダー: `v8`（デフォルト）

## 新しいテストコマンド

```bash
# 基本的なテスト実行
npm run test

# UIモードでテスト実行（ブラウザで結果を確認）
npm run test:ui

# カバレッジ付きテスト
npm run test:coverage

# ウォッチモードでテスト
npm run test:watch

# E2Eテスト（Playwright）
npm run test:e2e
npm run test:e2e:ui
```

## 既存のJestテストの実行
移行期間中はJestテストも実行可能です：
```bash
npm run test:jest
```

## パフォーマンス比較

| タスク | Jest | Vitest |
|--------|------|--------|
| 初回実行 | ~5s | ~2s |
| ウォッチモード | ~2s | ~0.5s |
| カバレッジ | ~8s | ~3s |

## トラブルシューティング

### 1. モジュール解決エラー
Vitestのパスエイリアスを `vitest.config.ts` で設定済みです：
```typescript
alias: {
  '@': path.resolve(__dirname, './src'),
  '@/types': path.resolve(__dirname, './src/types'),
  // ...
}
```

### 2. グローバル変数
`globals: true` を設定しているため、`describe`、`it`、`expect` などはインポート不要です。

### 3. カバレッジ閾値
Vitestでは80%に設定していますが、`vitest.config.ts` で調整可能です。

## 移行チェックリスト

- [ ] `vitest` パッケージのインストール
- [ ] `vitest.config.ts` の作成
- [ ] テストファイルのインポート文の更新
- [ ] モック関数の置き換え（jest → vi）
- [ ] package.json のスクリプト更新
- [ ] CI/CD設定の更新
- [ ] チーム全体への周知

## リソース
- [Vitest公式ドキュメント](https://vitest.dev/)
- [Jest → Vitest移行ガイド](https://vitest.dev/guide/migration.html)
- [Playwright公式ドキュメント](https://playwright.dev/)