---
name: zx
description: 全DNSweeperプロセス停止
---

```bash
#!/bin/bash
echo "🛑 全DNSweeperプロセスを停止中..."

# プロセスマネージャーがある場合はそれを使用
if [ -f ~/.dza/scripts/process_manager.py ]; then
    python3 ~/.dza/scripts/process_manager.py stop_all
else
    # フォールバック: プロセス名で検索して停止
    echo "📋 infinite_orchestratorプロセスを検索中..."
    
    # 既存の infinite_orchestrator プロセスを停止
    PIDS=$(pgrep -f "infinite_orchestrator")
    
    if [ -n "$PIDS" ]; then
        echo "🔄 プロセス停止中:"
        for pid in $PIDS; do
            echo "   PID $pid を停止中..."
            kill $pid 2>/dev/null || true
        done
        
        # 停止の確認
        sleep 2
        REMAINING=$(pgrep -f "infinite_orchestrator" | wc -l)
        
        if [ "$REMAINING" -eq 0 ]; then
            echo "✅ 全プロセスを正常に停止しました"
        else
            echo "⚠️  一部プロセスが残っています。強制終了します..."
            pkill -9 -f "infinite_orchestrator" 2>/dev/null || true
            echo "✅ 強制停止完了"
        fi
    else
        echo "ℹ️  実行中のプロセスはありませんでした"
    fi
fi

# PIDファイルのクリーンアップ
if [ -f ~/.dza/process/pid_manager.json ]; then
    echo "{}" > ~/.dza/process/pid_manager.json
fi

if [ -f ~/.dza/process/mode_locks.json ]; then
    echo "{}" > ~/.dza/process/mode_locks.json
fi

echo "🧹 クリーンアップ完了"
```