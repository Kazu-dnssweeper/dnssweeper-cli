---
name: zn
description: DNS監視モード固定で無限実行
---

```bash
#!/bin/bash
echo "🌐 DNS監視モード固定で起動..."
echo "🔔 アラート時のみ表示します"

# 固定モードを環境変数で指定
export DZA_FIXED_MODE="dns_monitoring_chain"

# バックグラウンドで協調動作版を開始
nohup python3 ~/.claude/hooks/infinite_orchestrator_coordinated.py start > /dev/null 2>&1 &

echo "✅ DNS監視モード(固定)がバックグラウンドで開始されました"
echo "🔔 アラート検出時のみ出力されます"
echo "⏹️  停止するには: /zx または kill $(pgrep -f 'infinite_orchestrator_enhanced.*dns')"
```