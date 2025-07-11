---
name: dpd
description: DNSweeper日次PDCAチェック（5分で完了）
arguments: []
---

**日次PDCAサイクル：毎日実行推奨**

## 🔄 自動実行内容（5分以内）

### 1️⃣ Plan（計画）- 30秒
- 昨日の残タスク確認
- 今日の優先度確認

### 2️⃣ Do（実行）- レビューのみ
- 昨日のコミット確認
- 今日の作業予定確認

### 3️⃣ Check（評価）- 2分
**品質チェック**
- テスト成功率
- ビルドステータス
- Lintエラー数
- TypeScriptエラー

**進捗チェック**
- Issue消化率
- PR進捗状況

### 4️⃣ Act（改善）- 2分30秒
- 即時対応項目の抽出
- ブロッカーの特定と解決策

## 実行手順
1. `.pdca/daily/`に実行記録を保存
2. 異常検知時のみアラート
3. 週次PDCAへの申し送り事項を記録

## 出力形式
```yaml
date: "2025-01-11"
status: "GREEN" # GREEN/YELLOW/RED
tests: "PASS"
build: "SUCCESS"
issues_closed: 2
blockers: []
time_spent: "4分15秒"
```