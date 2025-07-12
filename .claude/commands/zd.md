---
name: zd
description: 開発モード固定で無限実行
---

```bash
#!/bin/bash
echo "💻 開発モード固定で起動..."
echo "📊 リアルタイム表示が有効です"

# 固定モードを環境変数で指定
export DZA_FIXED_MODE="development_chain"

# バックグラウンドで協調動作版を開始
nohup python3 ~/.claude/hooks/infinite_orchestrator_coordinated.py start > /dev/null 2>&1 &

echo "✅ 開発モード(固定)がバックグラウンドで開始されました"
echo "🔄 リアルタイム出力でタスクを実行中..."
echo "⏹️  停止するには: /zx または kill $(pgrep -f 'infinite_orchestrator_enhanced.*development')"
```