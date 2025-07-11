#!/bin/bash

# 実行権限修正スクリプト
# 手動で権限を修正する場合に使用

echo "🔧 実行権限の修正を開始します..."

# スクリプトのディレクトリに移動
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

# 実行権限を付与する関数
make_executable() {
    local file=$1
    if [ -f "$file" ]; then
        chmod +x "$file"
        git update-index --chmod=+x "$file" 2>/dev/null || true
        echo "✅ $file"
    else
        echo "⏭️  スキップ: $file (ファイルが存在しません)"
    fi
}

echo ""
echo "📋 スクリプトファイルの権限を修正中..."

# Node.jsスクリプト
make_executable "scripts/release.js"
make_executable "scripts/status.js"
make_executable "scripts/fix-ci.js"
make_executable "scripts/collect-metrics.js"
make_executable "scripts/setup-permissions.js"
make_executable "scripts/benchmark-streaming.js"
make_executable "scripts/generate-large-test-data.js"

# シェルスクリプト
make_executable "scripts/fix-permissions.sh"

# ビルド済みCLI
if [ -f "dist/index.js" ]; then
    make_executable "dist/index.js"
fi

echo ""
echo "🔍 追加のシェルスクリプトを検索中..."

# .shファイルをすべて検索
find . -name "*.sh" -not -path "./node_modules/*" -not -path "./.git/*" | while read -r script; do
    if [ ! -x "$script" ]; then
        echo "📌 実行権限がないシェルスクリプト: $script"
        read -p "   実行権限を付与しますか？ (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            make_executable "$script"
        fi
    fi
done

echo ""
echo "✨ 完了しました！"