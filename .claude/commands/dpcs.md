---
name: dpcs
description: PDCA時のClaude動作設定（品質重視モード）
arguments: []
---

**Claude PDCA実行時の動作設定**

## 🎯 品質重視モード設定

### 基本方針
```yaml
claude_pdca_settings:
  mode: "QUALITY_FIRST"  # 品質優先モード
  
  error_handling:
    zero_tolerance: true  # エラーゼロ原則
    auto_fix: true       # 自動修正有効
    
  testing:
    always_run_tests: true
    coverage_threshold: 90
    fail_on_warning: false
    
  code_style:
    auto_format: true
    lint_before_commit: true
    type_check_strict: true
```

### PDCA実行時の振る舞い

**Plan フェーズ**
- リスク分析を必ず実施
- 影響範囲を明確化
- テスト計画を含める

**Do フェーズ**
- 段階的実装を優先
- 各ステップでテスト実行
- リファクタリングを同時実施

**Check フェーズ**
- 全自動テスト実行
- パフォーマンス計測
- セキュリティチェック

**Act フェーズ**
- 改善提案は具体的に
- 次回アクションを明確化
- 学習事項を記録

### コミュニケーション設定
```yaml
communication:
  language: "ja"  # 日本語優先
  
  progress_updates:
    frequency: "DETAILED"  # 詳細な進捗報告
    include_reasoning: true
    
  error_reporting:
    level: "VERBOSE"  # 詳細なエラー情報
    include_stacktrace: true
    suggest_fixes: true
```

### 自動化レベル
```yaml
automation_preferences:
  git_operations:
    auto_commit: false  # 手動確認必須
    auto_push: false
    commit_message_style: "conventional"
    
  dependency_updates:
    auto_update: false
    security_only: true
    
  code_generation:
    prefer_existing_patterns: true
    avoid_over_engineering: true
```

### 優先順位設定
```yaml
priorities:
  1: "エラー修正"
  2: "テスト追加"
  3: "パフォーマンス改善"
  4: "新機能開発"
  5: "ドキュメント更新"
```

## 実行例
```bash
# この設定でPDCAを実行
claude-code --settings pdca-quality-mode

# 出力例
"PDCA品質モードで実行中..."
"✅ エラーゼロ原則適用"
"✅ テスト自動実行有効"
"✅ 段階的実装モード"
```

## 期待される効果
- 品質問題の予防
- 安定したリリース
- 技術的負債の削減
- 予測可能な開発