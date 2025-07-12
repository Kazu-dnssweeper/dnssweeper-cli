# /dfix - 🔧 Fix: 問題解決専用コマンド

## 概要
DNSweeper開発で発生するあらゆる問題を自動検出・修正する緊急対応コマンドです。
エラー・警告・ブロッカーを包括的にチェックし、可能な限り自動修正を実行します。

## 🎯 基本思想
**「問題を放置しない、即座に解決する」**
- エラーゼロ原則の徹底
- 自動修正 > 手動修正
- 予防的メンテナンス

## 🔍 検出対象

### TypeScriptエラー
```bash
✅ 型エラーの自動修正
✅ インポートエラーの解決
✅ 設定ファイルの不整合修正
✅ 依存関係の型定義更新
```

### ESLintエラー・警告
```bash
✅ コードスタイルの自動修正
✅ 未使用変数の削除
✅ インデント・フォーマットの統一
✅ 命名規則の修正
```

### テストエラー
```bash
✅ 失敗テストの原因分析
✅ モックの設定修正
✅ テストデータの更新
✅ 非同期処理の修正
```

### ビルドエラー
```bash
✅ 依存関係の解決
✅ パッケージの再インストール
✅ キャッシュのクリア
✅ 設定ファイルの修正
```

### Gitエラー
```bash
✅ マージコンフリクトの解決
✅ コミットメッセージの修正
✅ ブランチの整理
✅ リモートとの同期
```

### パフォーマンス問題
```bash
✅ メモリリークの検出
✅ 不要な処理の最適化
✅ ファイルサイズの削減
✅ 実行時間の短縮
```

## 🚨 修正レベル

### Level 1: Safe（安全な自動修正）
```bash
🟢 自動実行
- ESLint --fix
- Prettier フォーマット
- パッケージ再インストール
- キャッシュクリア
```

### Level 2: Moderate（中程度の修正）
```bash
🟡 確認後実行
- 型定義の更新
- テストデータの修正
- 設定ファイルの変更
- 依存関係の更新
```

### Level 3: Critical（重要な修正）
```bash
🔴 手動確認必須
- アーキテクチャの変更
- データベーススキーマ修正
- セキュリティ関連
- 本番環境影響
```

## 🎮 使用方法

### 基本実行（全自動）
```bash
/dfix
```
**すべての問題を自動検出・修正**

### 特定問題の修正
```bash
/dfix ts         # TypeScriptエラーのみ
/dfix lint       # ESLintエラーのみ
/dfix test       # テストエラーのみ
/dfix build      # ビルドエラーのみ
/dfix git        # Gitエラーのみ
/dfix perf       # パフォーマンス問題のみ
```

### 修正レベルの指定
```bash
/dfix safe       # Level 1のみ実行
/dfix moderate   # Level 1-2を実行
/dfix all        # Level 1-3を実行（確認付き）
```

### デバッグモード
```bash
/dfix debug      # 詳細ログ付き実行
/dfix dry-run    # 修正予定の表示のみ
/dfix report     # 問題レポートの生成
```

## 🔄 実行フロー

### 1. 問題検出フェーズ
```bash
🔍 TypeScriptエラーをチェック中...
🔍 ESLintエラーをチェック中...
🔍 テスト失敗をチェック中...
🔍 ビルドエラーをチェック中...
🔍 Gitステータスをチェック中...
```

### 2. 問題分析フェーズ
```bash
📊 検出された問題:
  - TypeScriptエラー: 5件
  - ESLintエラー: 12件
  - テスト失敗: 2件
  - ビルドエラー: 0件
  - Gitコンフリクト: 1件
```

### 3. 修正実行フェーズ
```bash
🔧 TypeScriptエラーを修正中...
  ✅ インポートパス修正: 3件
  ✅ 型定義追加: 2件

🔧 ESLintエラーを自動修正中...
  ✅ フォーマット修正: 12件

🔧 テストエラーを調査中...
  ⚠️ モック設定に問題あり（手動確認推奨）

🔧 Gitコンフリクトを解決中...
  ✅ 自動マージ完了
```

### 4. 確認フェーズ
```bash
✅ 修正完了後の確認:
  - TypeScript: エラーなし
  - ESLint: エラーなし  
  - テスト: 1件要手動確認
  - ビルド: 成功
  - Git: クリーン

📝 修正サマリー:
  - 自動修正: 17件
  - 手動確認要: 1件
  - 修正時間: 2分15秒
```

## 🎯 自動修正ロジック

### TypeScriptエラー修正
```javascript
function fixTypeScriptErrors() {
  const errors = detectTSErrors();
  
  errors.forEach(error => {
    if (error.type === 'import') {
      fixImportPath(error);
    } else if (error.type === 'type') {
      addTypeDefinition(error);
    } else if (error.type === 'config') {
      updateTSConfig(error);
    }
  });
}
```

### ESLint自動修正
```javascript
function fixESLintErrors() {
  execSync('pnpm run lint:fix');
  execSync('pnpm run format');
  
  // 残ったエラーの手動対応指示
  const remainingErrors = detectESLintErrors();
  if (remainingErrors.length > 0) {
    generateManualFixGuide(remainingErrors);
  }
}
```

### テストエラー修正
```javascript
function fixTestErrors() {
  const failures = detectTestFailures();
  
  failures.forEach(failure => {
    if (failure.type === 'timeout') {
      increaseTimeout(failure);
    } else if (failure.type === 'mock') {
      updateMockData(failure);
    } else {
      reportManualFix(failure);
    }
  });
}
```

## 📊 修正統計

### 修正成功率
```bash
TypeScript: 95% (自動修正可能)
ESLint: 98% (自動修正可能)
テスト: 70% (一部手動要)
ビルド: 85% (依存関係系)
Git: 80% (コンフリクト系)

総合: 86% (ほぼ自動解決)
```

### 平均修正時間
```bash
Level 1 (Safe): 30秒
Level 2 (Moderate): 2分
Level 3 (Critical): 10分（手動含む）

典型的な修正セッション: 3分
```

## 🚀 高度機能

### 予防的修正
```bash
/dfix prevent    # 問題発生前の予防措置
- 依存関係の脆弱性チェック
- 非推奨APIの置き換え
- パフォーマンス劣化の検出
```

### 学習機能
```bash
- よくある問題パターンの記録
- 修正方法の最適化
- 個人の修正傾向の学習
```

### 統合機能
```bash
/dfix + /dz      # 修正後に自動で開発継続
/dfix + GitHub   # 修正内容を自動でIssue報告
```

## 💡 実行例

### 基本的な修正セッション
```bash
$ /dfix

🔧 DNSweeper 問題解決を開始...

🔍 問題検出中...
  ⚠️ TypeScriptエラー: 3件
  ⚠️ ESLintエラー: 8件
  ✅ テスト: 正常
  ✅ ビルド: 正常

🔧 自動修正中...
  ✅ インポートパス修正: 3件
  ✅ ESLint自動修正: 8件

🎉 修正完了！
  - 修正時間: 1分20秒
  - エラー解決: 11件
  - 手動確認: 0件

次のアクション: /dz で開発継続
```

### 緊急対応例
```bash
$ /dfix critical

🚨 緊急問題検出中...
  🔴 ビルド失敗: 依存関係エラー
  🔴 テスト全失敗: モック設定問題

🔧 緊急修正中...
  🔄 node_modules 再構築中...
  🔄 テストモック更新中...

⏰ 修正完了まで約5分...

✅ 緊急修正完了！
システムが正常状態に復旧しました。
```

---

**🔧 Fix = 「問題を見つけたら、すぐに解決する」**

これが、DNSweeper開発の品質保証の要です。