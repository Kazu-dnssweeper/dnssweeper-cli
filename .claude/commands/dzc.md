---
name: dzc
description: Claude Code統合オーケストレーター - 画面を見ながら実行
---

# Claude Code統合オーケストレーター

プロジェクト状態を分析し、最適なタスクを生成してClaude Codeで実行します。

```bash
#!/bin/bash

echo "🤖 Claude Code統合オーケストレーターを起動します"
echo ""
echo "このモードでは:"
echo "  1. プロジェクト状態を分析"
echo "  2. 最適なタスクを自動生成"
echo "  3. Claude Code用プロンプトを表示"
echo "  4. 実行確認後、次のタスクへ"
echo ""

# Claude Code統合オーケストレーターを起動
python3 /home/hikit/.dza/orchestration/claude_code_orchestrator.py
```

## 特徴

- **インタラクティブ実行**: 各タスクで確認を求める
- **Claude Codeプロンプト生成**: コピペで使えるプロンプト
- **自動タスク選択**: エラー修正 > ロードマップ > 改善の優先順位
- **画面確認型**: ユーザーが結果を見ながら進められる

## 使い方

1. `/dzc`を実行
2. 生成されたプロンプトを確認
3. Enterで実行、sでスキップ、qで終了
4. Claude Codeで実際に実行（将来的に自動化）