---
name: dza
description: DNSweeper Autonomous Mode - 24時間無限タスク実行
---

# DNSweeper Autonomous Mode 起動

DNSweeperの無限タスク実行システムを起動します。

```bash
#!/bin/bash

# 初期タスクの生成
echo "🚀 DNSweeper Autonomous Mode を起動します..."

# プロジェクトディレクトリに移動
cd /mnt/c/projects/dnssweeper-cli

# TypeScriptのビルド確認
if [ ! -d "dist" ]; then
    echo "📦 プロジェクトをビルド中..."
    npm run build
fi

# Autonomous Mode の起動
echo "🔄 無限タスク実行を開始..."
node dist/index.js autonomous --mode dns

# 以下のモードが利用可能:
# - dns: DNS監視タスクチェーン
# - security: セキュリティ監視チェーン  
# - dev: 開発タスクチェーン
```

このモードでは以下の処理が自動的に実行されます:

1. **プロジェクト状態分析**: 現在の状態を分析
2. **テスト実行**: すべてのテストを実行
3. **ビルドチェック**: ビルド状態を確認
4. **コード品質分析**: TypeScript型チェック
5. **ドキュメント更新チェック**: ドキュメントの整合性確認
6. **依存関係チェック**: npmパッケージの更新確認

時間帯に応じて自動的にタスクが切り替わります:
- 朝 (6-12時): ビルドとテストを重点的に
- 昼 (12-17時): コード品質と開発タスク
- 夕方 (17-22時): ドキュメント更新
- 夜間 (22-6時): 依存関係チェックとメンテナンス

停止するには `Ctrl+C` を押してください。