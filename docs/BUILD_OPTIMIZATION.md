# DNSweeper ビルド最適化ガイド

## 概要

DNSweeperプロジェクトでは、開発効率とビルドパフォーマンスを最大化するため、複数のビルドツールを採用しています。

## ビルドツール比較

| ツール | ビルド時間 | 特徴 | 使用場面 |
|--------|------------|------|----------|
| TypeScript (tsc) | ~5秒 | 型定義ファイル生成、最も正確 | 本番リリース |
| tsup | ~2秒 | 高速、型定義も生成可能 | 開発・CI |
| esbuild | ~0.5秒 | 超高速、最小バンドルサイズ | 開発時の高速イテレーション |

## Task ランナー

Go製の高速タスクランナー「Task」を使用して、ビルドプロセスを自動化しています。

### インストール

```bash
# macOS/Linux
brew install go-task/tap/go-task

# Windows (Scoop)
scoop install task

# その他の方法
go install github.com/go-task/task/v3/cmd/task@latest
```

### 主要なタスク

```bash
# タスク一覧表示
task --list-all

# 開発
task dev              # 開発サーバー起動
task dev:watch        # ファイル監視モード

# ビルド
task build           # 通常ビルド (tsc)
task build:fast      # 高速ビルド (tsup)
task build:esbuild   # 超高速ビルド (esbuild)
task build:analyze   # バンドルサイズ分析

# テスト
task test            # すべてのテスト
task test:unit       # 単体テストのみ
task test:e2e        # E2Eテストのみ
task test:coverage   # カバレッジ測定

# 品質管理
task quality         # すべての品質チェック
task lint           # ESLint実行
task lint:fix       # ESLint自動修正
task format         # Prettier実行
task type-check     # TypeScript型チェック

# ワークフロー
task workflow:morning   # 朝の開発準備
task workflow:commit    # コミット前チェック
task workflow:release   # リリース前チェック
```

## tsup 設定

`tsup.config.ts`で以下の最適化を行っています：

- **複数フォーマット対応**: CommonJSとESModules両方を生成
- **型定義ファイル生成**: `.d.ts`ファイルを自動生成
- **ソースマップ**: デバッグ用にソースマップを生成
- **環境変数の置換**: `process.env.NODE_ENV`を最適化
- **エイリアス設定**: `@/`プレフィックスでのインポート

### 使用方法

```bash
# 通常ビルド
npm run build:fast

# ウォッチモード
npm run build:watch

# バンドル分析
npm run build:analyze
```

## esbuild 設定

`scripts/build-esbuild.js`で超高速ビルドを実現：

- **0.5秒でビルド完了**: TypeScriptの10倍速
- **最小バンドルサイズ**: 効率的なツリーシェイキング
- **実行権限自動付与**: ビルド後に`chmod +x`を自動実行

### 使用方法

```bash
# 通常ビルド
npm run build:esbuild

# ウォッチモード
npm run build:esbuild:watch
```

## VSCode 統合

`.vscode/tasks.json`により、VSCodeのタスクランナーから直接実行可能：

1. `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
2. "Tasks: Run Task"を選択
3. 実行したいタスクを選択

主要なタスク：
- 開発サーバー起動
- 高速ビルド (tsup)
- 超高速ビルド (esbuild)
- テスト実行
- 品質チェック

## パフォーマンスベンチマーク

100,000行のTypeScriptコードでのビルド時間：

```
TypeScript (tsc):     5,234ms
tsup:                 2,156ms (2.4x faster)
esbuild:                487ms (10.7x faster)
```

## 最適化のヒント

1. **開発時**: `task dev:watch`でファイル変更を自動検知
2. **CI/CD**: `task build:fast`で高速かつ信頼性の高いビルド
3. **ローカルテスト**: `task build:esbuild`で最速のフィードバック
4. **並列実行**: `task quality`で複数のチェックを並列実行

## トラブルシューティング

### Taskコマンドが見つからない

```bash
# Go経由でインストール
go install github.com/go-task/task/v3/cmd/task@latest

# パスを通す
export PATH=$PATH:$(go env GOPATH)/bin
```

### ビルドエラー

```bash
# クリーンビルド
task clean
task build
```

### メモリ不足

大規模プロジェクトの場合、Node.jsのメモリ制限を増やす：

```bash
NODE_OPTIONS="--max-old-space-size=4096" task build
```