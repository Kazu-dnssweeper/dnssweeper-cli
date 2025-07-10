#!/usr/bin/env node

/**
 * PR状況確認スクリプト
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

console.log(`${colors.blue}🔄 DNSweeper Pull Request状況${colors.reset}`);
console.log('========================================\n');

try {
  // オープンなPRを取得
  const prsJson = execSync('gh pr list --state open --json number,title,author,createdAt,labels,isDraft,reviewDecision,statusCheckRollup', { encoding: 'utf8' });
  const prs = JSON.parse(prsJson);

  if (prs.length === 0) {
    console.log(`${colors.green}✅ オープンなPRはありません${colors.reset}`);
  } else {
    console.log(`${colors.yellow}📌 ${prs.length}件のオープンPR${colors.reset}\n`);

    prs.forEach((pr, index) => {
      const labels = pr.labels.map(l => l.name).join(', ');
      const createdDate = new Date(pr.createdAt).toLocaleDateString('ja-JP');
      const isDraft = pr.isDraft ? `${colors.yellow}[DRAFT]${colors.reset} ` : '';
      
      // ステータスチェックの状態を判定
      let statusIcon = '⏳';
      let statusColor = colors.yellow;
      if (pr.statusCheckRollup && pr.statusCheckRollup.length > 0) {
        const hasFailure = pr.statusCheckRollup.some(check => check.conclusion === 'FAILURE');
        const allSuccess = pr.statusCheckRollup.every(check => check.conclusion === 'SUCCESS');
        
        if (hasFailure) {
          statusIcon = '❌';
          statusColor = colors.red;
        } else if (allSuccess) {
          statusIcon = '✅';
          statusColor = colors.green;
        }
      }

      // レビュー状態
      let reviewStatus = '';
      if (pr.reviewDecision === 'APPROVED') {
        reviewStatus = `${colors.green}✅ 承認済み${colors.reset}`;
      } else if (pr.reviewDecision === 'CHANGES_REQUESTED') {
        reviewStatus = `${colors.red}🔧 変更要求${colors.reset}`;
      } else {
        reviewStatus = `${colors.yellow}👀 レビュー待ち${colors.reset}`;
      }

      console.log(`${colors.cyan}#${pr.number}${colors.reset} ${isDraft}${pr.title}`);
      console.log(`   👤 作成者: @${pr.author.login}`);
      console.log(`   📅 作成日: ${createdDate}`);
      console.log(`   ${statusColor}${statusIcon} ステータス${colors.reset} | ${reviewStatus}`);
      
      if (labels) {
        console.log(`   🏷️  ラベル: ${labels}`);
      }

      console.log(`   🔗 URL: https://github.com/Kazu-dnssweeper/dnssweeper-cli/pull/${pr.number}`);
      
      // ステータスチェックの詳細
      if (pr.statusCheckRollup && pr.statusCheckRollup.length > 0) {
        console.log(`   📋 チェック詳細:`);
        pr.statusCheckRollup.forEach(check => {
          const checkIcon = check.conclusion === 'SUCCESS' ? '✅' : 
                           check.conclusion === 'FAILURE' ? '❌' : '⏳';
          console.log(`      ${checkIcon} ${check.name || check.context}`);
        });
      }
      
      if (index < prs.length - 1) {
        console.log('   ----------------------------------------');
      }
    });
  }

  // マージ済みPRの統計
  console.log('\n========================================');
  console.log(`${colors.magenta}📊 最近のマージ済みPR:${colors.reset}`);
  
  const mergedPrsJson = execSync('gh pr list --state merged --limit 5 --json number,title,mergedAt', { encoding: 'utf8' });
  const mergedPrs = JSON.parse(mergedPrsJson);
  
  if (mergedPrs.length > 0) {
    mergedPrs.forEach(pr => {
      const mergedDate = new Date(pr.mergedAt).toLocaleDateString('ja-JP');
      console.log(`   ${colors.green}✅${colors.reset} #${pr.number} ${pr.title} (${mergedDate})`);
    });
  } else {
    console.log('   最近のマージはありません');
  }

  // アクション提案
  if (prs.length > 0) {
    console.log(`\n${colors.blue}💡 推奨アクション:${colors.reset}`);
    
    const needsReview = prs.filter(pr => !pr.reviewDecision && !pr.isDraft);
    if (needsReview.length > 0) {
      console.log(`   - ${needsReview.length}件のPRがレビュー待ちです`);
      needsReview.forEach(pr => {
        console.log(`     gh pr review ${pr.number}`);
      });
    }
    
    const approved = prs.filter(pr => pr.reviewDecision === 'APPROVED');
    if (approved.length > 0) {
      console.log(`   - ${approved.length}件の承認済みPRがマージ可能です`);
      approved.forEach(pr => {
        console.log(`     gh pr merge ${pr.number}`);
      });
    }
  }

} catch (error) {
  console.error(`${colors.red}❌ エラーが発生しました: ${error.message}${colors.reset}`);
  process.exit(1);
}