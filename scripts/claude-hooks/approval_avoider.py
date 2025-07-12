#!/usr/bin/env python3
"""
Claude Code PreToolUse hook: 承認が必要なコマンドを検出し、代替実行
柔軟なセキュリティレベルと学習機能付き
"""
import json
import sys
import os
import re
from datetime import datetime
from pathlib import Path

# パス設定
DZA_DIR = Path.home() / '.dza'
QUEUE_FILE = DZA_DIR / 'logs' / 'approval_queue.json'
ALT_COMMANDS_FILE = DZA_DIR / 'config' / 'alternative_commands.json'
SECURITY_CONFIG_FILE = DZA_DIR / 'config' / 'security_config.json'
HISTORY_FILE = DZA_DIR / 'logs' / 'execution_history.log'

# ディレクトリ作成
(DZA_DIR / 'config').mkdir(parents=True, exist_ok=True)
(DZA_DIR / 'logs').mkdir(parents=True, exist_ok=True)

# デフォルトの代替コマンドマッピング
DEFAULT_ALTERNATIVES = {
    # chmod関連（最も一般的な承認回避）
    r'^chmod \+x (.+\.js)$': 'node {1}',
    r'^chmod \+x (.+\.sh)$': 'bash {1}',
    r'^chmod \+x (.+\.py)$': 'python3 {1}',
    r'^chmod \+x (.+)$': 'echo "実行権限が必要: {1}" && ls -la {1}',
    
    # npm/yarn関連
    r'^npm install$': 'npm ci',
    r'^npm install (.+)$': 'npm ci && npm install {1}',
    r'^yarn install$': 'yarn install --frozen-lockfile',
    r'^npm test$': 'npm run test',
    r'^CI=true npm test$': 'npm run test:ci || npm test',
    
    # システムコマンド（警告のみ）
    r'^sudo apt-get install (.+)$': 'echo "⚠️ apt-get install {1} は手動実行が必要"',
    r'^sudo apt install (.+)$': 'echo "⚠️ apt install {1} は手動実行が必要"',
    r'^sudo (.+)$': 'echo "⚠️ sudo {1} は手動実行が必要"',
    
    # 危険なコマンド（ブロック）
    r'^rm -rf /$': None,
    r'^sudo rm -rf': None,
    r':(){ :|:& };:': None,  # fork bomb
}

def load_config():
    """設定ファイルを読み込み"""
    configs = {
        'alternatives': DEFAULT_ALTERNATIVES,
        'security': {
            'mode': os.environ.get('DZA_SECURITY_MODE', 'balanced'),
            'whitelist': [],
            'blacklist': []
        }
    }
    
    # 代替コマンド設定
    if ALT_COMMANDS_FILE.exists():
        try:
            with open(ALT_COMMANDS_FILE, 'r', encoding='utf-8') as f:
                configs['alternatives'] = json.load(f)
        except:
            with open(ALT_COMMANDS_FILE, 'w', encoding='utf-8') as f:
                json.dump(DEFAULT_ALTERNATIVES, f, indent=2, ensure_ascii=False)
    
    # セキュリティ設定
    if SECURITY_CONFIG_FILE.exists():
        try:
            with open(SECURITY_CONFIG_FILE, 'r', encoding='utf-8') as f:
                configs['security'] = json.load(f)
        except:
            pass
    
    return configs

def is_whitelisted(command, whitelist):
    """ホワイトリストチェック"""
    for pattern in whitelist:
        if re.match(pattern, command):
            return True
    return False

def log_command(command, action, alternative=None):
    """コマンド実行履歴を記録"""
    log_entry = {
        'timestamp': datetime.now().isoformat(),
        'command': command,
        'action': action,
        'alternative': alternative
    }
    
    with open(HISTORY_FILE, 'a', encoding='utf-8') as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')

def add_to_queue(command, context):
    """承認待ちキューに追加"""
    queue_item = {
        'id': datetime.now().timestamp(),
        'command': command,
        'timestamp': datetime.now().isoformat(),
        'context': context,
        'status': 'pending'
    }
    
    # 既存のキューを読み込み
    queue = []
    if QUEUE_FILE.exists():
        try:
            with open(QUEUE_FILE, 'r', encoding='utf-8') as f:
                queue = json.load(f)
        except:
            queue = []
    
    # 重複チェック
    if not any(item['command'] == command and item['status'] == 'pending' 
               for item in queue):
        queue.append(queue_item)
        
        with open(QUEUE_FILE, 'w', encoding='utf-8') as f:
            json.dump(queue, f, indent=2, ensure_ascii=False)
        
        pending_count = len([q for q in queue if q['status'] == 'pending'])
        print(f"📋 承認待ちキューに追加 (合計: {pending_count}件)", file=sys.stderr)

def process_command(command, configs):
    """コマンドを処理"""
    # ホワイトリストチェック
    if is_whitelisted(command, configs['security'].get('whitelist', [])):
        log_command(command, 'whitelisted')
        return {'action': 'allow', 'reason': 'whitelisted'}
    
    # パターンマッチング
    for pattern, alternative in configs['alternatives'].items():
        match = re.match(pattern, command)
        if match:
            if alternative is None:
                # 危険なコマンドをブロック
                print(f"🚫 安全のためブロック: {command}", file=sys.stderr)
                log_command(command, 'blocked')
                add_to_queue(command, {'reason': 'dangerous_command'})
                return {'action': 'block', 'exit_code': 2}
            
            elif alternative:
                # 代替コマンドで置き換え
                alt_command = alternative
                for i, group in enumerate(match.groups(), 1):
                    alt_command = alt_command.replace(f'{{{i}}}', group)
                
                print(f"🔄 代替コマンドを使用: {alt_command}", file=sys.stderr)
                log_command(command, 'replaced', alt_command)
                
                # 元のコマンドをキューに記録
                add_to_queue(command, {
                    'original': command,
                    'alternative': alt_command,
                    'reason': 'approval_required'
                })
                
                # 代替コマンドを実行するよう指示
                return {
                    'action': 'replace',
                    'alternative': alt_command,
                    'exit_code': 2
                }
    
    # パターンに一致しない場合
    log_command(command, 'allowed')
    return {'action': 'allow'}

def main():
    try:
        # hookからの入力を読み取り
        hook_input = json.load(sys.stdin)
        tool_name = hook_input.get('tool_name', '')
        tool_input = hook_input.get('tool_input', {})
        
        # コマンドを抽出
        command = None
        if isinstance(tool_input, dict):
            command = tool_input.get('command', tool_input.get('cmd', ''))
        elif isinstance(tool_input, str):
            command = tool_input
        
        if not command:
            sys.exit(0)
        
        # 設定を読み込み
        configs = load_config()
        
        # コマンドを処理
        result = process_command(command, configs)
        
        # 結果に応じて終了
        sys.exit(result.get('exit_code', 0))
        
    except Exception as e:
        print(f"❌ エラー: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == '__main__':
    main()