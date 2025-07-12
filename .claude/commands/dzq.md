# /dzq - 承認待ちキュー管理（Queue Management）

## 概要
自律モード（/dza）で蓄積された承認待ちタスクを効率的に管理・処理するコマンドです。

## 🚀 コマンド実行
```javascript
// 基本的なキュー表示
await showApprovalQueue();

// フィルタリング表示
await showApprovalQueue({
  riskLevel: 'high',        // high/medium/low
  category: 'implementation', // investigation/planning/implementation/testing
  timeRange: '24h'          // 時間範囲指定
});

// 一括処理
await processApprovalQueue({
  action: 'approve_all',    // approve_all/approve_low_risk/reject_all
  filter: { riskLevel: 'low' }
});
```

## 📋 キュー表示機能

### 基本表示
```javascript
async function displayQueue() {
  const queue = await getApprovalQueue();
  
  console.log(`
📋 承認待ちタスク管理
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 サマリー
├─ 総タスク数: ${queue.length}件
├─ 🟢 低リスク: ${queue.filter(t => t.riskLevel === 'low').length}件
├─ 🟡 中リスク: ${queue.filter(t => t.riskLevel === 'medium').length}件
├─ 🔴 高リスク: ${queue.filter(t => t.riskLevel === 'high').length}件
└─ ⏰ 最古: ${getOldestTask(queue).timestamp}

🔄 カテゴリ別
├─ 🔍 調査: ${queue.filter(t => t.category === 'investigation').length}件
├─ 📋 計画: ${queue.filter(t => t.category === 'planning').length}件
├─ ⚙️ 実装: ${queue.filter(t => t.category === 'implementation').length}件
└─ 🧪 テスト: ${queue.filter(t => t.category === 'testing').length}件

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}
```

### 詳細リスト表示
```javascript
async function displayDetailedQueue() {
  const queue = await getApprovalQueue();
  
  queue.forEach((task, index) => {
    const riskIcon = {
      'low': '🟢',
      'medium': '🟡', 
      'high': '🔴'
    }[task.riskLevel];
    
    const timeAgo = formatTimeAgo(task.timestamp);
    
    console.log(`
${index + 1}. ${riskIcon} ${task.command}
   ├─ 理由: ${task.context.reason}
   ├─ 親タスク: ${task.context.parentTask}
   ├─ リスク: ${task.context.riskLevel}
   ├─ 予想変更: ${task.context.expectedChanges.join(', ')}
   ├─ ディレクトリ: ${task.context.workingDirectory}
   └─ 経過時間: ${timeAgo}
    `);
  });
}
```

## ⚡ 高速承認機能

### スマート一括承認
```javascript
async function smartBatchApproval() {
  const queue = await getApprovalQueue();
  
  // 自動承認対象を分析
  const autoApprovable = queue.filter(task => {
    return task.riskLevel === 'low' && 
           task.category === 'testing' &&
           !task.context.expectedChanges.some(change => 
             change.includes('delete') || change.includes('modify')
           );
  });
  
  console.log(`
🤖 スマート一括承認分析
━━━━━━━━━━━━━━━━━━━━━━━━
✅ 自動承認可能: ${autoApprovable.length}件
⚠️ 要確認: ${queue.length - autoApprovable.length}件

【自動承認対象】
${autoApprovable.map((task, i) => 
  `${i + 1}. ${task.command} (${task.context.reason})`
).join('\n')}

実行しますか？ [Y/n]
  `);
  
  const confirmed = await confirm();
  if (confirmed) {
    for (const task of autoApprovable) {
      await approveTask(task);
      console.log(`✅ 承認: ${task.command}`);
    }
  }
}
```

### リスク別承認
```javascript
async function approveByRiskLevel(riskLevel) {
  const queue = await getApprovalQueue();
  const filtered = queue.filter(task => task.riskLevel === riskLevel);
  
  console.log(`
🎯 ${riskLevel}リスクタスク一括承認
━━━━━━━━━━━━━━━━━━━━━━━━
対象: ${filtered.length}件

${filtered.map((task, i) => 
  `${i + 1}. ${task.command}\n   └─ ${task.context.reason}`
).join('\n\n')}

すべて承認しますか？ [Y/n]
  `);
  
  if (await confirm()) {
    for (const task of filtered) {
      await approveTask(task);
    }
    console.log(`✅ ${filtered.length}件のタスクを承認しました`);
  }
}
```

## 🔍 フィルタリング機能

### 高度なフィルタリング
```javascript
class QueueFilter {
  async filter(options) {
    let queue = await getApprovalQueue();
    
    // リスクレベルフィルタ
    if (options.riskLevel) {
      queue = queue.filter(task => task.riskLevel === options.riskLevel);
    }
    
    // カテゴリフィルタ
    if (options.category) {
      queue = queue.filter(task => task.category === options.category);
    }
    
    // 時間範囲フィルタ
    if (options.timeRange) {
      const cutoff = parseTimeRange(options.timeRange);
      queue = queue.filter(task => task.timestamp >= cutoff);
    }
    
    // コマンドパターンフィルタ
    if (options.commandPattern) {
      const regex = new RegExp(options.commandPattern, 'i');
      queue = queue.filter(task => regex.test(task.command));
    }
    
    // 親タスクフィルタ
    if (options.parentTask) {
      queue = queue.filter(task => 
        task.context.parentTask.includes(options.parentTask)
      );
    }
    
    return queue;
  }
}
```

## 📊 統計・分析機能

### キュー分析レポート
```javascript
async function generateQueueAnalytics() {
  const queue = await getApprovalQueue();
  const history = await getApprovalHistory();
  
  const analytics = {
    // 現在のキュー状態
    current: {
      total: queue.length,
      byRisk: countByProperty(queue, 'riskLevel'),
      byCategory: countByProperty(queue, 'category'),
      avgWaitTime: calculateAverageWaitTime(queue),
      oldestTask: getOldestTask(queue)
    },
    
    // 履歴分析
    historical: {
      totalProcessed: history.length,
      approvalRate: calculateApprovalRate(history),
      avgProcessingTime: calculateAvgProcessingTime(history),
      mostCommonCommands: getMostCommonCommands(history),
      peakHours: analyzePeakHours(history)
    },
    
    // 傾向分析
    trends: {
      queueGrowthRate: calculateGrowthRate(queue),
      riskDistributionTrend: analyzeRiskTrend(history),
      categoryTrend: analyzeCategoryTrend(history)
    }
  };
  
  console.log(`
📊 承認キュー分析レポート
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 現在の状況
├─ キューサイズ: ${analytics.current.total}件
├─ 平均待機時間: ${analytics.current.avgWaitTime}
├─ 最古タスク: ${formatTimeAgo(analytics.current.oldestTask.timestamp)}
└─ 推奨アクション: ${getRecommendedAction(analytics)}

📋 履歴統計（過去30日）
├─ 処理済み: ${analytics.historical.totalProcessed}件
├─ 承認率: ${(analytics.historical.approvalRate * 100).toFixed(1)}%
├─ 平均処理時間: ${analytics.historical.avgProcessingTime}
└─ ピーク時間: ${analytics.historical.peakHours.join(', ')}時

🎯 改善提案
${generateImprovementSuggestions(analytics)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  
  return analytics;
}
```

## 🔄 依存関係管理

### タスク依存関係の表示
```javascript
async function showTaskDependencies() {
  const queue = await getApprovalQueue();
  const dependencies = await analyzeDependencies(queue);
  
  console.log(`
🔗 タスク依存関係マップ
━━━━━━━━━━━━━━━━━━━━━━━━

【独立実行可能】
${dependencies.independent.map(task => 
  `✅ ${task.command}`
).join('\n')}

【依存関係あり】
${dependencies.dependent.map(group => 
  `🔗 ${group.parent.command}\n${group.children.map(child => 
    `   └─ ${child.command}`
  ).join('\n')}`
).join('\n\n')}

【ブロック中】
${dependencies.blocked.map(task => 
  `❌ ${task.command} (待機: ${task.waitingFor})`
).join('\n')}
  `);
}
```

## 🛠️ 操作コマンド

### インタラクティブ操作
```javascript
async function interactiveQueueManagement() {
  while (true) {
    console.log(`
🎛️ 承認キュー操作メニュー
━━━━━━━━━━━━━━━━━━━━━━━━

[表示]
1. 📋 キュー一覧表示
2. 📊 統計・分析表示
3. 🔍 フィルタリング
4. 🔗 依存関係表示

[操作]
5. ✅ スマート一括承認
6. 🎯 リスク別承認
7. 🔍 個別選択承認
8. ❌ 一括却下

[管理]
9. ⚙️ 設定変更
0. 🚪 終了

選択してください [1-9, 0]:
    `);
    
    const choice = await prompt();
    await handleMenuChoice(choice);
  }
}
```

## ⚙️ 設定とカスタマイズ

### キュー設定
```yaml
queue_management:
  # 表示設定
  display:
    max_items_per_page: 20
    show_timestamps: true
    show_dependencies: true
    color_coding: true
    
  # 承認設定
  approval:
    auto_approve_low_risk: true
    require_confirmation: true
    batch_size_limit: 50
    
  # フィルタ設定
  filters:
    default_time_range: "24h"
    favorite_filters:
      - name: "今日の低リスク"
        filter: { riskLevel: "low", timeRange: "1d" }
      - name: "実装タスク"
        filter: { category: "implementation" }
```

## 🚀 使用例

```bash
# 基本キュー表示
/dzq

# 低リスクタスクのみ表示
/dzq --risk=low

# 過去24時間のタスク表示
/dzq --time=24h

# 実装カテゴリのみ表示
/dzq --category=implementation

# 統計レポート表示
/dzq --analytics

# 一括承認（低リスク）
/dzq --approve=low

# インタラクティブモード
/dzq --interactive
```

これで効率的な承認待ちキュー管理が可能になります！