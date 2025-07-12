# Claude Code 無限自律進化システム

## クイックスタート

1. **セットアップ完了確認**
   ```bash
   ls -la .claude/
   ```

2. **システム起動**
   ```bash
   # 方法1: カスタムコマンド
   /infinite
   
   # 方法2: Pythonスクリプト
   python3 .claude/scripts/autonomous_loop.py
   
   # 方法3: バックグラウンド実行
   nohup python3 .claude/scripts/autonomous_loop.py > .claude/logs/system.log 2>&1 &
   ```

3. **状態確認**
   ```bash
   # 現在の状態
   python3 .claude/scripts/autonomous_loop.py --status
   
   # ログ確認
   tail -f .claude/logs/evolution_*.log
   
   # メトリクス確認
   cat .claude/memory/state.json | jq .
   ```

4. **停止方法**
   - フォアグラウンド実行時: `Ctrl+C`
   - バックグラウンド実行時: `pkill -f autonomous_loop.py`

## 🧬 自己進化機能

システムは10世代ごとに自動的に自己進化を実行します：

- **パフォーマンス分析**: 過去の実行データを分析
- **戦略最適化**: 成功した戦略を学習して改善
- **コード最適化**: システム自体の効率を向上
- **新機能追加**: 高パフォーマンス時に新機能を提案

### 自己進化の間隔を変更

```bash
# 5世代ごとに自己進化を実行
python3 .claude/scripts/autonomous_loop.py --evolution-interval 5
```

## ディレクトリ構造

```
.claude/
├── commands/       # カスタムコマンド
├── hooks/          # 自動化フック
├── memory/         # 学習データと状態
├── scripts/        # 実行スクリプト
├── logs/           # ログファイル
└── README.md       # このファイル
```

## トラブルシューティング

### システムが起動しない
```bash
# 権限を確認
chmod +x .claude/scripts/*.py
chmod +x .claude/scripts/*.sh
```

### リセットしたい場合
```bash
python3 .claude/scripts/autonomous_loop.py --reset
```

### パフォーマンスが低下した場合
1. ログを確認: `tail -100 .claude/logs/evolution_*.log`
2. 状態を確認: `cat .claude/memory/state.json`
3. 必要に応じてリセット

## 詳細ドキュメント

詳細な設定やカスタマイズについては、以下を参照：
- `.claude/commands/` - コマンドの追加方法
- `.claude/hooks.toml` - フックのカスタマイズ
- `.claude/scripts/autonomous_loop.py` - コアロジックの理解

## サポート

問題が発生した場合は、以下の情報と共に報告してください：
- `.claude/memory/state.json`の内容
- 最新のログファイル
- 実行環境の情報
