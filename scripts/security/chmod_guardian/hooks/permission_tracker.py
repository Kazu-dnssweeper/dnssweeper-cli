#!/usr/bin/env python3
"""
PostToolUse: DNSweeperでのchmod実行後の権限変更を追跡
"""
import json
import sys
import os
from pathlib import Path
from datetime import datetime

DZA_DIR = Path.home() / '.dza'
TEMP_FILE = DZA_DIR / 'temp' / 'current_chmod.json'
CHMOD_LOG = DZA_DIR / 'security' / 'chmod_history.json'
ACTIVITY_FILE = DZA_DIR / 'status' / 'last_activity.json'

def update_last_activity():
    """最終アクティビティを更新"""
    ACTIVITY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(ACTIVITY_FILE, 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'type': 'chmod_executed',
            'project': 'DNSweeper'
        }, f)

def track_permission_changes():
    """実行後の権限変更を追跡"""
    if not TEMP_FILE.exists():
        return
    
    try:
        # 一時ファイルから情報を読み込み
        with open(TEMP_FILE, 'r') as f:
            temp_data = json.load(f)
        
        # 実行後の権限を確認
        after_perms = {}
        changes_detected = []
        
        for path, info in temp_data['paths_info'].items():
            if os.path.exists(path):
                # chmod_guardian.pyから関数をインポート
                sys.path.insert(0, str(Path(__file__).parent))
                from chmod_guardian import get_current_permissions
                
                after = get_current_permissions(path)
                if after:
                    after_perms[path] = after
                    
                    # 変更を検出
                    before_octal = info['before']['octal']
                    after_octal = after['octal']
                    
                    if before_octal != after_octal:
                        changes_detected.append({
                            'path': path,
                            'before': before_octal,
                            'after': after_octal,
                            'recommended': info['recommended'],
                            'category': info.get('category', 'unknown')
                        })
        
        # 変更があれば履歴を更新
        if changes_detected and CHMOD_LOG.exists():
            with open(CHMOD_LOG, 'r') as f:
                history = json.load(f)
            
            # 該当エントリを探して更新
            for entry in reversed(history):
                if entry.get('id') == temp_data.get('log_id'):
                    entry['after_perms'] = after_perms
                    entry['changes'] = changes_detected
                    break
            
            with open(CHMOD_LOG, 'w') as f:
                json.dump(history, f, indent=2, ensure_ascii=False)
            
            # 変更サマリーを表示
            if changes_detected:
                print(f"\n✅ DNSweeper: {len(changes_detected)}個の権限変更を記録しました", file=sys.stderr)
                
                # カテゴリ別にグループ化
                categories = {}
                for change in changes_detected:
                    cat = change.get('category', 'other')
                    if cat not in categories:
                        categories[cat] = []
                    categories[cat].append(change)
                
                for cat, changes in categories.items():
                    print(f"   • {cat}: {len(changes)}件", file=sys.stderr)
        
        # 一時ファイルを削除
        os.remove(TEMP_FILE)
        
    except Exception as e:
        print(f"⚠️ 追跡エラー: {e}", file=sys.stderr)
    
    # 最終アクティビティを更新
    update_last_activity()

def check_auto_restore():
    """自動復元の必要性をチェック"""
    ACTIVITY_FILE = DZA_DIR / 'status' / 'last_activity.json'
    
    if ACTIVITY_FILE.exists():
        try:
            with open(ACTIVITY_FILE, 'r') as f:
                data = json.load(f)
                if data.get('project') == 'DNSweeper':
                    last_time = datetime.fromisoformat(data['timestamp'])
                    
                    # 30分以上アクティビティがない場合
                    if (datetime.now() - last_time).total_seconds() > 1800:
                        print("\n⏰ DNSweeper: セッションタイムアウト検出", file=sys.stderr)
                        print("💡 権限復元を推奨します:", file=sys.stderr)
                        print("   python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py", file=sys.stderr)
        except:
            pass

def main():
    """PostToolUse hookとして動作"""
    try:
        track_permission_changes()
        # check_auto_restore()  # 必要に応じて有効化
    except Exception as e:
        # エラーは静かに処理
        pass

if __name__ == '__main__':
    main()