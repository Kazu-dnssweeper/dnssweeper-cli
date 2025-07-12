#!/usr/bin/env python3
"""
DNSweeper chmod監視システム
TypeScript/Node.jsプロジェクトに最適化された権限管理
"""
import json
import sys
import os
import stat
import re
from pathlib import Path
from datetime import datetime

# 設定ファイル
DZA_DIR = Path.home() / '.dza'
CHMOD_LOG = DZA_DIR / 'security' / 'chmod_history.json'
PROJECT_ROOT = Path.cwd()
POLICY_FILE = PROJECT_ROOT / 'scripts' / 'security' / 'chmod_guardian' / 'policies' / 'dnsweeper_policy.json'
TEMP_FILE = DZA_DIR / 'temp' / 'current_chmod.json'

def load_policy():
    """DNSweeper専用セキュリティポリシーを読み込み"""
    try:
        with open(POLICY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"⚠️ ポリシーファイルが見つかりません: {POLICY_FILE}", file=sys.stderr)
        return get_default_policy()

def get_default_policy():
    """デフォルトのDNSweeperポリシー"""
    return {
        "project_name": "DNSweeper",
        "directories": {
            "default": "755",
            "src": "755",
            "dist": "755",
            "node_modules": "755",
            "private": "700"
        },
        "files": {
            "default": "644",
            "scripts": "755",
            "typescript": "644",
            "javascript": "644",
            "env": "400"
        },
        "patterns": {
            r"\.sh$": "755",
            r"\.ts$": "644",
            r"\.js$": "644",
            r"\.json$": "644",
            r"\.env": "400"
        }
    }

def get_current_permissions(path):
    """現在の権限を詳細に取得"""
    try:
        stat_info = os.stat(path)
        mode = stat.S_IMODE(stat_info.st_mode)
        
        return {
            'mode': mode,
            'octal': oct(mode)[2:],
            'symbolic': stat.filemode(stat_info.st_mode),
            'is_dir': stat.S_ISDIR(stat_info.st_mode),
            'is_executable': bool(mode & stat.S_IXUSR),
            'owner': stat_info.st_uid,
            'group': stat_info.st_gid,
            'size': stat_info.st_size,
            'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat()
        }
    except Exception as e:
        return None

def is_dnsweeper_file(path):
    """DNSweeperプロジェクトのファイルかチェック"""
    path_str = str(Path(path).resolve())
    project_root_str = str(PROJECT_ROOT.resolve())
    return path_str.startswith(project_root_str)

def get_file_category(path):
    """ファイルのカテゴリを判定"""
    path_str = str(path).lower()
    
    # ソースコード
    if '/src/' in path_str or path_str.endswith(('.ts', '.tsx')):
        return 'source_code'
    
    # テスト
    if '/test/' in path_str or '.test.' in path_str or '.spec.' in path_str:
        return 'test'
    
    # 設定ファイル
    if path_str.endswith(('.json', '.yaml', '.yml', '.toml')):
        return 'config'
    
    # スクリプト
    if path_str.endswith(('.sh', '.py')):
        return 'script'
    
    # 環境変数
    if '.env' in path_str:
        return 'environment'
    
    # ビルド成果物
    if '/dist/' in path_str or '/build/' in path_str:
        return 'build_output'
    
    return 'other'

def get_recommended_permission(path, policy):
    """DNSweeperファイルに適した権限を取得"""
    path_str = str(path)
    category = get_file_category(path)
    
    # カテゴリ別の推奨権限
    category_permissions = {
        'source_code': '644',      # TypeScript/JavaScriptは読み取り専用
        'test': '644',             # テストファイルも読み取り専用
        'config': '644',           # 設定ファイルは読み取り専用
        'script': '755',           # スクリプトは実行可能
        'environment': '400',      # 環境変数は機密保護
        'build_output': '444',     # ビルド成果物は変更防止
        'other': '644'             # その他は読み取り専用
    }
    
    # パターンマッチングで上書き
    for pattern, perm in policy.get('patterns', {}).items():
        if re.search(pattern, path_str):
            return perm
    
    # DNSweeper特有のパスチェック
    for specific_path, perm in policy.get('dnsweeper_specific', {}).items():
        if specific_path in path_str:
            return perm
    
    # カテゴリ別権限を返す
    if os.path.isdir(path):
        return policy['directories'].get(category, policy['directories']['default'])
    else:
        return category_permissions.get(category, policy['files']['default'])

def analyze_security_risk(path, current_perm, new_perm):
    """セキュリティリスクを分析"""
    risks = []
    
    # 危険な権限
    if new_perm in ['777', '666']:
        risks.append("🚨 誰でも書き込み可能な権限は危険です")
    
    # 環境変数ファイルの権限緩和
    if '.env' in str(path) and int(new_perm) > 400:
        risks.append("⚠️ 環境変数ファイルの権限が緩すぎます")
    
    # ソースコードに実行権限
    if str(path).endswith(('.ts', '.js')) and new_perm[2] in ['5', '7']:
        risks.append("⚠️ ソースコードに実行権限は不要です")
    
    return risks

def log_chmod_action(command, paths_info):
    """chmod操作をログに記録"""
    history = []
    CHMOD_LOG.parent.mkdir(parents=True, exist_ok=True)
    
    if CHMOD_LOG.exists():
        try:
            with open(CHMOD_LOG, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except:
            history = []
    
    entry = {
        'id': datetime.now().timestamp(),
        'timestamp': datetime.now().isoformat(),
        'command': command,
        'project': 'DNSweeper',
        'paths': paths_info,
        'restored': False
    }
    
    history.append(entry)
    history = history[-200:]  # 最新200件を保持
    
    with open(CHMOD_LOG, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2, ensure_ascii=False)
    
    return entry['id']

def parse_chmod_command(command):
    """chmodコマンドを解析"""
    patterns = [
        (r'chmod\s+([0-7]{3,4})\s+(.+)', 'octal'),
        (r'chmod\s+\+([rwx]+)\s+(.+)', 'add'),
        (r'chmod\s+-([rwx]+)\s+(.+)', 'remove'),
        (r'chmod\s+([ugoa]+)([+-=])([rwx]+)\s+(.+)', 'symbolic'),
        (r'chmod\s+-R\s+([0-7]{3,4})\s+(.+)', 'recursive_octal'),
        (r'chmod\s+-R\s+\+([rwx]+)\s+(.+)', 'recursive_add')
    ]
    
    for pattern, mode_type in patterns:
        match = re.match(pattern, command)
        if match:
            return {
                'type': mode_type,
                'match': match.groups(),
                'recursive': '-R' in command
            }
    
    return None

def main():
    """PreToolUse hookとして動作"""
    try:
        hook_input = json.load(sys.stdin)
        tool_input = hook_input.get('tool_input', {})
        
        command = ''
        if isinstance(tool_input, dict):
            command = tool_input.get('command', tool_input.get('cmd', ''))
        else:
            command = str(tool_input)
        
        if not command.strip().startswith('chmod'):
            sys.exit(0)
        
        parsed = parse_chmod_command(command)
        if not parsed:
            sys.exit(0)
        
        # 対象パスを取得
        paths = []
        if parsed['match']:
            path_arg = parsed['match'][-1]
            for p in path_arg.split():
                p = p.strip()
                if os.path.exists(p):
                    paths.append(p)
        
        if not paths:
            sys.exit(0)
        
        policy = load_policy()
        
        # DNSweeperファイルのみを監視
        dnsweeper_files = [p for p in paths if is_dnsweeper_file(p)]
        if not dnsweeper_files:
            sys.exit(0)
        
        paths_info = {}
        warning_count = 0
        security_risks = []
        
        print("\n🔐 DNSweeper 権限変更を監視中...", file=sys.stderr)
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", file=sys.stderr)
        
        for path in dnsweeper_files:
            current = get_current_permissions(path)
            if current:
                recommended = get_recommended_permission(path, policy)
                category = get_file_category(path)
                
                paths_info[path] = {
                    'before': current,
                    'recommended': recommended,
                    'category': category,
                    'command_type': parsed['type']
                }
                
                # 表示
                print(f"📁 {path}", file=sys.stderr)
                print(f"   カテゴリ: {category}", file=sys.stderr)
                print(f"   現在: {current['symbolic']} ({current['octal']})", file=sys.stderr)
                print(f"   推奨: {recommended}", file=sys.stderr)
                
                # リスク分析（新しい権限を推定）
                if parsed['type'] == 'octal':
                    new_perm = parsed['match'][0]
                    risks = analyze_security_risk(path, current['octal'], new_perm)
                    if risks:
                        security_risks.extend(risks)
                        for risk in risks:
                            print(f"   {risk}", file=sys.stderr)
                        warning_count += 1
        
        if warning_count > 0:
            print(f"\n⚠️  {warning_count}個のセキュリティ警告があります", file=sys.stderr)
        
        if security_risks:
            print("\n📋 セキュリティ推奨事項:", file=sys.stderr)
            print("   • ソースコード (.ts/.js): 644", file=sys.stderr)
            print("   • スクリプト (.sh/.py): 755", file=sys.stderr)
            print("   • 環境変数 (.env.*): 400", file=sys.stderr)
            print("   • ビルド成果物 (dist/): 444", file=sys.stderr)
        
        print("\n📝 作業終了後、推奨権限に自動復元されます", file=sys.stderr)
        print("💡 手動復元: python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py", file=sys.stderr)
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n", file=sys.stderr)
        
        # ログに記録
        log_id = log_chmod_action(command, paths_info)
        
        # 一時ファイルに保存
        TEMP_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(TEMP_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                'log_id': log_id,
                'command': command,
                'paths_info': paths_info
            }, f)
    
    except Exception as e:
        print(f"❌ 監視エラー: {e}", file=sys.stderr)
    
    sys.exit(0)

if __name__ == '__main__':
    main()