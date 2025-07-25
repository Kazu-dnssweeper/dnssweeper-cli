---
name: dim
description: DNSweeper実装フェーズ実行（コーディング＋単体テスト）
arguments:
  - name: task
    description: 実装するタスク名（省略時は計画から選択）
    default: ""
---

**実装フェーズ：コーディングと単体テスト**

1. **実装タスクの選択：**
   {{#if task}}
   - 指定タスク: {{task}}
   {{else}}
   - 実装計画から次のタスクを選択
   - 依存関係を考慮した優先順位
   {{/if}}

2. **実装前チェック：**
   - 関連コードの確認
   - 既存テストの実行
   - 開発環境の準備確認

3. **実装作業：**
   - コーディング規約の遵守
   - 日本語コメントの追加
   - エラーハンドリングの実装
   - TypeScript型定義の厳密化

4. **品質チェック：**
   - ユニットテストの作成
   - Lintチェック（自動修正）
   - TypeScriptコンパイル確認
   - カバレッジ確認

5. **実装完了処理：**
   - 実装内容のセルフレビュー
   - context.mdの更新
   - 次のタスクの準備

**チェックリスト：**
- [ ] 機能実装完了
- [ ] ユニットテスト作成
- [ ] 日本語コメント追加
- [ ] Lint/TypeScriptエラーなし
- [ ] 削除機能を含まないことを確認

**注意：**
- DNSレコードの削除機能は実装しない
- エラーゼロ原則の遵守