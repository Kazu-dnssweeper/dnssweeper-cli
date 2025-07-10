#!/usr/bin/env node

/**
 * Issue自動ラベリングスクリプト
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

// ラベリングルール
const labelRules = [
  { keywords: ['bug', 'error', 'エラー', 'バグ', 'crash', 'fail'], label: 'bug' },
  { keywords: ['feature', 'enhancement', '機能', '追加', 'add'], label: 'enhancement' },
  { keywords: ['document', 'docs', 'readme', 'ドキュメント', '説明'], label: 'documentation' },
  { keywords: ['test', 'テスト', 'jest', 'coverage'], label: 'test' },
  { keywords: ['performance', 'slow', 'パフォーマンス', '遅い', '高速化'], label: 'performance' },
  { keywords: ['security', 'vulnerability', 'セキュリティ', '脆弱性'], label: 'security' },
  { keywords: ['dependency', 'package', 'npm', '依存', 'アップデート'], label: 'dependencies' },
  { keywords: ['typescript', 'type', 'ts', '型'], label: 'typescript' },
  { keywords: ['ci', 'github actions', 'workflow'], label: 'ci/cd' }
];

console.log(`${colors.blue}🏷️  DNSweeper Issue自動ラベリング${colors.reset}`);
console.log('========================================\n');

// 引数チェック
const issueNumber = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!issueNumber && !dryRun) {
  console.log('使用方法:');
  console.log('  node auto-label-issues.js <issue番号>    # 特定のissueにラベル付け');
  console.log('  node auto-label-issues.js --dry-run      # 全issueの推奨ラベルを表示（実行しない）');
  process.exit(1);
}

try {
  if (dryRun) {
    // ドライランモード：全issueの推奨ラベルを表示
    console.log(`${colors.yellow}🔍 ドライランモード: 推奨ラベルを表示します${colors.reset}\n`);
    
    const issuesJson = execSync('gh issue list --state open --json number,title,body,labels', { encoding: 'utf8' });
    const issues = JSON.parse(issuesJson);
    
    issues.forEach(issue => {
      const currentLabels = issue.labels.map(l => l.name);
      const content = `${issue.title} ${issue.body || ''}`.toLowerCase();
      const suggestedLabels = [];
      
      // ルールに基づいてラベルを提案
      labelRules.forEach(rule => {
        if (rule.keywords.some(keyword => content.includes(keyword.toLowerCase()))) {
          if (!currentLabels.includes(rule.label)) {
            suggestedLabels.push(rule.label);
          }
        }
      });
      
      if (suggestedLabels.length > 0) {
        console.log(`${colors.cyan}Issue #${issue.number}: ${issue.title}${colors.reset}`);
        console.log(`   現在のラベル: ${currentLabels.join(', ') || 'なし'}`);
        console.log(`   ${colors.green}➕ 推奨ラベル: ${suggestedLabels.join(', ')}${colors.reset}`);
        console.log(`   実行コマンド: gh issue edit ${issue.number} --add-label "${suggestedLabels.join(',')}"`);
        console.log('');
      }
    });
    
    console.log(`${colors.blue}💡 実際にラベルを付けるには、上記のコマンドを実行してください${colors.reset}`);
    
  } else {
    // 特定のissueにラベル付け
    console.log(`${colors.yellow}🔍 Issue #${issueNumber} を分析中...${colors.reset}\n`);
    
    // issue情報を取得
    const issueJson = execSync(`gh issue view ${issueNumber} --json title,body,labels`, { encoding: 'utf8' });
    const issue = JSON.parse(issueJson);
    
    const currentLabels = issue.labels.map(l => l.name);
    const content = `${issue.title} ${issue.body || ''}`.toLowerCase();
    const labelsToAdd = [];
    
    console.log(`タイトル: ${issue.title}`);
    console.log(`現在のラベル: ${currentLabels.join(', ') || 'なし'}\n`);
    
    // ルールに基づいてラベルを判定
    labelRules.forEach(rule => {
      if (rule.keywords.some(keyword => content.includes(keyword.toLowerCase()))) {
        if (!currentLabels.includes(rule.label)) {
          labelsToAdd.push(rule.label);
          console.log(`${colors.green}✅ "${rule.label}" ラベルを追加します${colors.reset}`);
          console.log(`   検出キーワード: ${rule.keywords.filter(k => content.includes(k.toLowerCase())).join(', ')}`);
        }
      }
    });
    
    if (labelsToAdd.length === 0) {
      console.log(`${colors.blue}ℹ️  追加するラベルはありません${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}🏷️  ラベルを追加中...${colors.reset}`);
      
      try {
        execSync(`gh issue edit ${issueNumber} --add-label "${labelsToAdd.join(',')}"`, { stdio: 'inherit' });
        console.log(`${colors.green}✅ ラベルを追加しました: ${labelsToAdd.join(', ')}${colors.reset}`);
        
        // コメントを追加
        const comment = `🏷️ 自動ラベリングシステムにより、以下のラベルを追加しました:\n\n${labelsToAdd.map(l => `- \`${l}\``).join('\n')}`;
        execSync(`gh issue comment ${issueNumber} --body "${comment}"`);
        
      } catch (error) {
        console.error(`${colors.red}❌ ラベル追加中にエラーが発生しました${colors.reset}`);
        throw error;
      }
    }
  }
  
  // ラベル一覧の表示
  console.log('\n========================================');
  console.log(`${colors.magenta}📋 利用可能なラベルルール:${colors.reset}`);
  labelRules.forEach(rule => {
    console.log(`   ${colors.cyan}${rule.label}${colors.reset}: ${rule.keywords.slice(0, 3).join(', ')}...`);
  });
  
} catch (error) {
  console.error(`${colors.red}❌ エラーが発生しました: ${error.message}${colors.reset}`);
  process.exit(1);
}