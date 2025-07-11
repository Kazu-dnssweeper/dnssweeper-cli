# 📬 GitHub Issue通知システム ガイド

DNSweeperのGitHub Issue通知システムの使い方を説明します。

## 🚀 クイックスタート

### 1. Issue監視の開始
```bash
npm run watch:issues
```
新しいissueが作成されると、Claude Codeへの指示が自動生成されます。

### 2. 未解決issue一覧の確認
```bash
npm run issues:open
```

### 3. PR状況の確認
```bash
npm run pr:status
```

## 📋 利用可能なコマンド

| コマンド | 説明 |
|---------|------|
| `npm run watch:issues` | 新しいissueを監視（手動実行） |
| `npm run issues` | issue一覧を表示（gh issue list） |
| `npm run issue:create` | 新しいissueを作成 |
| `npm run issues:open` | 未解決issue詳細表示 |
| `npm run pr:status` | PR状況確認 |
| `npm run issue:label` | issue自動ラベリング |

## 🤖 Issue監視システムの動作

1. **初回実行時**: 現在の最新issue番号を記録
2. **2回目以降**: 新しいissueのみを検出
3. **新issue検出時**: 
   - issue情報を表示
   - Claude Codeへの指示を自動生成
   - コピペ可能な形式で出力

### 出力例
```
🆕 新しいissueが見つかりました！

📌 Issue #123: TypeScriptエラーが発生する
👤 作成者: user-name
📅 作成日時: 2025-07-10T12:00:00Z
🏷️ ラベル: bug, typescript

📄 本文:
ビルド時にTypeScriptエラーが発生します...

🤖 Claude Codeへの指示（コピペ用）:
----------------------------------------
GitHub Issue #123 を確認して対応してください。
...
```

## 🏷️ 自動ラベリング

### ドライラン（推奨ラベルの確認）
```bash
npm run issue:label -- --dry-run
```

### 特定issueへのラベル付け
```bash
npm run issue:label -- 123
```

### ラベリングルール
- **bug**: bug, error, エラー, バグ
- **enhancement**: feature, 機能, 追加
- **documentation**: docs, readme, ドキュメント
- **test**: test, テスト, jest
- **performance**: slow, パフォーマンス, 遅い
- **security**: vulnerability, セキュリティ
- **dependencies**: package, npm, 依存
- **typescript**: type, ts, 型
- **ci/cd**: ci, github actions, workflow

## ⏰ 自動実行の設定

### Linux/Mac (cron)
```bash
# crontab -e で編集
*/5 * * * * cd /path/to/dnsweeper-cli && npm run watch:issues >> /tmp/dnssweeper-issues.log 2>&1
```

### Windows (タスクスケジューラ)
1. タスクスケジューラを開く
2. 基本タスクの作成
3. トリガー: 5分ごと
4. 操作: プログラムの開始
   - プログラム: `npm`
   - 引数: `run watch:issues`
   - 開始: `C:\path\to\dnsweeper-cli`

## 🔒 セキュリティ注意事項

1. **GitHub認証情報**
   - GitHub CLIの認証情報は `~/.config/gh/` に保存されます
   - このディレクトリをGitにコミットしないでください

2. **トークンの管理**
   - `gh auth status` で現在の認証状態を確認
   - `gh auth logout` でログアウト
   - `gh auth refresh` でトークンを更新

3. **権限の確認**
   - 必要な権限: repo, workflow
   - 不要な権限は付与しないでください

## 💡 活用例

### 1. 朝の定期チェック
```bash
# 朝のルーチンスクリプト
#!/bin/bash
echo "☀️ Good morning! DNSweeper status check..."
npm run issues:open
npm run pr:status
npm run status
```

### 2. issue→修正→PRの流れ
```bash
# 1. 新しいissueを確認
npm run watch:issues

# 2. issueに基づいてブランチ作成
git checkout -b issue-123

# 3. 修正実施
# ... コード修正 ...

# 4. コミット
git add -A
git commit -m "fix: Issue #123 - TypeScriptエラーを修正"

# 5. PR作成
gh pr create --title "Fix: Issue #123" --body "Fixes #123"
```

### 3. 週次レポート生成
```bash
# 今週のアクティビティ
echo "📊 今週のDNSweeper活動"
echo "========================"
echo ""
echo "## Closed Issues"
gh issue list --state closed --limit 10 --json number,title,closedAt --jq '.[] | select(.closedAt | startswith("2025-07"))'
echo ""
echo "## Merged PRs"
gh pr list --state merged --limit 10 --json number,title,mergedAt --jq '.[] | select(.mergedAt | startswith("2025-07"))'
```

## 🎯 トラブルシューティング

### GitHub CLI認証エラー
```bash
# 認証状態確認
gh auth status

# 再認証
gh auth login
```

### Permission denied エラー
```bash
# スクリプトに実行権限を付与
chmod +x scripts/watch-issues.sh
chmod +x scripts/github-utils/*.js
```

### Issue監視がリセットされた
```bash
# 手動で最後のissue番号を設定
echo "123" > .last-issue-check
```

---

このシステムにより、GitHub Issueの対応が効率化され、見逃しを防ぐことができます！🚀