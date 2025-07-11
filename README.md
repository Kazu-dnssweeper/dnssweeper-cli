# 🔍 DNSweeper CLI

[![Test](https://github.com/Kazu-dnssweeper/dnssweeper-cli/workflows/Test/badge.svg)](https://github.com/Kazu-dnssweeper/dnssweeper-cli/actions?query=workflow%3ATest)
[![CI](https://github.com/Kazu-dnssweeper/dnssweeper-cli/workflows/CI/badge.svg)](https://github.com/Kazu-dnssweeper/dnssweeper-cli/actions?query=workflow%3ACI)
[![npm version](https://img.shields.io/npm/v/dnssweeper-cli.svg)](https://www.npmjs.com/package/dnssweeper-cli)
[![npm downloads](https://img.shields.io/npm/dm/dnssweeper-cli.svg)](https://www.npmjs.com/package/dnssweeper-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/dnssweeper-cli.svg)](https://nodejs.org/)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue.svg)](SECURITY.md)

未使用のDNSレコードを検出・分析するコマンドラインツール

🎉 **v0.1.0 がnpmで公開されました！** インストール: `npm install -g dnssweeper-cli`

[English README](README.en.md)

## 🎯 概要

DNSweeper CLIは、各種DNSサービスからエクスポートしたCSVファイルを分析し、未使用の可能性が高いDNSレコードを検出するツールです。Cloudflare、AWS Route 53、Google Cloud DNS、Azure DNS、お名前.comなど、主要なDNSプロバイダーに対応しています。

### 主な機能

- 📊 **パターンマッチング分析**: 危険なプレフィックス・サフィックス・キーワードを検出
- 🎨 **色付き出力**: リスクレベル別に色分けされた見やすい表示
- 📋 **複数出力形式**: table、JSON、CSV形式での出力
- 🌐 **多言語対応**: 日本語・英語の両方に対応
- ⚡ **高速処理**: 大規模なCSVファイルも効率的に処理
- 🔒 **読み取り専用**: 安全な分析（レコードの削除・変更は行わない）
- 🏢 **マルチプロバイダー対応**: 主要DNSサービスのCSV形式を自動認識
- 🔄 **ストリーミング対応**: 100万件規模のレコードも低メモリで処理可能

## 🚀 インストール

### npm経由でのインストール

```bash
# npmを使用する場合
npm install -g dnssweeper-cli

# pnpmを使用する場合（推奨）
pnpm add -g dnssweeper-cli
```

### 直接実行（npx）

```bash
npx dnssweeper-cli analyze your-dns-records.csv
```

## 📊 リスクレベル

DNSweeper CLIは以下の5段階でリスクを評価します：

| レベル | スコア範囲 | 説明 | 表示色 |
|--------|------------|------|--------|
| 🔴 Critical | 90-100 | 即座に削除を検討すべきレコード | 赤 |
| 🟠 High | 70-89 | 削除の検討を推奨するレコード | オレンジ |
| 🟡 Medium | 50-69 | 注意が必要なレコード | 黄 |
| 🟢 Low | 30-49 | 軽微な注意点があるレコード | 緑 |
| ⚪ Safe | 0-29 | 問題のないレコード | グレー |

## 📖 使用方法

### 基本的な使用法

```bash
# CSVファイルを分析
dnssweeper analyze dns-records.csv

# 詳細な出力
dnssweeper analyze dns-records.csv --verbose

# 英語モードで実行
dnssweeper analyze dns-records.csv --english
```

### 出力形式の指定

```bash
# テーブル形式（デフォルト）
dnssweeper analyze dns-records.csv --output table

# JSON形式
dnssweeper analyze dns-records.csv --output json

# CSV形式
dnssweeper analyze dns-records.csv --output csv
```

### リスクレベルフィルタリング

```bash
# 高リスク以上のレコードのみ表示
dnssweeper analyze dns-records.csv --risk-level high

# クリティカルなレコードのみ表示
dnssweeper analyze dns-records.csv --risk-level critical
```

### 結果をファイルに保存

```bash
# 分析結果を運用フロー対応CSVファイルに保存
dnssweeper analyze dns-records.csv --output-file results.csv
```

## 🛠️ オプション

| オプション | 短縮形 | 説明 | デフォルト値 |
|-----------|--------|------|-------------|
| `--output` | `-o` | 出力形式 (table/json/csv) | `table` |
| `--verbose` | `-v` | 詳細な出力を表示 | `false` |
| `--english` | `-e` | 英語モードで実行 | `false` |
| `--provider` | - | DNSプロバイダーを指定 (自動検出も可能) | 自動検出 |
| `--risk-level` | `-r` | 指定リスクレベル以上のレコードのみ表示 | なし |
| `--output-file` | `-f` | 結果をファイルに保存 | なし |
| `--patterns` | `-p` | カスタムパターンファイルを指定 | なし |
| `--stream` | `-s` | ストリーミングモード（大規模ファイル用） | `false` |
| `--chunk-size` | - | ストリーミング時のチャンクサイズ | `1000` |
| `--memory-limit` | - | メモリ使用量制限（MB） | `100` |
| `--help` | `-h` | ヘルプメッセージを表示 | - |
| `--version` | `-V` | バージョンを表示 | - |

## 🎨 出力例

### テーブル形式（デフォルト）

```
🔍 DNSweeper CLI - DNS レコード分析ツール

📊 分析結果サマリー
総レコード数: 150
処理時間: 0.05秒

🎯 リスク分布:
🔴 Critical: 2件 (1.3%)
🟠 High: 8件 (5.3%)
🟡 Medium: 15件 (10.0%)
🟢 Low: 25件 (16.7%)
⚪ Safe: 100件 (66.7%)

📋 詳細分析結果
┌─────────────────────────────────────┬─────────┬─────────┬────────────┬─────────────────────────────────────┐
│ Name                                │ Type    │ Risk    │ Score      │ Reason                              │
├─────────────────────────────────────┼─────────┼─────────┼────────────┼─────────────────────────────────────┤
│ old-api.example.com                 │ A       │ 🔴 Critical │ 95        │ 危険なプレフィックス「old-」が検出   │
│ test-server.example.com             │ A       │ 🟠 High     │ 80        │ 危険なプレフィックス「test-」が検出  │
└─────────────────────────────────────┴─────────┴─────────┴────────────┴─────────────────────────────────────┘

✅ 実行完了: 0.05秒
```

## 🔧 対応するCSV形式

DNSweeper CLIは主要なDNSプロバイダーのCSV形式を自動認識します：

### Cloudflare

```csv
Name,Type,Content,TTL,Proxied,Created,Modified
example.com,A,192.168.1.1,300,false,2024-01-01,2024-01-01
www.example.com,CNAME,example.com,300,true,2024-01-01,2024-01-01
```

### AWS Route 53

```csv
Name,Type,Value,TTL,RoutingPolicy
example.com.,A,192.168.1.1,300,Simple
www.example.com.,CNAME,example.com,300,Simple
```

### Google Cloud DNS

```csv
dns_name,record_type,ttl,rrdatas
example.com.,A,300,"192.168.1.1"
www.example.com.,CNAME,300,"example.com."
```

### Azure DNS

```csv
Name,Type,TTL,Value
@,A,3600,192.168.1.1
www,CNAME,3600,example.com
```

### お名前.com

```csv
ホスト名,TYPE,VALUE,優先度,TTL
@,A,192.168.1.1,,3600
www,CNAME,example.com,,3600
```

### 必須フィールド

- `Name`: DNSレコード名
- `Type`: レコードタイプ（A、AAAA、CNAME、MX、TXT、SRV、PTR、NS）
- `Content`: レコードの値
- `TTL`: Time To Live

## 🗓️ 月次DNS棚卸しガイド

### 段階的ハイブリッド方式での運用フロー

#### Phase 1: 高リスクレコード抽出（5分）

```bash
# 1. 高リスクレコードを抽出（プロバイダーは自動検出）
dnssweeper analyze dns-export.csv --risk-level=high --output-file=monthly-audit.csv

# 2. 特定のプロバイダーを指定する場合
dnssweeper analyze route53-export.csv --provider route53 --risk-level=high --output-file=monthly-audit.csv

# 3. 結果確認  
echo "抽出完了: monthly-audit.csv"
```

#### Phase 2: DNS管理画面での確認（30分）

1. **monthly-audit.csv**を開く
2. 各レコードについてDNS管理画面で使用状況を確認：
   - **Analytics/トラフィック** → アクセス状況確認
   - **ログ/レポート** → 利用履歴確認  
   - **関連サービス** → 連携サービスでの利用確認
3. CSV の「使用状況確認」列に結果を記入：
   - `USED` - 使用されている
   - `UNUSED` - 使用されていない  
   - `UNCLEAR` - 判断不明

#### Phase 3: 削除判断と実行（30分）

1. 「削除判断」列に決定を記入：
   - `DELETE` - 削除対象
   - `KEEP` - 保持
   - `LATER` - 後で再確認
2. 削除対象レコードをDNS管理画面で削除
3. 「削除実行日」列に実行日を記入
4. 完了したCSVファイルを保存（監査証跡として）

### 効果測定

- **作業時間**: 従来の手動確認（2-3時間）→ 1時間に短縮
- **見落とし防止**: パターンベース自動検出で100%カバー
- **監査証跡**: CSVファイルで削除履歴を完全保持

## 🚀 大規模ファイル対応（ストリーミングモード）

### 100万件以上のDNSレコードを扱う場合

```bash
# ストリーミングモードで実行（メモリ効率的）
dnssweeper analyze large-dns-records.csv --stream

# メモリ使用量を制限（50MB以下）
dnssweeper analyze huge-dns-records.csv --stream --memory-limit 50

# チャンクサイズを調整（デフォルト: 1000）
dnssweeper analyze huge-dns-records.csv --stream --chunk-size 5000
```

### パフォーマンス比較

| レコード数 | 通常モード | ストリーミングモード |
|-----------|----------|-------------------|
| 10万件 | メモリ: 100MB<br>時間: 1.2秒 | メモリ: 15MB<br>時間: 1.4秒 |
| 100万件 | メモリ: 834MB<br>時間: 7.3秒 | メモリ: 21MB<br>時間: 5.1秒 |
| 1000万件 | メモリ不足エラー | メモリ: 25MB<br>時間: 52秒 |

### 推奨設定

- **10万件以下**: 通常モード（高速）
- **10万〜100万件**: ストリーミングモード
- **100万件以上**: ストリーミングモード + メモリ制限50MB

## 🧪 開発・テスト

### 開発環境のセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/your-username/dnssweeper-cli.git
cd dnssweeper-cli

# 依存関係をインストール
pnpm install  # または npm install

# 開発モードで実行
pnpm run dev -- analyze test-data/normal-records-50.csv  # または npm run dev
```

### テストの実行

```bash
# 全テストを実行
pnpm test  # または npm test

# テストカバレッジを確認
pnpm run test:coverage  # または npm run test:coverage

# 型チェック
pnpm run type-check  # または npm run type-check

# コードフォーマット
pnpm run format  # または npm run format

# Lint
pnpm run lint  # または npm run lint
```

## 🤝 貢献

プルリクエストや Issue の報告を歓迎します！

### 開発ガイドライン

1. すべてのコメントは日本語で記述してください
2. TypeScript の strict モードを使用してください
3. テストカバレッジは80%以上を維持してください
4. 読み取り専用操作のみを実装してください（削除・変更機能は禁止）

## 📄 ライセンス

[MIT License](LICENSE)

## 🚨 セキュリティ

このツールは**読み取り専用**です。DNSレコードの削除や変更は一切行いません。

- APIキーや認証情報の送信は行いません
- ローカルでのファイル解析のみを実行します
- 分析結果の外部送信は行いません

## 🆘 サポート

問題やバグを発見した場合は、[GitHub Issues](https://github.com/your-username/dnssweeper-cli/issues)に報告してください。

## 📝 更新履歴

### v1.0.0 (2025-07-10)
- 初回リリース
- 基本的な DNS レコード分析機能
- パターンマッチング機能
- 多言語対応（日本語・英語）
- 複数出力形式対応

---

💡 **ヒント**: 月次のDNS棚卸しに最適です！定期的に実行してDNSレコードをクリーンに保ちましょう。