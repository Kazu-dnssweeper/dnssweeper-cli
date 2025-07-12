#!/bin/bash
# DNSweeper グローバルコマンドインストーラー

echo "🌍 DNSweeperグローバルコマンドをインストールします..."

# binディレクトリ作成
mkdir -p ~/bin

# dzaコマンド作成
cat > ~/bin/dza << 'EOF'
#!/bin/bash
cd /mnt/c/projects/dnssweeper-cli
npm run dza "$@"
EOF

# dzacコマンド作成（連続実行）
cat > ~/bin/dzac << 'EOF'
#!/bin/bash
cd /mnt/c/projects/dnssweeper-cli
npm run dza -- -c "$@"
EOF

# Zコマンド作成（最短！）
cat > ~/bin/Z << 'EOF'
#!/bin/bash
cd /mnt/c/projects/dnssweeper-cli
npm run dza -- -c "$@"
EOF

# 実行権限付与
chmod +x ~/bin/dza
chmod +x ~/bin/dzac
chmod +x ~/bin/Z

echo "✅ グローバルコマンドをインストールしました"
echo ""
echo "📌 使えるコマンド："
echo "  dza   - 通常実行"
echo "  dzac  - 連続実行"
echo "  Z     - 連続実行（1文字！）"
echo ""
echo "⚠️  ~/bin がPATHに含まれていない場合は追加してください："
echo '  export PATH="$HOME/bin:$PATH"'
echo ""
echo "設定後、どこからでも実行できます！"