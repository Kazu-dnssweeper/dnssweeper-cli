#!/usr/bin/env python3
"""
Claude Code PostToolUse hook: 承認待ちフリーズを検出
"""
import json
import sys
import os
from datetime import datetime
from pathlib import Path

DZA_DIR = Path.home() / '.dza'
FROZEN_LOG = DZA_DIR / 'logs' / 'frozen_tasks.log'
STATUS_FILE = DZA_DIR / 'status' / 'current_state.json'

# 承認プロンプトのパターン（拡張版）
APPROVAL_PATTERNS = [
    'Do you want to proceed?',
    'Bash command',
    'Yes, and don\'t ask again',
    '❯ 1. Yes',
    '❯ 2. Yes',
    '❯ 3. No',
    '╭─',  # ボックスの開始
    '│ Bash command',
    'chmod +x',
    'Are you sure',
    'Continue?',
    'Y/n',
    '[Y/n]',
    'password:',
    'Password:',
    'sudo password',
    'npm test',
    'CI=true'
]

def detect_approval_prompt(output):
    """出力に承認プロンプトが含まれているかチェック"""
    if not output:
        return False
    
    output_str = str(output)
    
    # 複数のパターンが含まれているかチェック（より確実）
    pattern_count = sum(1 for pattern in APPROVAL_PATTERNS 
                       if pattern.lower() in output_str.lower())
    
    # 2つ以上のパターンが見つかったら承認プロンプトと判定
    return pattern_count >= 2

def update_status(frozen=False):
    """現在の状態を更新"""
    status = {}
    if STATUS_FILE.exists():
        try:
            with open(STATUS_FILE, 'r') as f:
                status = json.load(f)
        except:
            pass
    
    status['last_check'] = datetime.now().isoformat()
    status['frozen'] = frozen
    
    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATUS_FILE, 'w') as f:
        json.dump(status, f, indent=2)

def main():
    try:
        hook_input = json.load(sys.stdin)
        tool_response = hook_input.get('tool_response', {})
        tool_input = hook_input.get('tool_input', {})
        
        # レスポンスから出力を抽出
        output = ''
        if isinstance(tool_response, dict):
            output = tool_response.get('output', tool_response.get('stdout', ''))
            # エラー出力も確認
            stderr = tool_response.get('stderr', '')
            output += '\n' + stderr
        elif isinstance(tool_response, str):
            output = tool_response
        
        # 承認プロンプトを検出
        if detect_approval_prompt(output):
            task_info = {
                'timestamp': datetime.now().isoformat(),
                'tool_input': tool_input,
                'output_preview': output[:500],
                'status': 'frozen',
                'detected_patterns': [p for p in APPROVAL_PATTERNS 
                                    if p.lower() in output.lower()]
            }
            
            # ログに記録
            FROZEN_LOG.parent.mkdir(parents=True, exist_ok=True)
            with open(FROZEN_LOG, 'a', encoding='utf-8') as f:
                f.write(json.dumps(task_info, ensure_ascii=False) + '\n')
            
            print("\n⚠️ 承認待ちフリーズを検出！", file=sys.stderr)
            print("📋 タスクをキューに追加しました", file=sys.stderr)
            print("💡 別のタスクに切り替えることを推奨", file=sys.stderr)
            
            update_status(frozen=True)
        else:
            update_status(frozen=False)
    
    except Exception as e:
        print(f"⚠️ フリーズ検出エラー: {e}", file=sys.stderr)

if __name__ == '__main__':
    main()