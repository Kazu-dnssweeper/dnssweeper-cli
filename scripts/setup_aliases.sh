#!/bin/bash
# DNSweeper 短縮コマンド設定スクリプト

echo "🚀 DNSweeper短縮コマンドを設定します..."

# 使用しているシェルを検出
if [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
    SHELL_NAME="bash"
elif [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
    SHELL_NAME="zsh"
else
    echo "⚠️  対応していないシェルです"
    exit 1
fi

echo "📋 検出されたシェル: $SHELL_NAME"
echo "📝 設定ファイル: $SHELL_CONFIG"

# エイリアスを追加
cat >> "$SHELL_CONFIG" << 'EOF'

# DNSweeper DZA短縮コマンド
alias dzac='npm run dza -- -c'
alias dzacs='npm run dza:continuous-safe'
alias dzaq='npm run dzq'
alias dza='npm run dza'

# さらに短く（1文字）
alias Z='npm run dza -- -c'  # 最速！連続実行
alias z='npm run dza'        # 通常実行
EOF

echo "✅ エイリアスを追加しました"
echo ""
echo "📌 使えるコマンド："
echo "  dzac  = npm run dza -- -c （連続実行）"
echo "  Z     = npm run dza -- -c （超短縮版！）"
echo "  dzacs = npm run dza:continuous-safe （安全モード）"
echo "  dza   = npm run dza （通常実行）"
echo "  z     = npm run dza （超短縮版！）"
echo ""
echo "⚡ 設定を反映するには以下を実行してください："
echo "  source $SHELL_CONFIG"
echo ""
echo "または新しいターミナルを開いてください"