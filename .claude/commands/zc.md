---
name: zc
description: コード改善チェーン起動
---

```bash
#!/bin/bash
echo "🔄 コード改善チェーン起動中..."
echo "📋 リファクタリング → パフォーマンス最適化 → ドキュメント更新"

# コード改善チェーンを起動
nohup python3 /home/hikit/.claude/hooks/infinite_orchestrator_lightweight.py start --mode=code_improvement_chain > /dev/null 2>&1 &

echo "✅ コード改善チェーンが開始されました"
echo ""
echo "🎯 実行内容:"
echo "   1. ESLint自動修正によるリファクタリング"
echo "   2. プロダクションビルドによる最適化"
echo "   3. ドキュメント更新"
echo ""
echo "📊 確認コマンド:"
echo "   /zl  - プロセス一覧"
echo "   /zx  - 停止"
```