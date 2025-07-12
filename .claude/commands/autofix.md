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
- **繰り返し処理**: エラーが解消されるまで最大10回繰り返し

## 処理フロー
1. ESLint実行 → エラー検出
2. エラーをパースして構造化
3. ルールごとに自動修正適用
4. 修正をGitコミット・プッシュ
5. 1-4を繰り返し（最大10回）
6. エラーゼロまたはテスト通過で完了

## 出力例
```
🤖 自動エラー修正ループ開始...

--- 反復 1/10 ---
📋 ESLintチェック実行中...
🔍 6個のエラーを検出:
  - /path/to/file.js:89 no-useless-escape - Unnecessary escape character
  - /path/to/file.js:122 no-console - Unexpected console statement
🔧 自動修正中...
✨ 6/6個のエラーを修正
📝 修正をコミット・プッシュしました

--- 反復 2/10 ---
📋 ESLintチェック実行中...
✅ ESLintエラーなし！
🧪 テスト実行中...
✅ 全てのテストが通過！修正完了です！

🎉 自動修正が完了しました！
```

## 対応エラールール
- `no-useless-escape`: エスケープ文字の修正
- `no-console`: eslint-disable コメント追加
- `no-control-regex`: eslint-disable コメント追加
- その他: 基本的なパターンマッチング修正

## 注意事項
- 最大10回の反復制限あり
- 自動修正できないエラーは手動対応が必要
- Git操作が含まれるため、重要な変更前はバックアップ推奨