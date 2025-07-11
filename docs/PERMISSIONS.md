# DNSweeper 実行権限管理ガイド

## 概要
DNSweeperプロジェクトでは、開発効率とセキュリティのバランスを考慮した実行権限管理システムを導入しています。

## 自動化の仕組み

### 1. postinstallフック（推奨）
`pnpm install`実行時に自動的に実行権限が設定されます。
```bash
pnpm install
# → 自動的にscripts/setup-permissions.jsが実行される
```

### 2. 手動セットアップ
```bash
# 権限のみ設定
pnpm run setup:permissions

# 開発環境の完全セットアップ
pnpm run setup:dev
```

### 3. 手動修正（トラブルシューティング用）
```bash
# シェルスクリプトで修正
bash scripts/fix-permissions.sh

# または直接chmod
chmod +x scripts/*.js
```

## セキュリティ設計

### ホワイトリスト方式
`scripts/setup-permissions.js`の`EXECUTABLE_FILES`配列で明示的に指定されたファイルのみに実行権限を付与します。

```javascript
const EXECUTABLE_FILES = [
  'dist/index.js',              // ビルド済みCLI
  'scripts/release.js',         // リリーススクリプト
  'scripts/setup-permissions.js', // このスクリプト自身
  // ... 他の安全なスクリプト
];
```

### シバン行の検証
ファイルの最初の行をチェックし、適切なシバン行がある場合のみ実行可能と判断します。
- Node.js: `#!/usr/bin/env node`
- Shell: `#!/bin/bash` または `#!/bin/sh`

### 自動検出と提案
ホワイトリストにないが実行可能であるべきファイルを検出し、追加を提案します。

## 新しいスクリプトの追加方法

1. **スクリプトを作成**
   ```javascript
   #!/usr/bin/env node
   // 新しいスクリプトの内容
   ```

2. **ホワイトリストに追加**
   `scripts/setup-permissions.js`の`EXECUTABLE_FILES`配列に追加：
   ```javascript
   const EXECUTABLE_FILES = [
     // ... 既存のファイル
     'scripts/your-new-script.js',  // 追加
   ];
   ```

3. **権限を適用**
   ```bash
   pnpm run setup:permissions
   ```

## Git設定

### 実行権限をGitで管理
```bash
# ファイルモードを有効化（推奨）
git config core.filemode true

# 個別ファイルの権限をGitに記録
git update-index --chmod=+x scripts/your-script.js
```

### Windows環境での注意
- Windowsでは`chmod`コマンドが使えないため、スクリプトは自動的にスキップされます
- WSL環境では正常に動作します
- Git Bashでも基本的な動作は可能です

## トラブルシューティング

### 権限が付与されない場合
1. ファイルが存在するか確認
2. `node_modules`が正しくインストールされているか確認
3. Git設定を確認: `git config core.filemode`

### 実行時にpermission deniedエラー
```bash
# 即座に修正
chmod +x scripts/問題のファイル.js

# または自動修正
pnpm run setup:permissions
```

### postinstallが失敗する場合
```bash
# postinstallをスキップしてインストール
pnpm install --ignore-scripts

# 後で手動実行
pnpm run setup:permissions
```

## ベストプラクティス

1. **新しいスクリプトには必ずシバン行を追加**
2. **実行可能ファイルはホワイトリストで管理**
3. **定期的に`setup:permissions`を実行**
4. **CIでも権限チェックを実施**

## セキュリティ考慮事項

- ホワイトリスト方式により、意図しないファイルへの実行権限付与を防止
- `node_modules`と`.git`ディレクトリは自動的に除外
- エラーハンドリングにより、権限設定の失敗を適切に処理
- Gitでの権限管理により、チーム全体で一貫性を保持