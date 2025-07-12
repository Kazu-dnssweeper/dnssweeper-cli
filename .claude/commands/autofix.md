# /autofix - 自動エラー修正ループ

## 概要
GitHub Actions や ESLint エラーを自動検出して修正し、治るまで繰り返すコマンド

## 使用方法
```bash
# 自動修正ループを開始
python3 .claude/scripts/auto_fix_loop.py

# または省略形
/autofix
```

## 機能
- **ESLint エラー自動検出**: lint 出力をパースしてエラー箇所を特定
- **自動修正**: よくあるESLintエラーを自動修正
  - `no-useless-escape`: 不要なエスケープ文字を削除
  - `no-console`: eslint-disable-next-line コメントを追加
  - `no-control-regex`: eslint-disable-next-line コメントを追加
- **自動コミット**: 修正内容を自動的にGitにコミット・プッシュ
- **テスト実行**: 修正後にテストを実行して動作確認
- **GitHub Actions 監視**: CI/CDパイプラインの自動監視・エラー修正
  - 依存関係の問題を自動修正
  - テスト設定の問題を自動修正（Vitest/Jest互換性）
  - ビルド設定の問題を自動修正（TypeScript設定）
- **繰り返し処理**: エラーが解消されるまで最大10回繰り返し

## 処理フロー
1. ESLint実行 → エラー検出
2. エラーをパースして構造化
3. ルールごとに自動修正適用
4. 修正をGitコミット・プッシュ
5. GitHub Actions実行待機・監視
6. GitHub Actionsエラーを検出・修正
7. 1-6を繰り返し（最大10回）
8. エラーゼロ＆GitHub Actions成功で完了

## 出力例
```
🤖 完全自動エラー修正ループ開始...

--- 反復 1/10 ---
📋 ESLintチェック実行中...
🔍 6個のESLintエラーを検出:
  - /path/to/file.js:89 no-useless-escape - Unnecessary escape character
  - /path/to/file.js:122 no-console - Unexpected console statement
🔧 ESLintエラー自動修正中...
✨ 6/6個のESLintエラーを修正
📝 修正をコミット・プッシュしました

--- 反復 2/10 ---
📋 ESLintチェック実行中...
✅ ESLintエラーなし！
🧪 テスト実行中...
✅ 全てのテストが通過！
🚀 GitHub Actions監視開始...
⏰ GitHub Actions実行開始まで30秒待機...
🔍 GitHub Actions状態監視開始...
⏳ GitHub Actions実行中... (1分経過)
❌ GitHub Actions失敗: failure
📄 GitHub Actionsログを取得中...
🔍 GitHub Actionsエラーを解析中...
🔧 2個のGitHub Actionsエラーを修正中...
🔧 依存関係の問題を修正中...
✨ 2/2個のGitHub Actionsエラーを修正
📝 GitHub Actions修正をコミット・プッシュしました

--- 反復 3/10 ---
📋 ESLintチェック実行中...
✅ ESLintエラーなし！
🧪 テスト実行中...
✅ 全てのテストが通過！
🚀 GitHub Actions監視開始...
⏰ GitHub Actions実行開始まで30秒待機...
🔍 GitHub Actions状態監視開始...
⏳ GitHub Actions実行中... (2分経過)
✅ GitHub Actions成功！
🎉 GitHub Actionsも成功！完全修正完了です！
```

## 対応エラールール

### ESLint エラー
- `no-useless-escape`: エスケープ文字の修正
- `no-console`: eslint-disable コメント追加
- `no-control-regex`: eslint-disable コメント追加
- その他: 基本的なパターンマッチング修正

### GitHub Actions エラー
- **依存関係エラー**: pnpm install の自動実行
- **テスト設定エラー**: Vitest/Jest互換性の修正
- **ビルド設定エラー**: TypeScript設定の修正
- **CI設定エラー**: package.json, tsconfig.json の自動修正

## 注意事項
- 最大10回の反復制限あり
- GitHub Actions監視は最大15分でタイムアウト
- 自動修正できないエラーは手動対応が必要
- Git操作が含まれるため、重要な変更前はバックアップ推奨
- GitHub CLI (`gh`) が必要（GitHub Actions機能使用時）