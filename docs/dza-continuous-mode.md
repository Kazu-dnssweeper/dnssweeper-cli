# DNSweeper 連続実行モード（-c オプション）ガイド

## 概要

連続実行モード（`--continuous` または `-c`）は、タスクが完了しても自動的に次のタスクを選択・実行し続ける特別なモードです。

## 実行方法

### 1. npmスクリプト経由（推奨）

```bash
# 基本的な連続実行
npm run dza:continuous

# 安全な連続実行（低リスク、最大10サイクル）
npm run dza:continuous-safe

# カスタムオプション付き連続実行
npm run dza -- -c --risk=low --focus=testing --max-cycles=5
```

### 2. 直接実行

```bash
# TypeScript経由
ts-node src/index.ts dza -c

# ビルド済みファイル
node dist/index.js dza -c
```

## オプション

### 連続実行モード専用オプション

- `-c, --continuous`: 連続実行モードを有効化
- `--max-cycles <number>`: 最大実行サイクル数（デフォルト: 無制限）

### 組み合わせ可能なオプション

```bash
# 低リスクタスクのみを連続実行
npm run dza -- -c --risk=low

# テストに特化して5サイクルまで実行
npm run dza -- -c --focus=testing --max-cycles=5

# 4時間の制限付きで連続実行
npm run dza -- -c --duration=4h
```

## 注意事項

### ⚠️ Claude Codeカスタムコマンドについて

`/dza` はClaude Codeのカスタムコマンドで、ヘルプテキストを表示するだけです。
実際のCLIコマンドを実行するには、上記のようにターミナルで実行する必要があります。

### 安全な使用のために

1. **初回は制限付きで実行**
   ```bash
   npm run dza:continuous-safe
   ```

2. **定期的な監視**
   - 承認待ちキューの確認: `npm run dzq`
   - 進捗状況の確認

3. **中断方法**
   - `Ctrl+C` でいつでも安全に中断可能
   - 進捗は自動保存されます

## トラブルシューティング

### 引数が渡らない場合

npmスクリプト経由で引数を渡す場合は、必ず `--` を使用してください：

```bash
# ❌ 間違い
npm run dza -c

# ✅ 正しい
npm run dza -- -c
```

### 連続実行が止まらない場合

1. `Ctrl+C` で中断
2. 最大サイクル数を設定：
   ```bash
   npm run dza -- -c --max-cycles=10
   ```

## 実装詳細

連続実行モードの実装は以下のファイルにあります：

- `/src/commands/autonomous.ts`: コマンドエントリーポイント
- `/src/autonomous/ContinuousExecutionMode.ts`: 連続実行ロジック
- `/src/index.ts`: CLIオプション定義（84行目）

## 関連コマンド

- `npm run dza`: 通常の自律モード
- `npm run dzq`: 承認待ちキュー管理
- `/dza`: Claude Codeカスタムコマンド（ヘルプ表示のみ）