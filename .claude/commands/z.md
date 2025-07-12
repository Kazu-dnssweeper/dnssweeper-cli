---
name: z
description: 無限実行（即開始）
---

```bash
#!/bin/bash

# 最速でDNSweeper Autonomous Modeを起動
cd /mnt/c/projects/dnssweeper-cli

# ビルド済みかチェック
if [ -d "dist" ]; then
    echo "⚡ 無限実行モード起動..."
    node dist/index.js dza --mode dns
else
    echo "📦 初回ビルド中..."
    npm run build && node dist/index.js dza --mode dns
fi
```