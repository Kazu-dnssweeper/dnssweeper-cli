---
name: za
description: 全モード同時起動
---

```bash
#!/bin/bash
echo "🚀 全モード同時起動..."

# 各モードをバックグラウンドで起動
echo "💻 開発モード起動中..."
bash -c "$(tail -n +7 /mnt/c/projects/dnssweeper-cli/.claude/commands/zd.md | head -n -1)" &
sleep 2

echo "🛡️ セキュリティ監視モード起動中..."
bash -c "$(tail -n +7 /mnt/c/projects/dnssweeper-cli/.claude/commands/zs.md | head -n -1)" &
sleep 2

echo "🌐 DNS監視モード起動中..."
bash -c "$(tail -n +7 /mnt/c/projects/dnssweeper-cli/.claude/commands/zn.md | head -n -1)" &
sleep 2

echo "✅ 全モード起動完了！"
echo ""
echo "📊 起動されたモード:"
echo "   💻 開発モード (リアルタイム表示)"
echo "   🛡️ セキュリティ監視 (アラート時表示)"
echo "   🌐 DNS監視 (アラート時表示)"
echo ""
echo "📋 実行状況確認: /zl"
echo "⏹️  全停止: /zx"
```