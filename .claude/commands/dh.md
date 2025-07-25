---
name: dh
description: DNSweeperカスタムコマンド一覧表示
arguments: []
---

**DNSweeper Claude Codeカスタムコマンド一覧**

## 🎯 基本コマンド（毎日使う）

| 通常版 | 短縮版 | 説明 | 使用例 |
|--------|--------|------|--------|
| `/dns-start` | `/ds` | 🌅 作業開始（全ファイル読み込み） | `/ds` |
| `/dns-auto` | `/da` | ⚡ 全自動実行（調査→計画→実装→テスト） | `/da メモリ削減` |
| `/dns-update` | `/du` | 📝 進捗更新（context.md更新） | `/du バグ修正完了` |
| `/dns-finish` | `/df` | 🌙 作業終了（総合更新） | `/df` |
| `/dns-status` | `/dst` | 📊 状態確認（進捗・品質） | `/dst` |
| `/dns-help` | `/dh` | 📚 このヘルプを表示 | `/dh` |

## 🔧 フェーズ別コマンド

| 通常版 | 短縮版 | 説明 | 使用例 |
|--------|--------|------|--------|
| `/dns-investigate` | `/di` | 🔍 調査フェーズ | `/di 日本語ドメイン対応` |
| `/dns-plan` | `/dp` | 📋 計画フェーズ | `/dp CSVパーサー改善` |
| `/dns-implement` | `/dim` | ⚙️ 実装フェーズ | `/dim パーサー最適化` |
| `/dns-test` | `/dt` | 🧪 テストフェーズ | `/dt all` |

## 🔄 PDCAサイクルコマンド（継続的改善）

| 通常版 | 短縮版 | 説明 | 実行時間 |
|--------|--------|------|----------|
| `/dns-pdca-weekly` | `/dpw` | 📊 週次改善サイクル（金曜推奨） | 15分 |
| `/dns-pdca-daily` | `/dpd` | ✅ 日次チェック（毎日実行） | 5分 |
| `/dns-pdca-release` | `/dpr` | 🚀 リリース前後チェック | 10分 |
| `/dns-pdca-alert` | `/dpa` | 🚨 緊急対応（インシデント時） | 30分 |
| `/dns-pdca-metrics` | `/dpm` | 📈 詳細メトリクス分析 | 20分 |
| `/dns-pdca-experiment` | `/dpe` | 🧪 実験的改善の検証 | 1-2週間 |
| `/dns-pdca-auto-enable` | `/dpae` | 🤖 PDCA自動化設定 | 30分 |
| `/dns-pdca-claude-settings` | `/dpcs` | ⚙️ Claude品質モード設定 | - |

## 💡 使い方のコツ

### 1日の基本フロー
```bash
朝:  /ds        # 作業開始（3文字）
昼:  /da [作業] # 自動実行（2文字＋内容）
夕:  /du [進捗] # 進捗更新（2文字＋内容）
夜:  /df        # 作業終了（2文字）
```

### 効率的な使い方
1. **全自動実行が最強**: `/da`で調査→計画→実装→テストまで完全自動化
2. **こまめに進捗更新**: `/du`で作業内容を随時記録
3. **短縮版を使う**: タイピング量を最大89%削減

### タイピング削減効果
- `/dns-start` (10文字) → `/ds` (3文字) = **70%削減**
- `/dns-auto` (9文字) → `/da` (2文字) = **78%削減**
- `/dns-update` (11文字) → `/du` (2文字) = **82%削減**

## 📂 関連ファイル
- `dnssweeper-context.md` - 作業コンテキスト（自動更新）
- `DNSweeper 開発ルール.md` - 開発ルール
- `patterns.json` - 判定パターン
- `test-data/` - テストデータ

## ⚡ クイックスタート
```bash
# 新しい機能開発を始める場合
/ds                          # 状況把握
/da 新機能XXXを実装したい    # 全自動実行

# 既存の作業を続ける場合
/ds                          # 前回の続きから
/dim                         # 実装フェーズから再開
```

## 🏆 覚えるべきTOP 5
1. `/ds` - Start（開始）
2. `/da` - Auto（自動）⭐最重要
3. `/du` - Update（更新）
4. `/df` - Finish（終了）
5. `/dh` - Help（ヘルプ）

---
💡 **ヒント**: まずは`/ds`→`/da`→`/du`→`/df`の基本フローを覚えましょう！