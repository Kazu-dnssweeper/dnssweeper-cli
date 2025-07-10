# 🤖 DNSweeper CLI 開発自動化ガイド

## 概要
DNSweeper CLIの開発フローを完全自動化しました。CIエラーの自動修正、npm公開の自動化、開発補助スクリプトなど、効率的な開発が可能です。

## 🚀 主要コマンド

### 1. `npm run status`
プロジェクトの現在の状態を確認します。
```bash
npm run status
```
表示内容：
- バージョン情報
- Git状態（ブランチ、未コミット変更）
- 必要ファイルの存在確認
- GitHub Actions実行状況
- npm公開状態
- テストカバレッジ

### 2. `npm run fix-ci`
CIエラーを自動検出・修正します。
```bash
npm run fix-ci
```
機能：
- 最新のGitHub Actions実行結果を取得
- エラーログを分析
- 一般的なエラーを自動修正
- 修正をコミット・プッシュ
- 成功するまで最大3回リトライ

### 3. `npm run release`
リリース作業を自動化します。
```bash
npm run release
```
手順：
1. テスト実行
2. ビルド
3. バージョン選択（patch/minor/major）
4. CHANGELOGメッセージ入力
5. タグ作成・プッシュ
6. GitHub Actionsが自動的にnpm公開

## 📋 Git Hooks

### pre-commit（既存）
- TypeScriptチェック
- ESLintチェック
- テスト実行（タイムアウトあり）

### pre-push（新規）
- 軽量なTypeScriptチェック
- 軽量なESLintチェック
- プッシュ前の最終確認

### post-push（新規）
- バックグラウンドでCI状態を監視
- 10秒後に結果を表示

### commit-msg（新規）
- コミットメッセージの規約チェック
- 形式: `type: message`
- type: feat, fix, docs, style, refactor, test, chore

## 🔄 GitHub Actions ワークフロー

### Test（test.yml）
- push/PR時に自動実行
- Node.js 18でテスト実行
- CI環境用の最適化済み

### CI（ci.yml）
- 品質チェック（TypeScript、ESLint、ビルド）
- セキュリティ監査
- ビルド成果物の動作確認

### Publish（publish.yml）
- タグプッシュ時に自動実行
- 手動実行も可能
- CHANGELOG自動生成
- npm公開（要NPM_TOKENシークレット）
- GitHubリリース作成

## 🔧 セットアップ

### 1. npm公開の準備
```bash
# npmアカウントでトークンを生成
npm login
npm token create --read-only=false

# GitHubリポジトリのSettings → Secrets → ActionsでNPM_TOKENを設定
```

### 2. GitHub CLIのセットアップ（オプション）
```bash
# インストール
gh auth login

# 認証
gh auth status
```

## 📝 典型的なワークフロー

### 機能開発
```bash
# 1. 開発
npm run dev

# 2. コミット（pre-commitフックが品質チェック）
git add .
git commit -m "feat: add new feature"

# 3. プッシュ（pre-pushフックが軽量チェック）
git push

# 4. CI失敗時は自動修正
npm run fix-ci

# 5. 状態確認
npm run status
```

### リリース
```bash
# 1. リリース準備
npm run release

# 2. バージョン選択とCHANGELOG入力
# 3. 自動的にタグ作成・プッシュ
# 4. GitHub Actionsがnpm公開を実行
```

## 🛠️ トラブルシューティング

### CIが失敗する場合
```bash
# 自動修正を試す
npm run fix-ci

# 手動で状態確認
npm run status

# ローカルでテスト実行
npm test -- --passWithNoTests
```

### Git Hooksをスキップしたい場合
```bash
# コミット時
git commit --no-verify -m "chore: skip hooks"

# プッシュ時
git push --no-verify
```

## 📌 注意事項

1. **npm公開にはNPM_TOKENの設定が必要**
2. **GitHub CLIは`fix-ci`コマンドで必要**
3. **WSL環境ではテストがタイムアウトする可能性あり**
4. **pre-commitフックは重いので、急ぐ場合は--no-verify**

これで開発フローが大幅に効率化されます！🎉