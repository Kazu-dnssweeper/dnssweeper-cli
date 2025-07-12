# 🚀 /dza クイックリファレンス

## ✅ インストール完了状態

- **Hookスクリプト**: 5個インストール済み
- **設定ファイル**: 作成済み
- **ディレクトリ構造**: 準備完了

## 🔧 次のステップ

### 1. Claude Codeを再起動（必須）
```bash
# 現在のセッションを終了
exit  # または Ctrl+D

# 再起動
claude
```

### 2. 動作確認
```bash
# hookシステムが有効か確認
echo '#!/usr/bin/env node\nconsole.log("test")' > test.js
chmod +x test.js  # → 自動的に "node test.js" に変換される
```

## 📋 主要コマンド

### /dza - 自律モード起動
```bash
# 基本起動
/dza

# オプション付き起動
/dza --risk=low              # 低リスクモード
/dza --focus=testing         # テストに集中
/dza --duration=4h           # 4時間限定
```

### /dzq - 承認キュー管理
```bash
# キューを確認
/dzq

# 低リスクタスクのみ承認
/dzq --approve-low

# すべて承認
/dzq --approve-all
```

## 🎯 承認回避される主なコマンド

| 元のコマンド | 変換後 |
|------------|--------|
| `chmod +x script.js` | `node script.js` |
| `chmod +x script.sh` | `bash script.sh` |
| `chmod +x script.py` | `python3 script.py` |
| `npm install` | `npm ci` |
| `CI=true npm test` | `npm run test:ci` |

## 📊 ステータス表示の見方

```
🌅 /dza [09:30] ⚡ 📋3 🟢
```
- 🌅: 朝モード
- [09:30]: 現在時刻
- ⚡: タスク実行中
- 📋3: 承認待ち3件
- 🟢: 正常動作

## 🔍 ログファイル

```bash
# 承認待ちタスク
cat ~/.dza/logs/approval_queue.json

# フリーズしたタスク
cat ~/.dza/logs/frozen_tasks.log

# 現在の状態
cat ~/.dza/status/current_state.json
```

## ⚠️ トラブルシューティング

### hookが動作しない場合
1. Claude Code再起動を確認
2. `./scripts/test_dza_hooks.sh` でテスト
3. `~/.claude/settings.local.json` の存在確認

### 承認プロンプトが表示される場合
1. 初回は手動で「Yes, and don't ask again」を選択
2. 代替コマンドを `~/.dza/config/alternative_commands.json` に追加

## 💡 Tips

- 夜寝る前に `/dza` を起動すると朝まで開発継続
- 金曜日15時以降は週次処理モード
- `--risk=low` で安全な作業のみ実行