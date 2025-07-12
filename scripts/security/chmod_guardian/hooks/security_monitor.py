#!/usr/bin/env python3
"""
DNSweeper セキュリティ監視システム
権限変更の状態を監視し、セキュリティレポートを生成
"""
import json
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict

DZA_DIR = Path.home() / '.dza'
CHMOD_LOG = DZA_DIR / 'security' / 'chmod_history.json'
SECURITY_STATUS = DZA_DIR / 'status' / 'security_status.json'
PROJECT_ROOT = Path.cwd()

def analyze_security_status():
    """DNSweeperのセキュリティ状態を分析"""
    if not CHMOD_LOG.exists():
        return {
            'status': 'no_data',
            'pending_restorations': 0,
            'recent_changes': 0,
            'warnings': [],
            'summary': {}
        }
    
    try:
        with open(CHMOD_LOG, 'r') as f:
            history = json.load(f)
    except:
        return {'status': 'error'}
    
    now = datetime.now()
    pending = 0
    recent = 0
    warnings = []
    category_stats = defaultdict(int)
    risky_permissions = []
    
    # DNSweeperプロジェクトのエントリのみ分析
    dnsweeper_entries = [e for e in history if e.get('project') == 'DNSweeper']
    
    for entry in dnsweeper_entries:
        if entry.get('restored', False):
            continue
        
        timestamp = datetime.fromisoformat(entry['timestamp'])
        age = now - timestamp
        
        if age < timedelta(hours=24):
            recent += 1
            if not entry.get('restored'):
                pending += 1
        
        # カテゴリ別統計
        for path, info in entry.get('paths', {}).items():
            category = info.get('category', 'other')
            category_stats[category] += 1
            
            # 危険な権限をチェック
            if 'after_perms' in entry:
                after_octal = entry['after_perms'].get(path, {}).get('octal', '')
                
                # 危険な権限パターン
                if after_octal in ['777', '666']:
                    risky_permissions.append({
                        'path': path,
                        'permission': after_octal,
                        'timestamp': entry['timestamp'],
                        'severity': 'critical'
                    })
                elif after_octal == '755' and category == 'source_code':
                    risky_permissions.append({
                        'path': path,
                        'permission': after_octal,
                        'timestamp': entry['timestamp'],
                        'severity': 'medium',
                        'reason': 'ソースコードに実行権限'
                    })
                elif '.env' in path and int(after_octal) > 400:
                    risky_permissions.append({
                        'path': path,
                        'permission': after_octal,
                        'timestamp': entry['timestamp'],
                        'severity': 'high',
                        'reason': '環境変数ファイルの権限が緩い'
                    })
    
    # 最新の警告のみ保持
    warnings = sorted(risky_permissions, key=lambda x: x['timestamp'], reverse=True)[:5]
    
    return {
        'status': 'active',
        'pending_restorations': pending,
        'recent_changes': recent,
        'warnings': warnings,
        'category_stats': dict(category_stats),
        'last_check': now.isoformat()
    }

def display_status(status):
    """ステータスを表示"""
    print("\n🛡️  DNSweeper セキュリティステータス", file=sys.stderr)
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", file=sys.stderr)
    
    if status['status'] == 'no_data':
        print("📊 まだchmod履歴がありません", file=sys.stderr)
        return
    
    print(f"📝 最近の変更: {status['recent_changes']}件 (過去24時間)", file=sys.stderr)
    print(f"⏳ 復元待ち: {status['pending_restorations']}件", file=sys.stderr)
    
    # カテゴリ別統計
    if status.get('category_stats'):
        print("\n📊 カテゴリ別変更数:", file=sys.stderr)
        for category, count in status['category_stats'].items():
            print(f"   • {category}: {count}件", file=sys.stderr)
    
    # セキュリティ警告
    if status['warnings']:
        print(f"\n⚠️  セキュリティ警告: {len(status['warnings'])}件", file=sys.stderr)
        
        severity_emoji = {
            'critical': '🚨',
            'high': '⚠️',
            'medium': '⚡',
            'low': '💡'
        }
        
        for warn in status['warnings']:
            emoji = severity_emoji.get(warn['severity'], '⚠️')
            print(f"\n{emoji} {warn['path']}", file=sys.stderr)
            print(f"   権限: {warn['permission']}", file=sys.stderr)
            print(f"   重要度: {warn['severity']}", file=sys.stderr)
            if 'reason' in warn:
                print(f"   理由: {warn['reason']}", file=sys.stderr)
    
    if status['pending_restorations'] > 0:
        print(f"\n💡 権限を復元するには:", file=sys.stderr)
        print(f"   python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py", file=sys.stderr)
        
        if status['pending_restorations'] >= 10:
            print(f"\n⚠️  未復元の変更が多数あります！", file=sys.stderr)
            print(f"   全体復元: python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py --hours 24", file=sys.stderr)

def generate_security_report():
    """詳細なセキュリティレポートを生成"""
    print("\n📋 DNSweeper セキュリティレポート", file=sys.stderr)
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", file=sys.stderr)
    print(f"生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)
    
    # 現在の状態を分析
    status = analyze_security_status()
    
    # 推奨事項
    print("\n🔐 セキュリティ推奨事項:", file=sys.stderr)
    print("1. ソースコード (.ts/.js): 644 - 読み取り専用", file=sys.stderr)
    print("2. スクリプト (.sh/.py): 755 - 実行可能", file=sys.stderr)
    print("3. 環境変数 (.env.*): 400 - 所有者のみ読み取り", file=sys.stderr)
    print("4. ビルド成果物 (dist/): 444 - 変更防止", file=sys.stderr)
    print("5. 設定ファイル (.json): 644 - 読み取り専用", file=sys.stderr)
    
    # ベストプラクティス
    print("\n💡 ベストプラクティス:", file=sys.stderr)
    print("• 定期的に権限監査を実行", file=sys.stderr)
    print("  python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py --audit", file=sys.stderr)
    print("• 作業終了後は必ず権限を復元", file=sys.stderr)
    print("• 環境変数ファイルは特に注意", file=sys.stderr)
    
    # 自動化の提案
    if status['pending_restorations'] > 0:
        print("\n🤖 自動化の提案:", file=sys.stderr)
        print("Claude Codeのhook機能を使用して自動監視・復元を有効化できます", file=sys.stderr)
        print("設定方法: ~/.claude/settings.local.json を更新", file=sys.stderr)

def check_critical_files():
    """重要ファイルの権限をチェック"""
    critical_files = [
        ('.env', '400', 'critical'),
        ('.env.local', '400', 'critical'),
        ('.env.production', '400', 'critical'),
        ('package.json', '644', 'high'),
        ('tsconfig.json', '644', 'medium'),
        ('vitest.config.ts', '644', 'medium')
    ]
    
    issues = []
    
    for file_path, expected_perm, severity in critical_files:
        full_path = PROJECT_ROOT / file_path
        if full_path.exists():
            try:
                from chmod_guardian import get_current_permissions
                current = get_current_permissions(full_path)
                if current and current['octal'] != expected_perm:
                    issues.append({
                        'file': file_path,
                        'current': current['octal'],
                        'expected': expected_perm,
                        'severity': severity
                    })
            except:
                pass
    
    if issues:
        print("\n🚨 重要ファイルの権限問題:", file=sys.stderr)
        for issue in issues:
            severity_emoji = {
                'critical': '🚨',
                'high': '⚠️',
                'medium': '⚡'
            }
            emoji = severity_emoji.get(issue['severity'], '⚠️')
            print(f"{emoji} {issue['file']}: {issue['current']} → {issue['expected']}", file=sys.stderr)

def main():
    """Stop hookまたは手動実行"""
    if len(sys.argv) > 1:
        if sys.argv[1] == 'check':
            status = analyze_security_status()
            
            # ステータスを保存
            SECURITY_STATUS.parent.mkdir(parents=True, exist_ok=True)
            with open(SECURITY_STATUS, 'w') as f:
                json.dump(status, f, indent=2)
            
            # 表示
            display_status(status)
            check_critical_files()
            
        elif sys.argv[1] == 'report':
            generate_security_report()
            status = analyze_security_status()
            display_status(status)
            check_critical_files()
    else:
        # 簡易チェック（Stop hook用）
        status = analyze_security_status()
        if status['pending_restorations'] > 0:
            print(f"\n📌 DNSweeper: {status['pending_restorations']}個の権限復元待ち", file=sys.stderr)
            if status['warnings']:
                print(f"⚠️  セキュリティ警告: {len(status['warnings'])}件", file=sys.stderr)

if __name__ == '__main__':
    main()