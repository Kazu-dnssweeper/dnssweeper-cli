#!/usr/bin/env node

/**
 * 未解決issue一覧取得スクリプト
 */

const { execSync } = require('child_process');

// 色定義
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.blue}📋 DNSweeper 未解決Issue一覧${colors.reset}`);
console.log('========================================\n');

try {
  // オープンなissueを取得
  const issuesJson = execSync('gh issue list --state open --json number,title,author,createdAt,labels,assignees', { encoding: 'utf8' });
  const issues = JSON.parse(issuesJson);

  if (issues.length === 0) {
    console.log(`${colors.green}✅ 未解決のissueはありません${colors.reset}`);
  } else {
    console.log(`${colors.yellow}📌 ${issues.length}件の未解決issue${colors.reset}\n`);

    issues.forEach((issue, index) => {
      const labels = issue.labels.map(l => l.name).join(', ');
      const assignees = issue.assignees.map(a => a.login).join(', ');
      const createdDate = new Date(issue.createdAt).toLocaleDateString('ja-JP');

      console.log(`${colors.cyan}#${issue.number}${colors.reset} ${issue.title}`);
      console.log(`   👤 作成者: @${issue.author.login}`);
      console.log(`   📅 作成日: ${createdDate}`);
      
      if (labels) {
        console.log(`   🏷️  ラベル: ${labels}`);
      }
      
      if (assignees) {
        console.log(`   👥 担当者: @${assignees}`);
      } else {
        console.log(`   ${colors.red}⚠️  担当者未設定${colors.reset}`);
      }

      console.log(`   🔗 URL: https://github.com/Kazu-dnssweeper/dnssweeper-cli/issues/${issue.number}`);
      
      if (index < issues.length - 1) {
        console.log('   ----------------------------------------');
      }
    });
  }

  // サマリー
  console.log('\n========================================');
  console.log(`${colors.magenta}📊 サマリー:${colors.reset}`);
  
  // ラベル別集計
  const labelCounts = {};
  issues.forEach(issue => {
    issue.labels.forEach(label => {
      labelCounts[label.name] = (labelCounts[label.name] || 0) + 1;
    });
  });

  if (Object.keys(labelCounts).length > 0) {
    console.log('\n🏷️  ラベル別:');
    Object.entries(labelCounts).forEach(([label, count]) => {
      console.log(`   ${label}: ${count}件`);
    });
  }

  // 担当者別集計
  const assigneeCounts = { '未割当': 0 };
  issues.forEach(issue => {
    if (issue.assignees.length === 0) {
      assigneeCounts['未割当']++;
    } else {
      issue.assignees.forEach(assignee => {
        assigneeCounts[assignee.login] = (assigneeCounts[assignee.login] || 0) + 1;
      });
    }
  });

  console.log('\n👥 担当者別:');
  Object.entries(assigneeCounts).forEach(([assignee, count]) => {
    const color = assignee === '未割当' ? colors.red : colors.reset;
    console.log(`   ${color}${assignee}: ${count}件${colors.reset}`);
  });

} catch (error) {
  console.error(`${colors.red}❌ エラーが発生しました: ${error.message}${colors.reset}`);
  process.exit(1);
}