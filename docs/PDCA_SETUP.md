# DNSweeper PDCA自動化セットアップガイド

## 概要
DNSweeperのPDCA（Plan-Do-Check-Act）サイクルを自動化するための設定ガイドです。

## セットアップ手順

### 1. GitHub Actionsの有効化
リポジトリの設定でGitHub Actionsが有効になっていることを確認してください。

### 2. 必要な権限設定
GitHub Actionsがissueを作成できるように、以下の権限を設定：
- Settings → Actions → General → Workflow permissions
- "Read and write permissions" を選択
- "Allow GitHub Actions to create and approve pull requests" にチェック

### 3. GitHub Secretsの設定（オプション）
Slack通知を有効にする場合：
1. Settings → Secrets and variables → Actions
2. "New repository secret" をクリック
3. 以下のシークレットを追加：
   - `SLACK_WEBHOOK_URL`: Slack Incoming WebhookのURL

npm統計を取得する場合：
- `NPM_TOKEN`: npmアクセストークン

### 4. 初回実行
手動でワークフローを実行して動作確認：
1. Actions タブを開く
2. "Daily PDCA Check" または "Weekly PDCA Review" を選択
3. "Run workflow" をクリック

## 設定ファイル

### pdca-config.yml
プロジェクトルートの `pdca-config.yml` で以下を設定可能：
- 自動化レベル（NONE/BASIC/FULL）
- 各PDCAサイクルの有効/無効
- メトリクス目標値
- 通知設定

### ワークフローファイル
- `.github/workflows/pdca-daily.yml`: 日次チェック（毎日9:00 JST）
- `.github/workflows/pdca-weekly.yml`: 週次レビュー（毎週金曜10:00 JST）
- `.github/workflows/pdca-slack-notify.yml`: Slack通知

## メトリクス収集
`scripts/collect-metrics.js` が以下のメトリクスを自動収集：
- テストカバレッジ
- ビルドサイズ
- コミット統計
- DORAメトリクス（簡易版）

## 出力
PDCAレポートは `.pdca/` ディレクトリに保存されます：
- `.pdca/daily/`: 日次レポート
- `.pdca/weekly/`: 週次レポート
- `.pdca/metrics/`: メトリクスデータ

## トラブルシューティング

### ワークフローが実行されない
- GitHub Actionsが有効か確認
- cronスケジュールはUTC時間で設定されているか確認

### Issueが作成されない
- ワークフローの権限設定を確認
- PAT（Personal Access Token）が必要な場合があります

### Slack通知が届かない
- `SLACK_WEBHOOK_URL` が正しく設定されているか確認
- Webhook URLが有効か確認

## カスタマイズ
ワークフローファイルを編集して、以下をカスタマイズ可能：
- 実行スケジュール
- チェック項目
- 通知内容
- レポート形式