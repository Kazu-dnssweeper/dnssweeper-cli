---
name: zl
description: DNSweeperプロセス一覧
---

```bash
#!/bin/bash
echo "📊 DNSweeper実行中プロセス"
echo "=========================="

# プロセスマネージャーがある場合はそれを使用
if [ -f ~/.dza/scripts/process_manager.py ]; then
    python3 ~/.dza/scripts/process_manager.py list
else
    # フォールバック: psコマンドで表示
    echo "プロセス一覧 (フォールバックモード):"
    echo ""
    
    # infinite_orchestratorプロセスを検索
    PIDS=$(pgrep -f "infinite_orchestrator")
    
    if [ -n "$PIDS" ]; then
        printf "%-8s %-20s %-20s %-15s %-10s\n" "PID" "モード" "開始時刻" "実行時間" "状態"
        echo "--------------------------------------------------------------------------------"
        
        for pid in $PIDS; do
            # プロセス情報を取得
            if ps -p $pid > /dev/null 2>&1; then
                # プロセス開始時刻
                START_TIME=$(ps -o lstart= -p $pid | sed 's/^ *//')
                
                # コマンドライン
                CMD=$(ps -o cmd= -p $pid)
                
                # モードを推定
                MODE="unknown"
                if echo "$CMD" | grep -q "development"; then
                    MODE="development"
                elif echo "$CMD" | grep -q "security"; then
                    MODE="security_monitoring"
                elif echo "$CMD" | grep -q "dns"; then
                    MODE="dns_monitoring"
                elif echo "$CMD" | grep -q "infinite_orchestrator_enhanced"; then
                    MODE="enhanced"
                else
                    MODE="auto"
                fi
                
                # 実行時間
                ETIME=$(ps -o etime= -p $pid | sed 's/^ *//')
                
                printf "%-8s %-20s %-20s %-15s %-10s\n" "$pid" "$MODE" "${START_TIME:0:16}" "$ETIME" "running"
            fi
        done
        
        COUNT=$(echo "$PIDS" | wc -w)
        echo ""
        echo "合計: $COUNT プロセス"
    else
        echo "実行中のDNSweeperプロセスはありません"
    fi
    
    echo ""
    echo "📊 システムリソース:"
    
    # CPU使用率（Linuxの場合）
    if command -v top >/dev/null 2>&1; then
        CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
        echo "CPU使用率: ${CPU_USAGE:-N/A}"
    fi
    
    # メモリ使用率
    if command -v free >/dev/null 2>&1; then
        MEM_USAGE=$(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')
        echo "メモリ使用率: $MEM_USAGE"
    fi
    
    # CPU コア数
    CPU_COUNT=$(nproc 2>/dev/null || echo "4")
    RECOMMENDED_MIN=$((CPU_COUNT * 2))
    RECOMMENDED_MAX=$((CPU_COUNT * 3))
    
    echo ""
    echo "💡 推奨: CPUコア数($CPU_COUNT)の2-3倍まで（$RECOMMENDED_MIN-${RECOMMENDED_MAX}プロセス）"
fi

echo ""
echo "🔧 管理コマンド:"
echo "   /za  - 全モード同時起動"
echo "   /zd  - 開発モード固定"
echo "   /zs  - セキュリティ監視固定"
echo "   /zn  - DNS監視固定"
echo "   /zx  - 全プロセス停止"
```