---
name: dza-status
description: DZA実行状態を確認
---

```bash
#!/bin/bash

cd /mnt/c/projects/dnssweeper-cli

echo "📊 DNSweeper Autonomous Mode ステータス"
echo "========================================"

# Node.jsプロセスチェック
if pgrep -f "autonomous" > /dev/null; then
    echo "✅ Autonomous Mode: 実行中"
    
    # ステータスコマンドを実行
    node dist/index.js autonomous status
else
    echo "❌ Autonomous Mode: 停止中"
fi

echo ""
echo "📜 最新のログ (最後の10行):"
echo "========================================"

if [ -f ".dza/logs/dza-$(date +%Y-%m-%d).log" ]; then
    tail -n 10 ".dza/logs/dza-$(date +%Y-%m-%d).log"
else
    echo "ログファイルが見つかりません"
fi
```