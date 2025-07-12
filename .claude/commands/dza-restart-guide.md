# 🔄 Claude Code 再起動ガイド

Claude Codeの再起動が必要になる場面と、正しい手順を案内します。

## 📋 再起動が必要な場合

### ✅ 必須再起動
- hook設定の初回インストール（`scripts/install_dza_hooks.sh` 実行後）
- `.claude/settings.local.json` の変更・追加
- 新しいカスタムコマンドの追加（`.claude/commands/*.md`）
- Claude Code本体のアップデート後

### ❌ 再起動不要
- hookスクリプトの内容変更（`scripts/claude-hooks/*.sh`）
- `.dza/config.yml` の設定変更
- 既存コマンドファイルの内容修正

## 🔄 正しい再起動手順

### ステップ1: 完全終了
```bash
# 方法A: キーボードショートカット
Ctrl + C

# 方法B: ウィンドウ操作
右上の ×ボタン をクリック

# 方法C: プロセス終了（緊急時）
ps aux | grep claude
kill <プロセスID>
```

### ステップ2: 再起動
```bash
# ターミナル・コマンドプロンプトで実行
claude

# または具体的なパス指定
claude code

# または npm経由（開発環境の場合）
npx @anthropic/claude-code
```

### ステップ3: 動作確認
```bash
# DZA hook動作確認
/dza --test

# 基本動作確認
/dns-status

# 設定確認
claude --settings
```

## 🚨 トラブルシューティング

### 問題1: hookが動作しない
```bash
# 原因チェック
ls -la ~/.claude/settings.local.json
ls -la ~/.claude/hooks/

# 解決策
scripts/install_dza_hooks.sh
# → 再起動
```

### 問題2: カスタムコマンドが認識されない
```bash
# 原因チェック
ls -la .claude/commands/

# 解決策: Claude Code再起動
# 新しい *.md ファイルは再起動後に認識
```

### 問題3: 設定が反映されない
```bash
# 設定ファイル確認
cat ~/.claude/settings.local.json

# 再起動確認
ps aux | grep claude  # プロセスが完全に終了しているか確認
```

## 📱 クイック確認

### 再起動完了の確認方法
```bash
# 1. hookが動作するか
/dza

# 2. カスタムコマンドが認識されるか
/dns-help

# 3. 設定が読み込まれているか
claude --version
```

### 正常動作のサイン
- ✅ `/dza` でDNSweeper自律モードが起動
- ✅ カスタムコマンドが補完候補に表示
- ✅ hook設定エラーが表示されない

## 💡 効率的な開発フロー

### 開発中の推奨手順
1. **設定変更は一度にまとめる**（再起動回数を最小化）
2. **スクリプト修正は再起動不要**（即座に反映）
3. **定期的な動作確認**（`/dza --test`）

### 緊急時の復旧手順
```bash
# 1. 設定初期化
rm ~/.claude/settings.local.json
rm -rf ~/.claude/hooks/

# 2. 再インストール
scripts/install_dza_hooks.sh

# 3. 再起動
claude
```

---

**🎯 このガイドで解決しない場合**
- GitHub Issues: プロジェクトのIssuesに報告
- ログ確認: `~/.claude/logs/` の内容を確認
- 開発チーム連絡: 技術的な問題の相談

**🚀 再起動が完了したら**
`/dza` でDNSweeper自律モードを開始して、AIによる24時間自動開発を体験してください！