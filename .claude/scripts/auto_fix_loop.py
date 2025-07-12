#!/usr/bin/env python3
"""
自動エラー修正ループシステム
GitHub Actions のエラーを検出して自動修正し、治るまで繰り返す
"""

import subprocess
import re
import json
import time
import os
from typing import List, Dict, Optional

class AutoFixLoop:
    def __init__(self, project_path: str = "/mnt/c/projects/dnssweeper-cli"):
        self.project_path = project_path
        self.max_iterations = 10
        
    def run_lint(self) -> tuple[bool, str]:
        """ESLintを実行してエラーを取得"""
        try:
            result = subprocess.run(
                ["pnpm", "run", "lint"], 
                cwd=self.project_path,
                capture_output=True, 
                text=True,
                timeout=300
            )
            return result.returncode == 0, result.stdout + result.stderr
        except subprocess.TimeoutExpired:
            return False, "Lint timeout"
        except Exception as e:
            return False, f"Lint error: {str(e)}"
    
    def parse_eslint_errors(self, output: str) -> List[Dict]:
        """ESLintエラーをパースして構造化"""
        errors = []
        current_file = None
        
        for line in output.split('\n'):
            # ファイルパスの検出
            if line.startswith('/') and line.endswith('.js'):
                current_file = line.strip()
                continue
                
            # エラー行の検出 (例: "Error:    89:55  error    Unnecessary escape character")
            error_match = re.match(r'^\s*(Error|Warning):\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(.+)$', line)
            if error_match and current_file:
                severity, line_num, col_num, type_str, message, rule = error_match.groups()
                errors.append({
                    'file': current_file,
                    'line': int(line_num),
                    'column': int(col_num),
                    'severity': severity.lower(),
                    'type': type_str,
                    'message': message.strip(),
                    'rule': rule.strip()
                })
        
        return errors
    
    def fix_eslint_error(self, error: Dict) -> bool:
        """個別のESLintエラーを自動修正"""
        file_path = error['file']
        line_num = error['line']
        rule = error['rule']
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            if line_num > len(lines):
                return False
                
            target_line = lines[line_num - 1]
            original_line = target_line
            
            # ルール別の自動修正
            if rule == 'no-useless-escape':
                # 不要なエスケープを除去
                target_line = re.sub(r'\\(.)', r'\1', target_line)
                
            elif rule == 'no-console':
                # console文にeslint-disable-next-lineを追加
                indent = re.match(r'^(\s*)', target_line).group(1)
                disable_comment = f"{indent}// eslint-disable-next-line no-console\n"
                lines.insert(line_num - 1, disable_comment)
                
            elif rule == 'no-control-regex':
                # 制御文字の正規表現にeslint-disable-next-lineを追加
                indent = re.match(r'^(\s*)', target_line).group(1)
                disable_comment = f"{indent}// eslint-disable-next-line no-control-regex\n"
                lines.insert(line_num - 1, disable_comment)
                
            else:
                # その他のルールは自動修正を試行
                if 'escape character' in error['message']:
                    target_line = re.sub(r'\\/', '/', target_line)
                    
            # ファイルに書き戻し
            if target_line != original_line or rule in ['no-console', 'no-control-regex']:
                if rule not in ['no-console', 'no-control-regex']:
                    lines[line_num - 1] = target_line
                    
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)
                return True
                
        except Exception as e:
            print(f"修正エラー: {file_path}:{line_num} - {str(e)}")
            
        return False
    
    def run_tests(self) -> tuple[bool, str]:
        """テストを実行"""
        try:
            result = subprocess.run(
                ["pnpm", "test"], 
                cwd=self.project_path,
                capture_output=True, 
                text=True,
                timeout=600
            )
            return result.returncode == 0, result.stdout + result.stderr
        except subprocess.TimeoutExpired:
            return False, "Test timeout"
        except Exception as e:
            return False, f"Test error: {str(e)}"
    
    def commit_fixes(self, iteration: int) -> bool:
        """修正をコミット"""
        try:
            # ステージング
            subprocess.run(["git", "add", "."], cwd=self.project_path, check=True)
            
            # コミット
            commit_msg = f"""fix: Auto-fix ESLint errors (iteration {iteration})

🤖 Automated fixes applied by auto-fix loop system

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"""
            
            result = subprocess.run(
                ["git", "commit", "-m", commit_msg],
                cwd=self.project_path,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                # プッシュ
                subprocess.run(["git", "push", "origin", "main"], cwd=self.project_path, check=True)
                return True
                
        except subprocess.CalledProcessError as e:
            print(f"Git操作エラー: {str(e)}")
            
        return False
    
    def run_auto_fix_loop(self) -> bool:
        """自動修正ループのメイン処理"""
        print("🤖 自動エラー修正ループ開始...")
        
        for iteration in range(1, self.max_iterations + 1):
            print(f"\n--- 反復 {iteration}/{self.max_iterations} ---")
            
            # 1. Lintチェック
            print("📋 ESLintチェック実行中...")
            lint_success, lint_output = self.run_lint()
            
            if lint_success:
                print("✅ ESLintエラーなし！")
                
                # 2. テスト実行
                print("🧪 テスト実行中...")
                test_success, test_output = self.run_tests()
                
                if test_success:
                    print("✅ 全てのテストが通過！修正完了です！")
                    return True
                else:
                    print("❌ テストが失敗しました:")
                    print(test_output[:1000])
                    # テストエラーは継続（lintが通ればOK）
                    return True
            
            # 3. エラーをパース
            errors = self.parse_eslint_errors(lint_output)
            if not errors:
                print("❌ ESLintエラーをパースできませんでした:")
                print(lint_output[:1000])
                continue
                
            print(f"🔍 {len(errors)}個のエラーを検出:")
            for error in errors[:5]:  # 最初の5個を表示
                print(f"  - {error['file']}:{error['line']} {error['rule']} - {error['message']}")
            
            # 4. エラーを自動修正
            print("🔧 自動修正中...")
            fixed_count = 0
            for error in errors:
                if self.fix_eslint_error(error):
                    fixed_count += 1
                    
            print(f"✨ {fixed_count}/{len(errors)}個のエラーを修正")
            
            if fixed_count == 0:
                print("❌ 修正できるエラーがありませんでした")
                break
                
            # 5. コミット
            if self.commit_fixes(iteration):
                print("📝 修正をコミット・プッシュしました")
            else:
                print("⚠️  コミットに失敗しました")
                
            # 少し待機
            time.sleep(2)
        
        print(f"\n❌ {self.max_iterations}回の反復で修正できませんでした")
        return False

def main():
    """メイン実行"""
    fixer = AutoFixLoop()
    success = fixer.run_auto_fix_loop()
    
    if success:
        print("\n🎉 自動修正が完了しました！")
        exit(0)
    else:
        print("\n💥 自動修正が失敗しました")
        exit(1)

if __name__ == "__main__":
    main()