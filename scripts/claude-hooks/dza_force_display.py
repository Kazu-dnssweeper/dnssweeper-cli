#!/usr/bin/env python3
"""
常に/dzaの状態を表示し、現在の動作を可視化
"""
import json
import sys
import os
from datetime import datetime
from pathlib import Path

DZA_DIR = Path.home() / '.dza'
STATUS_FILE = DZA_DIR / 'status' / 'live_status.json'
QUEUE_FILE = DZA_DIR / 'logs' / 'approval_queue.json'

class DzaDisplay:
    def __init__(self):
        self.hour = datetime.now().hour
        self.time = datetime.now().strftime('%H:%M')
        self.load_status()
    
    def load_status(self):
        """各種ステータスを読み込み"""
        # 承認待ちキュー
        self.pending_count = 0
        if QUEUE_FILE.exists():
            try:
                with open(QUEUE_FILE, 'r') as f:
                    queue = json.load(f)
                    self.pending_count = len([q for q in queue 
                                            if q.get('status') == 'pending'])
            except:
                pass
        
        # 現在の状態
        self.current_state = 'active'
        if STATUS_FILE.exists():
            try:
                with open(STATUS_FILE, 'r') as f:
                    status = json.load(f)
                    if status.get('frozen'):
                        self.current_state = 'frozen'
            except:
                pass
    
    def get_mode_info(self):
        """時間帯に応じたモード情報"""
        if 6 <= self.hour < 10:
            return '🌅', '朝モード', '#FFD700'
        elif 10 <= self.hour < 17:
            return '☀️', '日中モード', '#87CEEB'
        elif 17 <= self.hour < 19:
            return '🌆', '夕方モード', '#FF6347'
        elif 19 <= self.hour < 24:
            return '🌙', '夜間モード', '#4B0082'
        else:
            return '🌌', '深夜モード', '#191970'
    
    def get_task_indicator(self, command=''):
        """現在のタスク種別を判定"""
        indicators = []
        
        if 'test' in command.lower():
            indicators.append('🧪')
        elif 'build' in command.lower():
            indicators.append('🔨')
        elif 'npm' in command.lower():
            indicators.append('📦')
        elif 'git' in command.lower():
            indicators.append('🔀')
        elif 'chmod' in command.lower():
            indicators.append('🔐')
        
        return ' '.join(indicators) if indicators else '⚡'
    
    def create_mini_display(self, command=''):
        """最小限の1行表示"""
        emoji, mode, _ = self.get_mode_info()
        task = self.get_task_indicator(command)
        queue = f"📋{self.pending_count}" if self.pending_count > 0 else ""
        state = "🔴" if self.current_state == 'frozen' else "🟢"
        
        return f"{emoji} /dza [{self.time}] {task} {queue} {state}"
    
    def create_detailed_display(self, command=''):
        """詳細な表示（重要な操作時）"""
        emoji, mode, color = self.get_mode_info()
        
        display = f"""
╭─ /dza STATUS ─────────────────────────────────────────╮
│ {emoji} {mode} │ 🕐 {self.time} │ 📋 承認待ち: {self.pending_count} │
├───────────────────────────────────────────────────────┤
│ 実行: {command[:45]:<45} │
│ 状態: {'⚠️ フリーズ' if self.current_state == 'frozen' else '✅ 正常動作':<45} │
╰───────────────────────────────────────────────────────╯"""
        
        return display
    
    def should_show_detailed(self, command):
        """詳細表示が必要かどうか判定"""
        important_keywords = [
            'chmod', 'sudo', 'rm', 'npm install', 
            'CI=true', 'test', 'build', 'deploy'
        ]
        
        return any(keyword in command for keyword in important_keywords)

def main():
    try:
        hook_input = json.load(sys.stdin)
        event_type = os.environ.get('CLAUDE_EVENT_TYPE', '')
        
        # コマンドを抽出
        command = ''
        if event_type == 'PreToolUse':
            tool_input = hook_input.get('tool_input', {})
            if isinstance(tool_input, dict):
                command = tool_input.get('command', tool_input.get('cmd', ''))
            else:
                command = str(tool_input)
        
        display = DzaDisplay()
        
        # 表示を決定
        if command and display.should_show_detailed(command):
            # 重要なコマンドは詳細表示
            print(display.create_detailed_display(command), file=sys.stderr)
        elif datetime.now().minute % 5 == 0:
            # 5分ごとに詳細表示
            print(display.create_detailed_display(command), file=sys.stderr)
        else:
            # 通常は1行表示
            print(display.create_mini_display(command), file=sys.stderr)
    
    except Exception as e:
        # エラーでも最小限の表示
        print(f"⚡ /dza [active] ❌ {e}", file=sys.stderr)

if __name__ == '__main__':
    main()