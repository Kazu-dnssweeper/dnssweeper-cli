# DNSweeper セキュリティ管理システム

## 🔐 chmod権限管理システム

DNSweeperプロジェクト専用の権限管理システムです。TypeScript/Node.jsプロジェクトに最適化されたセキュリティポリシーで、開発効率とセキュリティを両立します。

### ✨ 特徴

- **自動監視**: すべてのchmodコマンドを監視・記録
- **カテゴリ別管理**: ソースコード、テスト、設定ファイルなどを自動分類
- **推奨権限**: ファイルタイプに応じた適切な権限を提案
- **自動復元**: 作業後に安全な権限に戻す
- **セキュリティ監査**: 重要ファイルの権限を定期チェック

### 📁 ファイル構成

```
scripts/security/
├── chmod_guardian/
│   ├── setup.sh              # セットアップスクリプト
│   ├── hooks/
│   │   ├── chmod_guardian.py    # chmod監視（PreToolUse）
│   │   ├── chmod_restorer.py    # 権限復元ツール
│   │   ├── permission_tracker.py # 変更追跡（PostToolUse）
│   │   └── security_monitor.py   # セキュリティ監視
│   ├── policies/
│   │   └── dnsweeper_policy.json # DNSweeper専用ポリシー
│   └── claude_settings_example.json # Claude Code設定例
└── README.md                 # このファイル
```

### 🚀 セットアップ

#### 1. 初期セットアップ

```bash
# DNSweeperプロジェクトのルートで実行
bash scripts/security/chmod_guardian/setup.sh
```

#### 2. Claude Code設定（オプション）

自動監視を有効にする場合：

```bash
# 設定例をコピー
cp scripts/security/chmod_guardian/claude_settings_example.json ~/.claude/settings.local.json

# パスを自分の環境に合わせて編集
# /path/to/dnssweeper を実際のパスに変更
```

#### 3. 実行権限の付与

```bash
chmod +x scripts/security/chmod_guardian/hooks/*.py
```

### 📖 使い方

#### 基本的な使用方法

通常通りchmodを使用すると、自動的に監視されます：

```bash
chmod +x script.sh
chmod 644 src/*.ts
```

#### 権限の復元

```bash
# 最近の変更を復元（デフォルト：過去1時間）
python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py

# 過去24時間の変更をすべて復元
python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py --hours 24

# ドライラン（確認のみ）
python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py --dry-run

# 特定カテゴリのみ復元
python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py --category source_code
```

#### セキュリティ監査

```bash
# 権限監査を実行
python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py --audit

# セキュリティステータス確認
python3 scripts/security/chmod_guardian/hooks/security_monitor.py check

# 詳細レポート生成
python3 scripts/security/chmod_guardian/hooks/security_monitor.py report
```

### 🛡️ セキュリティポリシー

DNSweeperプロジェクトの推奨権限：

| ファイルタイプ | 推奨権限 | 説明 |
|--------------|---------|------|
| TypeScript/JavaScript (.ts/.js) | 644 | 読み取り専用 |
| テストファイル (.test.ts) | 644 | 読み取り専用 |
| 設定ファイル (.json/.yaml) | 644 | 読み取り専用 |
| シェルスクリプト (.sh) | 755 | 実行可能 |
| Pythonスクリプト (.py) | 755 | 実行可能 |
| 環境変数 (.env.*) | 400 | 所有者のみ読み取り |
| ビルド成果物 (dist/) | 444 | 変更防止 |
| ディレクトリ | 755 | 標準アクセス |

### ⚠️ セキュリティ警告

以下の場合、警告が表示されます：

- 🚨 **777, 666**: 誰でも書き込み可能（危険）
- ⚠️ **環境変数ファイル > 400**: 機密情報の露出リスク
- ⚡ **ソースコードに実行権限**: 不要な権限

### 🤖 自動化

Claude Codeと統合することで、以下が自動化されます：

1. **chmod監視**: すべてのchmodコマンドを自動記録
2. **変更追跡**: 実行後の権限変更を追跡
3. **セッション終了時**: セキュリティステータスを表示

### 💡 ベストプラクティス

1. **定期的な監査**: 週1回は権限監査を実行
2. **作業後の復元**: chmod使用後は必ず権限を復元
3. **環境変数の保護**: .envファイルは必ず400に設定
4. **ビルド成果物の保護**: dist/は444で変更を防止

### 🔧 トラブルシューティング

#### 権限復元が失敗する場合

```bash
# 強制復元モードで実行
python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py --force

# すべてのカテゴリを一括復元
python3 scripts/security/chmod_guardian/hooks/chmod_restorer.py --hours 24 --force
```

#### 監視が機能しない場合

1. スクリプトの実行権限を確認
2. ~/.dza ディレクトリが存在するか確認
3. Python 3.6以上がインストールされているか確認

### 📊 統計情報の確認

```bash
# chmod履歴の場所
~/.dza/security/chmod_history.json

# セキュリティステータス
~/.dza/status/security_status.json

# 復元履歴
~/.dza/security/restore_history.json
```

### 🚨 緊急時の対応

すべての権限を安全な状態に戻す：

```bash
# DNSweeperプロジェクトルートで実行
find . -type f -name "*.ts" -o -name "*.js" | xargs chmod 644
find . -type f -name "*.sh" -o -name "*.py" | xargs chmod 755
find . -type f -name ".env*" | xargs chmod 400
find . -type d | xargs chmod 755
```

---

このシステムにより、DNSweeperプロジェクトのセキュリティを保ちながら、効率的な開発が可能になります。