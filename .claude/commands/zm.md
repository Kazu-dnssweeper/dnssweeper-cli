---
name: zm
description: 監視チェーン起動
---

```bash
#!/bin/bash
echo "📊 監視チェーン起動中..."
echo "📋 パフォーマンス監視 → ヘルスチェック → リソースチェック"

# 監視チェーンを起動
nohup python3 /home/hikit/.claude/hooks/infinite_orchestrator_lightweight.py start --mode=monitoring_chain > /dev/null 2>&1 &

echo "✅ 監視チェーンが開始されました"
echo ""
echo "🎯 実行内容:"
echo "   1. パフォーマンス監視（ディスク使用量）"
echo "   2. システムヘルスチェック（Node.js/pnpm確認）"
echo "   3. リソースチェック（メモリ・ディスク容量）"
echo ""
echo "📊 確認コマンド:"
echo "   /zl  - プロセス一覧"
echo "   /zx  - 停止"
```