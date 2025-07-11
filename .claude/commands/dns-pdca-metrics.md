---
name: dns-pdca-metrics
description: DNSweeperメトリクス分析PDCA（詳細分析）
arguments: []
---

**メトリクス分析PDCAサイクル：週次または月次で実行**

## 📊 詳細メトリクス分析（20分）

### 1️⃣ Plan（分析計画）- 3分
**分析対象メトリクス選定**
- DORAメトリクス4指標
- DNSweeper固有指標
- ユーザー行動指標
- 品質指標

### 2️⃣ Do（データ収集）- 7分
**DORAメトリクス計測**
```yaml
deployment_frequency:
  current: "週2.5回"
  target: "週3回"
  trend: "↗️ 改善中"

lead_time:
  current: "3.2日"
  target: "2日"
  trend: "→ 横ばい"

mttr:
  current: "45分"
  target: "30分"
  trend: "↗️ 改善中"

change_failure_rate:
  current: "12%"
  target: "10%"
  trend: "↘️ 悪化"
```

**DNSweeper固有メトリクス**
```yaml
performance:
  processing_speed: "195,925 records/sec"
  memory_usage: "21MB (for 1M records)"
  
usage:
  npm_weekly_downloads: 450
  github_stars: 28
  active_issues: 5
  
quality:
  test_coverage: "94.21%"
  code_complexity: "Low"
  bundle_size: "44KB"
```

### 3️⃣ Check（分析・評価）- 7分
**トレンド分析**
- 成長率計算
- ボトルネック特定
- 異常値検出
- 相関関係分析

**ベンチマーク比較**
- 同種OSSツールとの比較
- 業界標準との比較

### 4️⃣ Act（改善施策）- 3分
**データドリブンな改善提案**
1. パフォーマンスボトルネック解消
2. ユーザビリティ改善
3. ドキュメント強化
4. コミュニティ活性化

## 実行手順
1. 各種APIからデータ自動収集
2. 統計分析とビジュアル化
3. インサイト抽出
4. アクションプラン作成

## 出力形式
```yaml
analysis_date: "2025-01-11"
period: "2025-W02"
key_insights:
  - "処理速度が先週比10%向上"
  - "メモリ効率が大幅改善"
  - "npmダウンロード数が増加傾向"
recommendations:
  high_priority:
    - "変更失敗率の改善が急務"
  medium_priority:
    - "リードタイム短縮の取り組み"
  low_priority:
    - "さらなるパフォーマンス向上"
next_actions:
  - "テスト自動化の強化"
  - "CI/CDパイプライン最適化"
time_spent: "18分30秒"
```