#!/usr/bin/env python3
"""
DNSweeper権限復元システム
プロジェクトのセキュリティポリシーに基づいて権限を復元
"""
import json
import os
import sys
import argparse
from pathlib import Path
from datetime import datetime, timedelta

# 設定
DZA_DIR = Path.home() / '.dza'
CHMOD_LOG = DZA_DIR / 'security' / 'chmod_history.json'
PROJECT_ROOT = Path.cwd()
POLICY_FILE = PROJECT_ROOT / 'scripts' / 'security' / 'chmod_guardian' / 'policies' / 'dnsweeper_policy.json'
RESTORE_LOG = DZA_DIR / 'security' / 'restore_history.json'

def load_policy():
    """DNSweeperセキュリティポリシーを読み込み"""
    try:
        with open(POLICY_FILE, 'r') as f:
            return json.load(f)
    except:
        print("⚠️ ポリシーファイルが見つかりません", file=sys.stderr)
        return None

def get_recommended_permission(path, policy):
    """推奨権限を取得（chmod_guardian.pyから）"""
    from chmod_guardian import get_recommended_permission as get_perm
    return get_perm(path, policy)

def restore_permissions(hours=1, force=False, dry_run=False, category=None):
    """指定時間内の権限変更を復元"""
    if not CHMOD_LOG.exists():
        print("❌ chmod履歴が見つかりません", file=sys.stderr)
        return
    
    try:
        with open(CHMOD_LOG, 'r') as f:
            history = json.load(f)
    except Exception as e:
        print(f"❌ 履歴読み込みエラー: {e}", file=sys.stderr)
        return
    
    policy = load_policy()
    if not policy:
        return
    
    now = datetime.now()
    restored_count = 0
    skipped_count = 0
    restore_actions = []
    
    print("\n🔐 DNSweeper 権限復元処理を開始します...", file=sys.stderr)
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", file=sys.stderr)
    
    # DNSweeperプロジェクトのエントリのみフィルタ
    dnsweeper_entries = [e for e in history if e.get('project') == 'DNSweeper']
    
    for entry in dnsweeper_entries:
        if entry.get('restored', False) and not force:
            continue
        
        timestamp = datetime.fromisoformat(entry['timestamp'])
        if not force and (now - timestamp > timedelta(hours=hours)):
            continue
        
        for path, info in entry.get('paths', {}).items():
            # カテゴリフィルタ
            if category and info.get('category') != category:
                continue
            
            if not os.path.exists(path):
                print(f"⚠️ スキップ: {path} (ファイルが存在しません)", file=sys.stderr)
                skipped_count += 1
                continue
            
            try:
                from chmod_guardian import get_current_permissions
                recommended = info.get('recommended') or get_recommended_permission(path, policy)
                current = get_current_permissions(path)
                
                if current and current['octal'] != recommended:
                    if dry_run:
                        print(f"🔍 {path}", file=sys.stderr)
                        print(f"   カテゴリ: {info.get('category', 'unknown')}", file=sys.stderr)
                        print(f"   現在: {current['octal']} → 推奨: {recommended}", file=sys.stderr)
                    else:
                        # 権限を復元
                        mode = int(recommended, 8)
                        os.chmod(path, mode)
                        
                        print(f"✅ {path}", file=sys.stderr)
                        print(f"   復元: {current['octal']} → {recommended}", file=sys.stderr)
                        
                        restored_count += 1
                        restore_actions.append({
                            'path': path,
                            'from': current['octal'],
                            'to': recommended,
                            'category': info.get('category'),
                            'timestamp': datetime.now().isoformat()
                        })
                        
                        entry['restored'] = True
            
            except Exception as e:
                print(f"❌ 復元失敗 {path}: {e}", file=sys.stderr)
                skipped_count += 1
    
    # 履歴を更新
    if not dry_run and restored_count > 0:
        with open(CHMOD_LOG, 'w') as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
        
        # 復元履歴を記録
        restore_history = []
        if RESTORE_LOG.exists():
            try:
                with open(RESTORE_LOG, 'r') as f:
                    restore_history = json.load(f)
            except:
                pass
        
        restore_history.append({
            'timestamp': datetime.now().isoformat(),
            'project': 'DNSweeper',
            'restored_count': restored_count,
            'actions': restore_actions
        })
        
        with open(RESTORE_LOG, 'w') as f:
            json.dump(restore_history[-50:], f, indent=2, ensure_ascii=False)
    
    # サマリー表示
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", file=sys.stderr)
    if dry_run:
        print(f"📊 ドライラン結果: {restored_count}個の復元対象", file=sys.stderr)
    else:
        print(f"📊 復元完了: {restored_count}個", file=sys.stderr)
    
    if skipped_count > 0:
        print(f"⚠️  スキップ: {skipped_count}個", file=sys.stderr)
    
    print(f"🕐 対象期間: 過去{hours}時間以内の変更", file=sys.stderr)
    
    if category:
        print(f"📁 対象カテゴリ: {category}", file=sys.stderr)

def audit_permissions():
    """現在の権限状態を監査"""
    print("\n🔍 DNSweeper 権限監査レポート", file=sys.stderr)
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", file=sys.stderr)
    
    issues = []
    
    # 重要なディレクトリとファイルをチェック
    critical_paths = [
        ('src/', 'directory', '755'),
        ('dist/', 'directory', '755'),
        ('scripts/', 'directory', '755'),
        ('.env', 'file', '400'),
        ('.env.local', 'file', '400'),
        ('package.json', 'file', '644'),
        ('tsconfig.json', 'file', '644')
    ]
    
    for path, path_type, expected in critical_paths:
        full_path = PROJECT_ROOT / path
        if full_path.exists():
            try:
                from chmod_guardian import get_current_permissions
                current = get_current_permissions(full_path)
                if current and current['octal'] != expected:
                    issues.append({
                        'path': path,
                        'current': current['octal'],
                        'expected': expected,
                        'severity': 'high' if '.env' in path else 'medium'
                    })
            except:
                pass
    
    # TypeScriptファイルをチェック
    ts_files = list(PROJECT_ROOT.glob('src/**/*.ts'))
    executable_ts = []
    
    for ts_file in ts_files[:10]:  # 最初の10ファイルのみチェック
        try:
            from chmod_guardian import get_current_permissions
            current = get_current_permissions(ts_file)
            if current and current['is_executable']:
                executable_ts.append(str(ts_file.relative_to(PROJECT_ROOT)))
        except:
            pass
    
    if executable_ts:
        issues.append({
            'type': 'executable_source',
            'files': executable_ts,
            'severity': 'low'
        })
    
    # レポート表示
    if issues:
        print(f"\n⚠️  {len(issues)}個の問題を検出しました:", file=sys.stderr)
        
        for issue in issues:
            if 'path' in issue:
                print(f"\n📁 {issue['path']}", file=sys.stderr)
                print(f"   現在: {issue['current']} → 推奨: {issue['expected']}", file=sys.stderr)
                print(f"   重要度: {issue['severity']}", file=sys.stderr)
            elif issue['type'] == 'executable_source':
                print(f"\n⚠️  実行権限を持つソースファイル: {len(issue['files'])}個", file=sys.stderr)
                for f in issue['files'][:3]:
                    print(f"   • {f}", file=sys.stderr)
    else:
        print("\n✅ すべての権限が適切に設定されています", file=sys.stderr)
    
    print("\n💡 修正方法:", file=sys.stderr)
    print("   python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py --force", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description='DNSweeper権限を復元')
    parser.add_argument('--hours', type=int, default=1, 
                       help='対象期間（時間）')
    parser.add_argument('--force', action='store_true', 
                       help='復元済みも再度復元')
    parser.add_argument('--dry-run', action='store_true', 
                       help='実行せずに確認のみ')
    parser.add_argument('--category', choices=['source_code', 'test', 'config', 'script', 'environment', 'build_output'],
                       help='特定カテゴリのみ復元')
    parser.add_argument('--audit', action='store_true',
                       help='権限監査を実行')
    
    args = parser.parse_args()
    
    if args.audit:
        audit_permissions()
    else:
        restore_permissions(
            hours=args.hours,
            force=args.force,
            dry_run=args.dry_run,
            category=args.category
        )

if __name__ == '__main__':
    main()