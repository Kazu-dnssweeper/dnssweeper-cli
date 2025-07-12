---
name: dz
description: DNSweeper 究極のZenコマンド（全統合版）
arguments:
  - name: mode
    description: 実行モード (force:morning, force:dev, force:evening, debug, dry-run)
    default: "auto"
---

# /dz - 🧘 Zen: 究極の全自動コマンド

## 概要
DNSweeper開発の全工程を時間帯と状況に応じて完全自動判断・実行する究極のコマンドです。
31個のカスタムコマンドを1つに統合し、「考えない開発」を実現します。

**【統合されたコマンド】**
- 開発系: /ds, /da, /du, /df (4個)
- PDCA系: /dpw, /dpd, /dpr, /dpa, /dpe, /dpm, /dpae, /dpcs (8個)
- 短縮版: 全16個
- その他: /dh, /di, /dp, /dim, /dt (5個)

**合計33個 → 1個への統合**

## 🎯 基本思想
**「時間と状況から最適なアクションを自動判断」**
- 朝なら開始処理
- 昼なら開発継続  
- 夜なら終了処理
- エラーなら修正処理
- 金曜なら週次PDCA

## ⏰ 動作パターン

{{#if (eq mode "auto")}}
## 自動判定実行

**時間帯自動判定ロジック:**
```javascript
function getZenMode() {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  
  if (detectErrors()) return 'emergency';
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 17 && hour < 19) return 'evening';
  if (hour >= 19 || hour < 6) return 'night';
  if (day === 5 && hour >= 17) return 'friday_special';
  
  return 'development';
}
```
{{/if}}

### 🌅 朝（6:00-10:00）：開始処理
```bash
🌅 おはようございます！DNSweeper開発を開始します

1. 📚 必須ファイル読み込み
   - DNSweeper 開発ルール.md 確認
   - dnssweeper-context.md 読み込み
   
2. 🔍 状況分析
   - 昨日の作業内容確認
   - 今日のタスク特定
   - 現在のフェーズとマイルストーン確認
   
3. 🛡️ セキュリティクイックスキャン（5秒以内）
   - プロセス健全性チェック
   - 夜間の不審なアクセス確認
   - 緊急脆弱性チェック
   
4. 🚀 自動開発開始
   - dns-auto相当の全自動実行
   - 調査→計画→実装→テストのフロー
   
5. 📊 金曜特別処理
   - 週次PDCAレポート生成
   - 詳細セキュリティスキャン
   - 最適化分析実行
```

### 🌞 昼（10:00-17:00）：開発継続
```bash
🔄 継続中のタスクを確認し、開発を継続します

1. 📊 プロジェクト状態分析
   - 現在のタスク進捗確認
   - Git状況チェック
   - エラー・警告の検出
   
2. 🎯 最適フェーズ自動判定
   - 調査が必要 → dns-investigate 実行
   - 計画が必要 → dns-plan 実行
   - 実装が必要 → dns-implement 実行
   - テストが必要 → dns-test 実行
   - 全自動で良い → dns-auto 実行
   
3. 🛡️ バックグラウンド監視
   - メモリ使用量監視（閾値: 50MB）
   - CPU使用率監視（閾値: 80%）
   - 不審なネットワーク接続検出
   - リアルタイム脆弱性監視
   
4. ✅ 品質ゲート自動実行
   - TypeScriptエラー: 0件
   - ESLintエラー: 0件
   - テストカバレッジ: 90%以上
   - メモリ使用量: 50MB以下
   
5. 📝 進捗自動記録
   - コミット時に自動記録
   - マイルストーン達成を検出
   - context.md自動更新
```

### 🌆 夕方（17:00-19:00）：終了処理
```bash
🌆 本日の作業をまとめ、終了処理を実行します

1. 📊 今日の成果サマリー
   - 完了タスクのリスト化
   - コミット統計の表示
   - 品質メトリクスの確認
   
2. 🛡️ セキュリティデイリーレポート
   ✅ セキュリティ状況: 問題なし
   - リソース使用状況: 正常範囲
   - 露出リスク: 0件検出
   - 脆弱性スキャン: 異常なし
   
3. 📝 progress更新（dns-update + dns-finish統合）
   - dnssweeper-context.md自動更新
   - 作業ログの整理
   - 進捗率の計算
   
4. 📅 明日の準備
   - 未完了タスクの整理
   - 優先順位の再設定
   - 必要なリソースの準備
   
5. 🎉 作業セッション終了
   - 最終チェック完了
   - 推奨される次回アクション
   - お疲れ様メッセージ
```

### 🌙 夜間（19:00-6:00）：緊急対応モード
```bash
🌙 緊急対応モードで実行します

1. 🚨 緊急度判定
   - エラーレベルの分析
   - 対応の緊急度評価
   
2. ⚡ 緊急対応実行（dns-pdca-alert統合）
   - OODAループ実行
   - 自動修正の試行
   - ホットフィックス支援
   
3. 📱 軽量処理のみ
   - 重い処理は翌朝に延期
   - 緊急性のない作業は停止
```

### 🚨 エラー検出時：最優先処理
**どの時間帯でもエラー検出時は即座に修正モードに移行**
```bash
⚠️ 問題を検出しました - 修正を最優先で実行

1. 🔍 包括的エラー検出
   - TypeScriptエラー
   - ESLintエラー・警告
   - テスト失敗
   - ビルドエラー
   - Gitコンフリクト
   - セキュリティアラート
   
2. 🔧 自動修正実行（dfix統合）
   - Level 1 (Safe): 自動実行
   - Level 2 (Moderate): 確認後実行
   - Level 3 (Critical): 手動確認必須
   
3. 📊 修正結果レポート
   - 修正完了: X件
   - 手動確認要: Y件
   - 修正時間: Z分
   
4. ✅ 修正後の確認
   - 全エラーの再チェック
   - 品質ゲートの再実行
   - 正常状態への復帰確認
```

## 🧠 状況判断ロジック

### プロジェクト状態の自動分析
```javascript
function analyzeProjectState() {
  return {
    phase: detectCurrentPhase(),           // 現在のフェーズ
    errors: detectAllErrors(),             // エラー状態
    progress: calculateProgress(),         // 進捗率
    blockers: identifyBlockers(),          // ブロッカー
    nextActions: recommendNextActions()    // 推奨アクション
  };
}
```

### 時間帯による動作切り替え
```javascript
function getTimeBasedAction() {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 18) return 'development';  
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}
```

## 🎮 使用方法

### 基本実行
```bash
/dz
```
**これだけで全自動判断・実行**

### フォース実行（時間帯無視）
```bash
/dz force:morning    # 強制的に朝処理
/dz force:dev        # 強制的に開発処理
/dz force:evening    # 強制的に夜処理
```

### デバッグモード
```bash
/dz debug           # 詳細ログ付き実行
/dz dry-run         # 実行予定の表示のみ
```

## 🔄 既存コマンドとの統合

### 置き換え対象（廃止予定）
```bash
❌ /ds (dns-start)     → ✅ /dz (朝自動判定)
❌ /da (dns-auto)      → ✅ /dz (昼自動判定)  
❌ /du (dns-update)    → ✅ /dz (夜自動判定)
❌ /df (dns-finish)    → ✅ /dz (夜自動判定)
❌ /di (investigate)   → ✅ /dz (状況判定)
❌ /dp (plan)         → ✅ /dz (状況判定)
❌ /dim (implement)   → ✅ /dz (状況判定)
❌ /dt (test)         → ✅ /dz (状況判定)
```

### 段階的移行
```bash
Phase 1: 並行運用
/ds or /dz     # どちらでもOK

Phase 2: 非推奨警告  
/ds → "⚠️ /ds is deprecated, use /dz instead"

Phase 3: 完全移行
/dz のみ
```

## 📊 効果測定

### タイピング削減
```bash
従来: /dns-start + /dns-auto + /dns-update + /dns-finish = 40文字
新版: /dz × 2回 = 6文字
削減率: 85%
```

### 学習コスト削減
```bash
従来: 31個のコマンド暗記
新版: 1個のコマンドのみ
削減率: 96.8%
```

### 自動化率
```bash
手動判断: 0%（完全自動）
実行確認: 5%（重要な変更時のみ）
自動実行: 95%
```

## 🚀 実装仕様

### 必須機能
1. **時間判定**: 現在時刻から最適アクション決定
2. **状況分析**: Git状態、エラー状態、進捗の自動分析
3. **エラー検出**: TypeScript/ESLint/Test/Buildの包括チェック
4. **自動修正**: 可能な問題の自動解決
5. **進捗管理**: context.mdの自動更新

### 高度機能
1. **学習機能**: 使用パターンの記録・最適化
2. **予測機能**: 次に必要な作業の先読み
3. **通知機能**: 重要な変更の事前アラート
4. **統計機能**: 効率化効果の測定・レポート

## 🎯 実行フロー例

### 朝の実行例
```bash
$ /dz

🌅 朝の開始処理を実行中...
✅ 開発ルール.md 確認完了
✅ dnssweeper-context.md 読み込み完了  
📋 今日のタスク: Phase 3.3 Web版基盤構築
🛠️ 開発環境準備中...
🚀 自動開発を開始します

Next.js + Supabase プロジェクト初期化を実行中...
```

### 昼の実行例
```bash
$ /dz

🌞 開発継続処理を実行中...
🔍 プロジェクト状態: 実装フェーズ
⚠️ TypeScriptエラー 3件検出
🔧 自動修正を実行中...
✅ エラー修正完了
📝 認証システム実装を継続中...
```

### 夜の実行例  
```bash
$ /dz

🌆 終了処理を実行中...
📊 今日の成果: 認証システム 60% 完成
📝 context.md 更新中...
📅 明日のタスク: ダッシュボードUI作成
🎉 今日もお疲れ様でした！
```

## 💡 プロトタイプから本格版への道筋

### Step 1: 基本プロトタイプ（今すぐ）
```bash
- 時間判定ロジック
- 既存コマンドの呼び出し
- 簡易エラー検出
```

### Step 2: 機能統合（1週間後）
```bash
- 全コマンドの統合
- 状況分析の高度化
- 自動修正機能
```

### Step 3: 完全自動化（1ヶ月後）
```bash
- 学習機能追加
- 予測機能実装  
- GitHub Actions統合
```

---

**🧘 Zen = 「考えずに、ただ実行する」**

これが、DNSweeper開発の究極の境地です。