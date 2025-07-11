---
name: dns-pdca-release
description: DNSweeperリリースPDCA（リリース前後で実行）
arguments: []
---

**リリースPDCAサイクル：リリース前後で実行**

## 🚀 リリース前チェック（10分）

### 1️⃣ Plan（計画）- 2分
- リリースバージョン確認
- リリースノート準備状況
- Breaking Changes確認

### 2️⃣ Do（実行）- 3分
**リリース準備チェック**
- [ ] バージョン番号更新
- [ ] CHANGELOG.md更新
- [ ] npm pack成功
- [ ] テスト全pass
- [ ] ビルド成功
- [ ] TypeScriptエラーなし

### 3️⃣ Check（評価）- 3分
**品質ゲート**
- テストカバレッジ: 90%以上
- パッケージサイズ: 50KB以下
- 依存関係の脆弱性: 0件
- ドキュメント更新: 完了

### 4️⃣ Act（改善）- 2分
- リリース可否判定
- リスク項目の洗い出し
- ロールバック計画確認

## 📊 リリース後モニタリング（24時間）

### 自動監視項目
- npm週間ダウンロード数
- GitHub Issue新規作成数
- エラー報告の有無
- SNS/コミュニティの反応

## 実行手順
1. リリース前チェックリスト実行
2. リリース実行（npm publish）
3. リリース後24時間監視
4. 振り返りレポート作成

## 出力形式
```yaml
version: "v0.2.0"
release_date: "2025-01-11"
status: "SUCCESS"
downloads_24h: 150
issues_reported: 0
rollback_needed: false
lessons_learned:
  - "リリースプロセス改善点"
time_spent: "10分"
```