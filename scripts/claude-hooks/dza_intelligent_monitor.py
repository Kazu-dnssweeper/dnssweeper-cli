#!/usr/bin/env python3
"""
統合型の/dza監視システム - パターン検出と自動提案
"""
import json
import sys
import re
import os
from datetime import datetime
from pathlib import Path

DZA_DIR = Path.home() / '.dza'
STATE_FILE = DZA_DIR / 'status' / 'current_state.json'

# パターンと対応アクション
PATTERN_ACTIONS = {
    # エラーパターン
    r'error|Error|ERROR|failed|Failed': {
        'mode': 'error_recovery',
        'actions': ['エラー分析', '自動修正試行', '代替タスク提案'],
        'emoji': '🚨'
    },
    
    # 成功パターン
    r'success|Success|passed|Passed|completed': {
        'mode': 'next_task',
        'actions': ['次のタスク選択', '進捗記録', '品質チェック'],
        'emoji': '✅'
    },
    
    # テスト関連
    r'test|Test|jest|mocha|pytest': {
        'mode': 'testing',
        'actions': ['テスト実行', 'カバレッジ分析', 'テスト最適化'],
        'emoji': '🧪'
    },
    
    # ビルド関連
    r'build|Build|compile|webpack': {
        'mode': 'building',
        'actions': ['ビルド最適化', '依存関係チェック', 'キャッシュ活用'],
        'emoji': '🔨'
    },
    
    # 承認関連
    r'permission|chmod|sudo|install': {
        'mode': 'approval_handling',
        'actions': ['代替コマンド検索', 'キュー追加', '手動実行案内'],
        'emoji': '🔐'
    }
}

def analyze_output(output):
    """出力を分析してアクションを提案"""
    if not output:
        return None
    
    output_str = str(output)
    detected = []
    
    for pattern, info in PATTERN_ACTIONS.items():
        if re.search(pattern, output_str, re.IGNORECASE):
            detected.append(info)
    
    return detected[0] if detected else None

def suggest_next_action(pattern_info, hour):
    """時間帯とパターンに応じた次のアクション提案"""
    suggestions = []
    
    # 時間帯別の調整
    if 22 <= hour or hour <= 6:
        # 深夜は低リスクタスク
        suggestions.append("低リスクタスクに切り替え")
    elif 10 <= hour <= 17:
        # 日中は承認不要タスク
        suggestions.append("承認不要タスクを優先")
    
    # パターン別の提案
    if pattern_info:
        suggestions.extend(pattern_info['actions'][:2])
    
    return suggestions

def update_state(analysis):
    """状態を更新"""
    state = {}
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, 'r') as f:
                state = json.load(f)
        except:
            pass
    
    state['last_analysis'] = {
        'timestamp': datetime.now().isoformat(),
        'mode': analysis.get('mode', 'normal') if analysis else 'normal',
        'suggestions': analysis.get('actions', []) if analysis else []
    }
    
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)

def main():
    try:
        hook_input = json.load(sys.stdin)
        tool_response = hook_input.get('tool_response', {})
        
        # 出力を取得
        output = ''
        if isinstance(tool_response, dict):
            output = tool_response.get('output', tool_response.get('stdout', ''))
        else:
            output = str(tool_response)
        
        # パターン分析
        analysis = analyze_output(output)
        
        if analysis:
            hour = datetime.now().hour
            suggestions = suggest_next_action(analysis, hour)
            
            # 重要なパターンの場合のみ表示
            if analysis['mode'] in ['error_recovery', 'approval_handling']:
                print(f"\n{analysis['emoji']} /dza 提案: {analysis['mode']}", file=sys.stderr)
                for i, action in enumerate(suggestions[:2], 1):
                    print(f"   {i}. {action}", file=sys.stderr)
        
        # 状態を更新
        update_state(analysis)
    
    except Exception as e:
        pass  # エラーは静かに処理

if __name__ == '__main__':
    main()