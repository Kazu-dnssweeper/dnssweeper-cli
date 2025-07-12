---
name: dza
description: DNSweeper Autonomous Mode - 24時間無限タスク実行
---

# DNSweeper Autonomous Mode 起動

DNSweeperの無限タスク実行システムを起動します。

```bash
#!/bin/bash

# 初期タスクの生成
echo "🚀 DNSweeper Autonomous Mode を起動します..."

# プロジェクトディレクトリに移動
cd /mnt/c/projects/dnssweeper-cli

# 実行モード選択
MODE=${1:-"autonomous"}

if [ "$MODE" = "autonomous" ]; then
    echo "🤖 自律的無限オーケストレーターを起動します"
    echo "🧠 プロジェクト状態を分析し、最適なタスクを自動生成・実行します"
    echo ""
    echo "🎯 優先順位:"
    echo "  1. エラー修正 （テスト/ビルド/型エラー）"
    echo "  2. ロードマップ進行 （未完了マイルストーン）"
    echo "  3. コード品質改善 （TODO解消、リファクタリング）"
    echo "  4. 調査・探索 （新機能、最適化機会）"
    echo ""
    
    # 自律的無限オーケストレーターを起動
    chmod +x /home/hikit/.dza/orchestration/autonomous_infinite_orchestrator.py 2>/dev/null
    nohup python3 /home/hikit/.dza/orchestration/autonomous_infinite_orchestrator.py > /home/hikit/.dza/logs/dza_autonomous.log 2>&1 &
    
    echo "✅ バックグラウンドで自律実行を開始しました"
    echo "📊 ログ確認: tail -f /home/hikit/.dza/logs/dza_autonomous.log"
    echo "🛑 停止: /zx"
    
elif [ "$MODE" = "simple" ]; then
    echo "♾️  シンプル無限実行モードで起動します"
    echo "📋 テスト → ビルド → 型チェックを無限に繰り返します"
    
    # 軽量無限オーケストレーターを起動
    nohup python3 /home/hikit/.claude/hooks/infinite_orchestrator_lightweight.py start --mode=development_chain > /home/hikit/.dza/logs/dza_simple.log 2>&1 &
    
    echo "✅ バックグラウンドでシンプル実行を開始しました"
    echo "📊 ログ確認: tail -f /home/hikit/.dza/logs/dza_simple.log"
    echo "🛑 停止: /zx"
    
elif [ "$MODE" = "typescript" ]; then
    # TypeScriptのビルド確認
    if [ ! -d "dist" ]; then
        echo "📦 プロジェクトをビルド中..."
        pnpm run build
    fi

    # Autonomous Mode の起動（TypeScript版）
    echo "🔄 TypeScript版の実行を開始..."
    node dist/index.js autonomous --mode dns
    
else
    echo "❌ 不明なモード: $MODE"
    echo "使用法: /dza [autonomous|simple|typescript]"
    echo "  autonomous - 自律的無限オーケストレーター（デフォルト）"
    echo "  simple     - シンプル無限実行（テスト/ビルド/型チェック）"
    echo "  typescript - TypeScript版Autonomous Mode"
fi
```

このモードでは以下の処理が自動的に実行されます:

1. **プロジェクト状態分析**: 現在の状態を分析
2. **テスト実行**: すべてのテストを実行
3. **ビルドチェック**: ビルド状態を確認
4. **コード品質分析**: TypeScript型チェック
5. **ドキュメント更新チェック**: ドキュメントの整合性確認
6. **依存関係チェック**: npmパッケージの更新確認

時間帯に応じて自動的にタスクが切り替わります:
- 朝 (6-12時): ビルドとテストを重点的に
- 昼 (12-17時): コード品質と開発タスク
- 夕方 (17-22時): ドキュメント更新
- 夜間 (22-6時): 依存関係チェックとメンテナンス

停止するには `Ctrl+C` を押してください。