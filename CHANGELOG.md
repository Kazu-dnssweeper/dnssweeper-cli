# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 🚀 **ストリーミングモード** - 大規模ファイル（100万件以上）対応
  - `--stream` オプションでメモリ効率的な処理を実現
  - `--memory-limit` でメモリ使用量を制限可能
  - `--chunk-size` でチャンクサイズの調整可能
- 最適化ストリーミングモード（メモリ制限50MB以下で自動有効化）
  - 100万件のデータを21MBのメモリで処理可能
  - 処理速度: 195,925レコード/秒
- 大規模テストデータ生成スクリプト（`scripts/generate-large-test-data.js`）
- ベンチマークスクリプト（`scripts/benchmark-streaming.js`）

### Changed
- テストカバレッジを94.21%に向上（目標60%を大幅超過）
- TypeScript strictモード完全対応
- すべてのESLintエラー・警告を解消

### Fixed
- GitHub Actions publish workflowの修正

## [0.1.0] - 2025-07-10

### Added
- 初回リリース 🎉
- DNSレコードのパターンマッチング分析機能
- リスクレベル判定（Critical/High/Medium/Low/Safe）
- 複数出力形式対応（table/json/csv）
- 日本語・英語の多言語対応
- リスクレベルによるフィルタリング機能
- ファイル出力機能（--output-file）
- 月次DNS棚卸しガイド
- GitHub Actions CI/CD パイプライン
- npm自動公開ワークフロー
- GitHub Issue通知システム
- フィードバック収集インフラ

### Security
- 読み取り専用操作のみ実装（削除・変更機能なし）
- APIキーや認証情報の送信なし
- ローカルファイル解析のみ実行

[Unreleased]: https://github.com/Kazu-dnssweeper/dnssweeper-cli/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Kazu-dnssweeper/dnssweeper-cli/releases/tag/v0.1.0