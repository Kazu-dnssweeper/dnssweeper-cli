#!/bin/bash
# install_dza_hooks.sh - /dza hookシステムのインストール

echo "🚀 /dza hookシステムをインストール中..."

# 1. hookスクリプトをコピー
echo "📁 hookスクリプトをコピー中..."
cp scripts/claude-hooks/*.py ~/.claude/hooks/
cp scripts/claude-hooks/settings.local.json ~/.claude/

# 2. 実行権限を付与
echo "🔐 実行権限を設定中..."
chmod +x ~/.claude/hooks/*.py

# 3. デフォルト設定ファイルの作成
echo "⚙️ デフォルト設定を作成中..."

# 代替コマンドマッピング
cat > ~/.dza/config/alternative_commands.json << 'EOF'
{
  "^chmod \\+x (.+\\.js)$": "node {1}",
  "^chmod \\+x (.+\\.sh)$": "bash {1}",
  "^chmod \\+x (.+\\.py)$": "python3 {1}",
  "^chmod \\+x (.+)$": "echo \"実行権限が必要: {1}\" && ls -la {1}",
  "^npm install$": "npm ci",
  "^npm install (.+)$": "npm ci && npm install {1}",
  "^yarn install$": "yarn install --frozen-lockfile",
  "^npm test$": "npm run test",
  "^CI=true npm test$": "npm run test:ci || npm test",
  "^sudo apt-get install (.+)$": "echo \"⚠️ apt-get install {1} は手動実行が必要\"",
  "^sudo apt install (.+)$": "echo \"⚠️ apt install {1} は手動実行が必要\"",
  "^sudo (.+)$": "echo \"⚠️ sudo {1} は手動実行が必要\"",
  "^rm -rf /$": null,
  "^sudo rm -rf": null
}
EOF

# セキュリティ設定
cat > ~/.dza/config/security_config.json << 'EOF'
{
  "mode": "balanced",
  "whitelist": [
    "^ls.*",
    "^pwd$",
    "^echo.*",
    "^cat.*",
    "^grep.*",
    "^find.*"
  ],
  "blacklist": [
    "^rm -rf /",
    "^sudo rm -rf",
    ":(){ :|:& };:"
  ]
}
EOF

echo "✅ DZA hooks設定完了"
echo ""
echo "🔄 重要：Claude Codeの再起動が必要です"
echo "   1. Claude Codeを完全終了（Ctrl+C または ×ボタン）"
echo "   2. ターミナル/コマンドプロンプトで 'claude' を再実行"
echo "   3. '/dza' で動作確認"
echo ""
echo "⚠️  再起動しないとhookが動作しません"
echo "💡 再起動後に '/dza-restart' で詳細な手順を確認できます"
echo ""
echo "🚀 再起動が完了したら: /dza でDNSweeper自律モードを開始！"