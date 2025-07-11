---
name: dpae
description: PDCA自動化を有効化（GitHub Actions連携）
arguments: []
---

**PDCA自動化設定：GitHub Actionsとの連携**

## 🤖 自動化セットアップ（30分）

### 1️⃣ 必要な設定ファイル作成

**`.github/workflows/pdca-daily.yml`**
```yaml
name: Daily PDCA Check
on:
  schedule:
    - cron: '0 0 * * *'  # 毎日 UTC 0:00 (JST 9:00)
  workflow_dispatch:

jobs:
  daily-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Daily PDCA
        run: |
          echo "Running daily PDCA checks..."
          # テスト実行
          pnpm test
          # ビルド確認
          pnpm build
          # 結果をPDCAログに保存
```

**`.github/workflows/pdca-weekly.yml`**
```yaml
name: Weekly PDCA Review
on:
  schedule:
    - cron: '0 1 * * 5'  # 毎週金曜 UTC 1:00 (JST 10:00)
  workflow_dispatch:

jobs:
  weekly-review:
    runs-on: ubuntu-latest
    steps:
      - name: Collect Metrics
        run: |
          # メトリクス収集スクリプト
      - name: Generate Report
        run: |
          # レポート生成
      - name: Create Issue
        uses: actions/github-script@v7
        with:
          script: |
            // 週次レビューIssue作成
```

### 2️⃣ 環境変数とシークレット設定
```bash
# 必要なGitHub Secrets
SLACK_WEBHOOK_URL     # Slack通知用
NPM_TOKEN            # npm統計取得用
OPENAI_API_KEY       # AI分析用（オプション）
```

### 3️⃣ 通知設定
**Slack通知例**
```json
{
  "text": "🔄 DNSweeper Daily PDCA Complete",
  "attachments": [{
    "color": "good",
    "fields": [
      {"title": "Test Status", "value": "✅ PASS"},
      {"title": "Build Status", "value": "✅ SUCCESS"},
      {"title": "Issues Closed", "value": "3"},
      {"title": "New Issues", "value": "1"}
    ]
  }]
}
```

### 4️⃣ 自動化レベル設定
```yaml
# pdca-config.yml
automation:
  level: "FULL"  # NONE | BASIC | FULL
  
  daily:
    enabled: true
    notify_on_failure: true
    auto_create_issues: true
    
  weekly:
    enabled: true
    auto_generate_report: true
    ai_insights: true
    
  release:
    enabled: true
    auto_changelog: true
    auto_version_bump: true
    
  alerts:
    enabled: true
    severity_threshold: "HIGH"
    auto_rollback: false
```

## 実行手順
1. このコマンドを実行してセットアップ開始
2. 必要なワークフローファイルを自動生成
3. GitHub Secretsの設定案内を表示
4. 初回テスト実行で動作確認

## 確認項目
- [ ] GitHub Actions有効化
- [ ] 必要な権限設定
- [ ] Slack Webhook設定
- [ ] 初回実行成功確認

## 期待される効果
- 品質問題の早期発見
- 開発効率の可視化
- 継続的な改善サイクル
- チーム全体での情報共有