---
name: dns-update
description: DNSweeper進捗更新（context.mdを最新化）
arguments:
  - name: message
    description: 更新内容のメッセージ (省略時は自動検出)
    default: ""
---

**dnssweeper-context.mdを現在の作業状態に基づいて更新**

1. **現在の状態を分析：**
   - Gitの変更状況確認（`git status`, `git diff --stat`）
   - package.jsonのバージョン確認
   - テスト実行結果の確認

2. **更新内容の決定：**
   {{#if message}}
   - ユーザー指定メッセージ: {{message}}
   {{else}}
   - 変更ファイルから作業内容を推測
   - テスト結果から品質状態を判定
   - 現在時刻とフェーズ情報を含める
   {{/if}}

3. **context.md更新：**
   - 進行中セクションに現在の作業を追加
   - タイムスタンプの更新
   - 完了項目のチェックマーク追加
   - 次の作業項目の明確化

4. **更新後の処理：**
   - 更新内容の差分表示
   - コミット推奨メッセージの生成

**形式：**
```
[YYYY-MM-DD HH:mm] 更新内容
- 具体的な変更点1
- 具体的な変更点2
```