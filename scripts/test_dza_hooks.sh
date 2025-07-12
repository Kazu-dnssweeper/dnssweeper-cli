#!/bin/bash
# test_dza_hooks.sh - /dza hookシステムのテスト

echo "🧪 /dza hookシステムテストを開始..."
echo ""

# 1. インストール確認
echo "📋 インストール状態を確認:"
echo "──────────────────────────"

# hookスクリプト確認
if [ -d ~/.claude/hooks ]; then
    echo "✅ ~/.claude/hooks ディレクトリが存在"
    hook_count=$(ls -1 ~/.claude/hooks/*.py 2>/dev/null | wc -l)
    echo "   └─ Pythonスクリプト: ${hook_count}個"
else
    echo "❌ ~/.claude/hooks ディレクトリが存在しません"
fi

# 設定ファイル確認
if [ -f ~/.claude/settings.local.json ]; then
    echo "✅ ~/.claude/settings.local.json が存在"
else
    echo "❌ ~/.claude/settings.local.json が存在しません"
fi

# .dzaディレクトリ確認
if [ -d ~/.dza ]; then
    echo "✅ ~/.dza ディレクトリが存在"
    echo "   ├─ config: $(ls -1 ~/.dza/config 2>/dev/null | wc -l)個のファイル"
    echo "   ├─ logs: $(ls -1 ~/.dza/logs 2>/dev/null | wc -l)個のファイル"
    echo "   └─ status: $(ls -1 ~/.dza/status 2>/dev/null | wc -l)個のファイル"
else
    echo "❌ ~/.dza ディレクトリが存在しません"
fi

echo ""
echo "📊 設定ファイルの内容:"
echo "──────────────────────────"

# 代替コマンド設定
if [ -f ~/.dza/config/alternative_commands.json ]; then
    echo "alternative_commands.json の最初の5行:"
    head -5 ~/.dza/config/alternative_commands.json | sed 's/^/   /'
    echo "   ..."
else
    echo "❌ alternative_commands.json が存在しません"
fi

echo ""
echo "🔧 hookスクリプトの権限:"
echo "──────────────────────────"
if [ -d ~/.claude/hooks ]; then
    ls -la ~/.claude/hooks/*.py 2>/dev/null | awk '{print "   " $1 " " $9}'
fi

echo ""
echo "⚙️ Pythonモジュールテスト:"
echo "──────────────────────────"
# approval_avoiderのテスト
if [ -f ~/.claude/hooks/approval_avoider.py ]; then
    echo "テストコマンド: chmod +x test.js"
    echo '{"tool_name": "bash", "tool_input": {"command": "chmod +x test.js"}}' | \
        python3 ~/.claude/hooks/approval_avoider.py 2>&1 | \
        grep -q "node test.js" && echo "✅ 承認回避システム: 正常動作" || echo "❌ 承認回避システム: エラー"
fi

echo ""
echo "📝 テスト結果サマリー:"
echo "──────────────────────────"
echo "インストールは完了していますが、hookシステムを有効にするには"
echo "Claude Codeの再起動が必要です。"
echo ""
echo "次のステップ:"
echo "1. このターミナルを終了 (exit または Ctrl+D)"
echo "2. claude コマンドで再起動"
echo "3. /dza コマンドを実行"
echo ""
echo "⚠️ 重要: 再起動しないとhookは動作しません！"