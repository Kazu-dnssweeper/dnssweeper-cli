---
name: zci
description: CI/CDチェーン起動
---

```bash
#!/bin/bash
echo "🚀 CI/CDチェーン起動中..."
echo "📋 デプロイ前チェック → バージョンタグ → リリース準備"

# CI/CDチェーンを起動
nohup python3 /home/hikit/.claude/hooks/infinite_orchestrator_lightweight.py start --mode=cicd_chain > /dev/null 2>&1 &

echo "✅ CI/CDチェーンが開始されました"
echo ""
echo "🎯 実行内容:"
echo "   1. テスト・ビルド実行でデプロイ前チェック"
echo "   2. 自動バージョンタグ付け"
echo "   3. npm pack でリリース準備"
echo ""
echo "📊 確認コマンド:"
echo "   /zl  - プロセス一覧"
echo "   /zx  - 停止"
```