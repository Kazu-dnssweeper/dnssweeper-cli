# /dshow - 📊 Show: 状況確認・可視化コマンド

## 概要
DNSweeper開発の現在状況を包括的に表示・分析するダッシュボードコマンドです。
進捗・品質・問題・メトリクスを一目で把握し、次のアクションを明確にします。

## 🎯 基本思想
**「現状を正確に把握してから、次のアクションを決める」**
- 数値による客観的状況把握
- 問題の早期発見
- データドリブンな意思決定

## 📊 表示内容

### プロジェクト概要
```bash
📦 DNSweeper CLI v0.1.0
🎯 現在フェーズ: Phase 3.3 Web版基盤構築 
📈 全体進捗: 65% (Phase 1: 100%, Phase 2: 100%, Phase 3: 95%)
⏰ 最終更新: 2025-07-11 14:30:15
```

### 開発状況
```bash
🔄 現在のタスク:
  ✅ CLI版ストリーミング実装 (完了)
  🔄 マルチプロバイダー対応 (90% 完了)
  ⭐ Web版基盤構築 (開始準備中)
  □ Next.js + Supabase 統合 (未開始)

📅 今日の予定:
  - 認証システム実装 (2時間)
  - ダッシュボードUI作成 (3時間)
  - 料金プラン画面 (1時間)
```

### 品質メトリクス
```bash
🎯 品質スコア: 94/100 🌟

📊 詳細メトリクス:
  ✅ TypeScript: エラー 0件
  ✅ ESLint: エラー 0件, 警告 3件
  ✅ テストカバレッジ: 94.21%
  ✅ ビルドサイズ: 44.0kB (最適)
  ⚠️ パフォーマンス: 98% (1件要改善)

📈 DORA メトリクス:
  🚀 デプロイ頻度: 週3回
  ⚡ リードタイム: 2.5時間
  🛠️ MTTR: 45分
  ✅ 変更失敗率: 2.1%
```

### Git・リポジトリ状況
```bash
🌳 Git状況:
  📍 ブランチ: main
  📝 コミット数: 127 (+5 today)
  👥 コントリビュータ: 1
  🔄 未コミット: 3ファイル
  📤 未プッシュ: 0コミット

📊 統計:
  📈 週間コミット: 15件
  🔥 連続開発日数: 5日
  📝 平均コミットサイズ: 42 lines
```

### 収益化進捗
```bash
💰 収益化マイルストーン:
  ✅ Phase 1-2: CLI版完成 (100%)
  🔄 Phase 3: 初期展開 (25%)
    ✅ npm公開完了
    ⭐ Web版開発中
    □ 認証システム (0%)
    □ 決済システム (0%)

🎯 収益目標:
  - 6ヶ月目標: $600 MRR
  - 現在の準備度: 30%
  - 予定開始: Phase 3.3
```

### パッケージ・依存関係
```bash
📦 パッケージ情報:
  📊 サイズ: 44.0kB (npm package)
  📥 ダウンロード: 127 (total)
  🔗 依存関係: 4 production, 20 dev
  🛡️ 脆弱性: 0件

🔧 環境:
  ⚡ Node.js: v20.11.0
  📦 pnpm: v10.13.1
  🔨 TypeScript: v5.0.0
  ✅ 環境の健全性: 100%
```

### 問題・警告
```bash
⚠️ 要注意事項:
  🟡 ESLint警告: 3件 (命名規則)
  🟡 TODO項目: 8件
  🟡 技術的負債: 2件
  
🔴 緊急対応不要:
  問題は検出されませんでした ✨
```

## 🎮 使用方法

### 基本表示
```bash
/dshow
```
**全項目のサマリー表示**

### 特定項目の詳細表示
```bash
/dshow progress      # 進捗詳細
/dshow quality       # 品質メトリクス詳細
/dshow git          # Git詳細
/dshow revenue      # 収益化詳細
/dshow problems     # 問題・警告詳細
/dshow metrics      # 開発メトリクス詳細
```

### 期間指定
```bash
/dshow today        # 今日の状況
/dshow week         # 今週の状況
/dshow month        # 今月の状況
```

### 出力形式
```bash
/dshow json         # JSON形式
/dshow markdown     # Markdown形式
/dshow csv          # CSV形式
/dshow chart        # チャート形式（ASCII）
```

## 📈 グラフィカル表示

### 進捗チャート
```bash
📊 Phase別進捗:
Phase 1 ████████████████████ 100%
Phase 2 ████████████████████ 100%  
Phase 3 ████████████████▓▓▓▓ 80%
Phase 4 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 0%

📈 今週の開発活動:
月 ████████▓▓ 8h
火 ██████████ 10h
水 ████████▓▓ 8h
木 ██████▓▓▓▓ 6h
金 ████████▓▓ 8h (今日)
```

### 品質トレンド
```bash
📊 品質スコア推移 (7日間):
100|     ⭐
 95|   ●─●─⭐
 90| ●─●     ●
 85|●        
 80|         
   +─────────
   月火水木金土日

✅ カバレッジ推移:
95%| ●─●─●─●─⭐
90%|●        
85%|         
   +─────────
   月火水木金土日
```

### 収益化準備度
```bash
💰 収益化準備状況:
CLI基盤     ████████████████████ 100%
Web基盤     ████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 20%
認証システム ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 0%
決済システム ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 0%
UI/UX      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 0%

総合準備度: 30%
```

## 🔍 詳細分析

### コード品質分析
```javascript
function analyzeCodeQuality() {
  return {
    complexity: calculateComplexity(),     // 複雑度
    maintainability: assessMaintainability(), // 保守性
    testability: evaluateTestability(),    // テスト容易性
    documentation: checkDocumentation(),   // ドキュメント充実度
    security: scanSecurityIssues()         // セキュリティ
  };
}
```

### パフォーマンス分析
```javascript
function analyzePerformance() {
  return {
    buildTime: measureBuildTime(),         // ビルド時間
    testTime: measureTestTime(),           // テスト時間  
    bundleSize: analyzeBundleSize(),       // バンドルサイズ
    memory: checkMemoryUsage(),            // メモリ使用量
    startup: measureStartupTime()          // 起動時間
  };
}
```

### 開発効率分析
```javascript
function analyzeDevelopmentEfficiency() {
  return {
    velocity: calculateVelocity(),         // 開発速度
    qualityRate: calculateQualityRate(),   // 品質維持率
    automationRate: getAutomationRate(),   // 自動化率
    errorRate: calculateErrorRate(),       // エラー発生率
    refactorNeed: assessRefactorNeed()     // リファクタ必要度
  };
}
```

## 🎯 推奨アクション

### 状況別推奨
```bash
📈 進捗が良好な場合:
  ✅ 現在の方針を継続
  ⭐ 次フェーズの準備開始を検討
  📊 メトリクス記録の継続

⚠️ 問題が検出された場合:
  🔧 /dfix で即座に修正
  📋 根本原因の分析
  🛡️ 再発防止策の検討

🚀 最適化の余地がある場合:
  ⚡ パフォーマンス改善
  🧹 コードリファクタリング
  📚 ドキュメント充実
```

### 時間帯別推奨
```bash
🌅 朝 (9:00前):
  → /dz で1日の開始

🌞 昼 (開発時間):
  → 品質に問題がなければ /dz で開発継続
  → 問題があれば /dfix で修正

🌆 夜 (18:00以降):
  → /dz で1日の終了処理
```

## 💡 実行例

### 基本的な状況確認
```bash
$ /dshow

📊 DNSweeper 開発ダッシュボード

🎯 プロジェクト状況:
  📦 バージョン: v0.1.0
  📈 進捗: Phase 3.3 (65%)
  💰 収益化準備: 30%

✅ 品質スコア: 94/100
  - TypeScript: ✅ エラー0件
  - ESLint: ⚠️ 警告3件  
  - カバレッジ: ✅ 94.21%

🔄 今日のタスク:
  1. Web版認証実装 (2h)
  2. ダッシュボードUI (3h)
  3. 料金プラン画面 (1h)

💡 推奨アクション:
  /dfix lint  # ESLint警告の修正
  /dz         # 開発継続
```

### 詳細な品質確認
```bash
$ /dshow quality

📊 品質メトリクス詳細

🎯 総合スコア: 94/100 🌟

📈 カバレッジ詳細:
  ├─ utils/      ██████████ 100%
  ├─ parsers/    █████████▓ 97%
  ├─ patterns/   █████████▓ 97%
  ├─ commands/   ████████▓▓ 85%
  └─ analyzers/  ███████▓▓▓ 75%

🔍 品質指標:
  ✅ 複雑度: 低 (Cyclomatic < 10)
  ✅ 保守性: 高 (Maintainability Index: 85)
  ⚠️ 技術的負債: 2件
  ✅ セキュリティ: 脆弱性0件

📊 パフォーマンス:
  ⚡ ビルド時間: 2.3秒
  ⚡ テスト時間: 8.7秒
  ⚡ 起動時間: 0.12秒
  💾 メモリ使用: 21MB
```

---

**📊 Show = 「現状を知ることが、改善の第一歩」**

これが、DNSweeper開発の現状把握と意思決定の基盤です。