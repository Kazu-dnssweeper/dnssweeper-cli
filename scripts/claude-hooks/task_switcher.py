#!/usr/bin/env python3
"""
承認待ちキューの管理と代替タスク提案
"""
import json
import sys
import os
from pathlib import Path
from datetime import datetime

DZA_DIR = Path.home() / '.dza'
QUEUE_FILE = DZA_DIR / 'logs' / 'approval_queue.json'
STATE_FILE = DZA_DIR / 'status' / 'current_state.json'

def get_pending_tasks():
    """承認待ちタスクを取得"""
    if not QUEUE_FILE.exists():
        return []
    
    try:
        with open(QUEUE_FILE, 'r', encoding='utf-8') as f:
            queue = json.load(f)
            return [task for task in queue if task.get('status') == 'pending']
    except:
        return []

def suggest_alternative_tasks():
    """時間帯に応じた代替タスク提案"""
    hour = datetime.now().hour
    
    if 6 <= hour < 10:
        # 朝の推奨タスク
        return [
            "ドキュメントの更新",
            "昨日のコードレビュー",
            "TODOリストの整理"
        ]
    elif 10 <= hour < 17:
        # 日中の推奨タスク
        return [
            "テストケースの追加",
            "リファクタリング",
            "パフォーマンス分析"
        ]
    elif 17 <= hour < 19:
        # 夕方の推奨タスク
        return [
            "進捗のまとめ",
            "明日の準備",
            "コードの整理"
        ]
    else:
        # 夜間の推奨タスク
        return [
            "ログ分析",
            "自動化スクリプト作成",
            "実験的機能の試作"
        ]

def check_queue():
    """キューの状態をチェックして表示"""
    pending = get_pending_tasks()
    
    if pending:
        print(f"\n📊 承認待ちキューステータス", file=sys.stderr)
        print(f"├─ 保留中: {len(pending)} タスク", file=sys.stderr)
        
        # 最新3件を表示
        print("├─ 最近の承認待ち:", file=sys.stderr)
        for i, task in enumerate(pending[-3:], 1):
            cmd = task.get('command', 'N/A')[:50]
            print(f"│  {i}. {cmd}...", file=sys.stderr)
        
        # 代替タスク提案
        print("└─ 💡 推奨代替タスク:", file=sys.stderr)
        suggestions = suggest_alternative_tasks()
        for i, task in enumerate(suggestions[:3], 1):
            print(f"   {i}. {task}", file=sys.stderr)

def main():
    if len(sys.argv) > 1 and sys.argv[1] == 'check_queue':
        check_queue()
    else:
        # Stop hookから呼ばれた場合も同様
        check_queue()

if __name__ == '__main__':
    main()