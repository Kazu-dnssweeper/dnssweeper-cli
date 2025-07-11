---
title: 未使用DNSレコードを自動検出！「DNSweeper CLI」を作りました
tags: dns cloudflare typescript cli npm
private: false
---

# 🔍 DNSweeper CLI - 未使用DNSレコードを自動検出するツール

## はじめに

長年運用しているDNSには、もう使われていないレコードが蓄積されがちです。
「test」「old」「temp」などの名前が付いたレコード、見覚えありませんか？

そんな課題を解決するため、**DNSweeper CLI**というツールを作りました！

## 🎯 DNSweeper CLIとは？

CloudflareなどのDNSサービスからエクスポートしたCSVファイルを分析し、未使用の可能性が高いレコードを自動検出するCLIツールです。

### 主な特徴

- 📊 **パターンマッチング分析**: 危険なプレフィックス・サフィックスを検出
- 🎨 **色付き出力**: リスクレベル別に見やすく表示
- 🌐 **日本語対応**: 日本語・英語の両方に対応
- 🔒 **安全**: 読み取り専用（レコードの削除・変更は行わない）

## 🚀 インストール

```bash
npm install -g dnsweeper-cli
```

または、インストールせずに実行：

```bash
npx dnsweeper-cli analyze your-dns-records.csv
```

## 📋 使い方

### 基本的な使い方

```bash
dnsweeper analyze cloudflare-export.csv
```

実行すると、こんな感じで結果が表示されます：

```
🔍 DNSweeper CLI - DNS レコード分析ツール
分析対象: cloudflare-export.csv
出力形式: table

📊 分析結果サマリー
==================================================
総レコード数: 150
処理時間: 0.12秒

🎯 リスク分布:
  🔴 クリティカル: 8 (5%)
  🟠 高リスク: 15 (10%)
  🟡 中リスク: 23 (15%)
  🔵 低リスク: 30 (20%)
  🟢 安全: 74 (50%)

⚠️  削除検討対象: 23件

📋 詳細分析結果
================================================================================
No   リスク         スコア  レコード名                    タイプ
--------------------------------------------------------------------------------
1    🔴クリティカル   95    test-old.example.com         A
2    🔴クリティカル   90    backup2019.example.com       A
3    🟠高リスク       85    dev-server.example.com       A
...
```

### 便利なオプション

#### 1. 高リスクレコードのみ表示

```bash
dnsweeper analyze records.csv --risk-level high
```

#### 2. CSV形式で出力（運用フロー用）

```bash
dnsweeper analyze records.csv --output csv --output-file high-risk.csv
```

#### 3. 英語で出力

```bash
dnsweeper analyze records.csv --english
```

## 🎯 検出パターン

DNSweeperは以下のようなパターンを検出します：

### 危険なプレフィックス（例）
- `test-`, `dev-`, `old-`, `backup-`, `temp-`
- `staging-`, `demo-`, `tmp-`

### 危険なサフィックス（例）
- `-old`, `-test`, `-bak`, `-backup`
- `-dev`, `-staging`, `-temp`

### 危険なキーワード（例）
- 年号を含むもの（2019, 2020など）
- 「削除予定」「不要」などのコメント

## 📊 リスクレベル

| レベル | スコア | 説明 | アクション |
|--------|--------|------|-----------|
| 🔴 Critical | 90-100 | 明らかに不要 | 即座に削除検討 |
| 🟠 High | 70-89 | おそらく不要 | 確認後削除 |
| 🟡 Medium | 50-69 | 要確認 | 使用状況を調査 |
| 🔵 Low | 30-49 | 注意 | 定期的に確認 |
| 🟢 Safe | 0-29 | 問題なし | そのまま維持 |

## 💡 実践的な使い方

### 月次DNS棚卸しフロー

1. **CSVエクスポート**（5分）
   ```bash
   # Cloudflareからエクスポート
   ```

2. **分析実行**（30秒）
   ```bash
   dnsweeper analyze dns-export.csv --risk-level high --output-file review.csv
   ```

3. **レビュー**（30分）
   - review.csvを確認
   - 各レコードの使用状況を調査
   - 削除対象をマーク

4. **実行**（30分）
   - マークしたレコードを削除
   - 変更履歴を記録

## 🛠 技術的な詳細

### 使用技術
- TypeScript
- Node.js
- Commander.js（CLI フレームワーク）
- Chalk（色付き出力）

### パフォーマンス
- 1万レコード: 約1秒
- 10万レコード: 約10秒
- メモリ効率的な処理

## 🤝 コントリビューション

バグ報告や機能提案は大歓迎です！

- GitHub: https://github.com/Kazu-dnssweeper/dnsweeper-cli
- npm: https://www.npmjs.com/package/dnsweeper-cli

### 貢献方法
1. Issue を作成
2. Fork & Clone
3. 機能実装
4. Pull Request

## 🎯 今後の予定

- v0.2.0: 進捗表示の追加
- v0.3.0: 複数ファイル対応
- v0.4.0: カスタムパターン設定

## まとめ

DNSweeper CLIを使えば、肥大化したDNSレコードを効率的に整理できます。
ぜひ一度お試しください！

```bash
# 今すぐ試す
npx dnsweeper-cli analyze your-dns-records.csv
```

フィードバックお待ちしています！🚀

---

### 関連リンク
- [GitHub リポジトリ](https://github.com/Kazu-dnssweeper/dnsweeper-cli)
- [npm パッケージ](https://www.npmjs.com/package/dnsweeper-cli)
- [Issue・要望](https://github.com/Kazu-dnssweeper/dnsweeper-cli/issues)