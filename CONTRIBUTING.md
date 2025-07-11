# 🤝 DNSweeper CLI 貢献ガイド

DNSweeper CLIへの貢献を検討いただき、ありがとうございます！

## 📋 目次

- [行動規範](#行動規範)
- [貢献の方法](#貢献の方法)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [開発ワークフロー](#開発ワークフロー)
- [コーディング規約](#コーディング規約)
- [テストの書き方](#テストの書き方)
- [プルリクエストのガイドライン](#プルリクエストのガイドライン)
- [Issue の報告方法](#issue-の報告方法)

## 行動規範

このプロジェクトに参加するすべての人は、お互いに敬意を持って接することが期待されています。

## 貢献の方法

### 1. バグ報告
- [Issue テンプレート](.github/ISSUE_TEMPLATE/bug_report.md)を使用してください
- 再現手順を明確に記載してください
- 環境情報（OS、Node.js バージョンなど）を含めてください

### 2. 機能提案
- [Feature Request テンプレート](.github/ISSUE_TEMPLATE/feature_request.md)を使用してください
- 提案の背景と動機を説明してください
- 可能であれば実装案も提示してください

### 3. コードの貢献
- まず Issue を作成し、実装方針について議論してください
- Fork してから作業を開始してください
- 小さく、焦点を絞った PR を心がけてください

## 開発環境のセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/Kazu-dnssweeper/dnsweeper-cli.git
cd dnsweeper-cli

# 依存関係をインストール
npm install

# ビルド
npm run build

# テスト実行
npm test
```

## 開発ワークフロー

### 1. ブランチ作成
```bash
# 機能追加の場合
git checkout -b feature/your-feature-name

# バグ修正の場合
git checkout -b fix/bug-description
```

### 2. 開発中の確認
```bash
# TypeScript の型チェック
npm run type-check

# ESLint の実行
npm run lint

# テストの実行
npm test

# ビルド
npm run build
```

### 3. コミット
```bash
# コミットメッセージは以下の形式で
git commit -m "type: 簡潔な説明"

# type の種類：
# feat: 新機能
# fix: バグ修正
# docs: ドキュメントのみの変更
# style: コードの意味に影響しない変更（フォーマットなど）
# refactor: バグ修正や機能追加を伴わないコードの変更
# test: テストの追加や修正
# chore: ビルドプロセスやツールの変更
```

## コーディング規約

### TypeScript
- **strict モード**を有効にしてください
- **any 型**の使用は最小限に
- 適切な**型定義**を行ってください

### コメント
- **すべてのコメントは日本語**で記載
- 複雑なロジックには説明を追加
- JSDoc コメントで関数の説明を記載

### 例
```typescript
/**
 * DNSレコードのリスクスコアを計算する
 * @param record - 分析対象のDNSレコード
 * @returns 0-100のリスクスコア
 */
export function calculateRiskScore(record: DNSRecord): number {
  // プレフィックスのリスクを評価
  const prefixRisk = evaluatePrefixRisk(record.name);
  
  // サフィックスのリスクを評価
  const suffixRisk = evaluateSuffixRisk(record.name);
  
  return Math.min(100, prefixRisk + suffixRisk);
}
```

## テストの書き方

### ファイル構成
- テストファイルは `*.test.ts` という名前にする
- ソースファイルと同じディレクトリに配置

### テストの例
```typescript
describe('calculateRiskScore', () => {
  it('高リスクなプレフィックスを正しく評価する', () => {
    const record: DNSRecord = {
      name: 'test.example.com',
      type: 'A',
      content: '192.168.1.1',
      ttl: 300
    };
    
    const score = calculateRiskScore(record);
    expect(score).toBeGreaterThanOrEqual(70);
  });
});
```

## プルリクエストのガイドライン

### PR を出す前に
1. **すべてのテストが通過**していることを確認
2. **ESLint エラーがない**ことを確認
3. **TypeScript の型エラーがない**ことを確認
4. **適切なテストを追加**している

### PR の説明
- [PR テンプレート](.github/PULL_REQUEST_TEMPLATE.md)を使用
- 変更内容を明確に説明
- 関連する Issue があればリンク
- スクリーンショットがあれば添付

### レビュープロセス
1. 自動テストが通過することを確認
2. コードレビューを受ける
3. フィードバックに対応
4. 承認後にマージ

## Issue の報告方法

### バグ報告の場合
1. 既存の Issue を検索して重複がないか確認
2. [バグ報告テンプレート](.github/ISSUE_TEMPLATE/bug_report.md)を使用
3. 再現可能な最小限のコードを提供
4. エラーログを含める

### 機能提案の場合
1. 既存の Issue や Discussion を確認
2. [機能提案テンプレート](.github/ISSUE_TEMPLATE/feature_request.md)を使用
3. ユースケースを明確に説明
4. 可能であれば実装案も提案

## 🎯 初めての貢献者へ

初めての貢献でも大歓迎です！以下から始めてみてください：

1. `good first issue` ラベルの付いた Issue を探す
2. ドキュメントの改善（誤字脱字の修正など）
3. テストの追加
4. エラーメッセージの改善

## 📞 質問・サポート

- **GitHub Discussions**: 一般的な質問や議論
- **Issue**: バグ報告や機能提案
- **Twitter**: @[作成予定]

## 🙏 謝辞

DNSweeper CLI に貢献していただき、ありがとうございます！
皆様の協力により、より良いツールを作ることができます。