---
name: dst
description: DNSweeper現在の状態確認（進捗・品質・TODO）
arguments:
  - name: detail
    description: 詳細表示レベル (summary/full)
    default: "summary"
---

**DNSweeperプロジェクトの現在状態を包括的に確認**

1. **基本情報：**
   - プロジェクトバージョン（package.json）
   - 現在のフェーズ（context.md）
   - 最終更新日時

2. **進捗状況：**
   - 完了フェーズ一覧
   - 現在進行中のフェーズ
   - 残りのフェーズ

3. **品質状態：**
   - テストカバレッジ
   - Lintエラー/警告数
   - TypeScriptエラー数
   - ビルド状態

{{#if (eq detail "full")}}
4. **詳細情報：**
   - 未解決のTODOコメント一覧
   - 最近の変更ファイル（git status）
   - 依存関係の状態
   - パフォーマンステスト結果
{{/if}}

5. **推奨アクション：**
   - 品質改善が必要な項目
   - 優先度の高いタスク
   - 次の論理的なステップ

**表示形式：**
```
🚀 DNSweeper v[バージョン] - [フェーズ名]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 進捗: [■■■■□□□□] 50%
✅ 品質: テスト[OK] Lint[OK] Build[OK]
📅 最終更新: [日時]
```