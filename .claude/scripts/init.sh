#!/bin/bash
# システム初期化スクリプト

echo "🔧 依存関係をチェック中..."

# Pythonパッケージのインストール（可能な場合）
if command -v pip3 &> /dev/null; then
    echo "📦 Pythonパッケージをインストール中..."
    pip3 install --user black pytest 2>/dev/null || true
fi

# Node.jsパッケージのインストール（可能な場合）
if command -v npm &> /dev/null; then
    echo "📦 Node.jsパッケージをインストール中..."
    npm install --no-save prettier eslint 2>/dev/null || true
fi

echo "✅ 初期化完了！"
