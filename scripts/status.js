#!/usr/bin/env node
/**
 * プロジェクトステータス確認スクリプト
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function color(text, colorName) {
  return `${colors[colorName]}${text}${colors.reset}`;
}

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    if (options.ignoreError) {
      return '';
    }
    throw error;
  }
}

function checkMark(condition) {
  return condition ? color('✅', 'green') : color('❌', 'red');
}

async function main() {
  console.log(color('\n🔍 DNSweeper CLI プロジェクトステータス\n', 'cyan'));
  
  // 1. 基本情報
  console.log(color('📦 基本情報', 'blue'));
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`  バージョン: ${packageJson.version}`);
  console.log(`  説明: ${packageJson.description}`);
  console.log(`  ライセンス: ${packageJson.license}`);
  
  // 2. Git状態
  console.log(color('\n📋 Git状態', 'blue'));
  const branch = exec('git branch --show-current');
  console.log(`  現在のブランチ: ${branch}`);
  
  const lastCommit = exec('git log -1 --oneline');
  console.log(`  最新コミット: ${lastCommit}`);
  
  const uncommitted = exec('git status --porcelain', { ignoreError: true });
  console.log(`  未コミットの変更: ${uncommitted ? color('あり', 'yellow') : color('なし', 'green')}`);
  
  // 3. ファイル構成チェック
  console.log(color('\n📂 ファイル構成', 'blue'));
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'jest.config.js',
    '.eslintrc.js',
    'README.md',
    'LICENSE',
    'patterns.json',
    'messages-ja.json',
    'messages-en.json'
  ];
  
  for (const file of requiredFiles) {
    const exists = fs.existsSync(file);
    console.log(`  ${checkMark(exists)} ${file}`);
  }
  
  // 4. GitHub Actions状態
  console.log(color('\n🔄 GitHub Actions', 'blue'));
  try {
    const runs = exec('gh run list --limit 3 --json status,conclusion,name,createdAt');
    const runData = JSON.parse(runs);
    
    if (runData.length > 0) {
      console.log('  最近の実行:');
      runData.forEach(run => {
        const status = run.conclusion || run.status;
        const icon = status === 'success' ? '✅' : status === 'failure' ? '❌' : '⏳';
        const date = new Date(run.createdAt).toLocaleString('ja-JP');
        console.log(`    ${icon} ${run.name}: ${status} (${date})`);
      });
    } else {
      console.log('  実行履歴なし');
    }
  } catch (error) {
    console.log('  ' + color('GitHub CLIが利用できません', 'yellow'));
  }
  
  // 5. 依存関係
  console.log(color('\n📚 依存関係', 'blue'));
  const outdated = exec('npm outdated', { ignoreError: true });
  if (outdated) {
    console.log('  更新可能なパッケージ:');
    console.log(outdated.split('\n').map(line => '    ' + line).join('\n'));
  } else {
    console.log('  ' + color('すべて最新です', 'green'));
  }
  
  // 6. npm公開状態
  console.log(color('\n🌐 npm公開状態', 'blue'));
  const npmInfo = exec(`npm view ${packageJson.name} version`, { ignoreError: true });
  if (npmInfo) {
    console.log(`  公開バージョン: ${npmInfo}`);
    console.log(`  ローカルバージョン: ${packageJson.version}`);
    
    if (npmInfo === packageJson.version) {
      console.log('  ' + color('最新版が公開されています', 'green'));
    } else {
      console.log('  ' + color('新しいバージョンの公開が必要です', 'yellow'));
    }
  } else {
    console.log('  ' + color('まだnpmに公開されていません', 'yellow'));
  }
  
  // 7. テストカバレッジ
  console.log(color('\n🧪 テストカバレッジ', 'blue'));
  if (fs.existsSync('coverage/coverage-summary.json')) {
    const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
    const total = coverage.total;
    console.log(`  行カバレッジ: ${total.lines.pct}%`);
    console.log(`  関数カバレッジ: ${total.functions.pct}%`);
    console.log(`  ブランチカバレッジ: ${total.branches.pct}%`);
  } else {
    console.log('  カバレッジデータなし（npm test -- --coverage を実行）');
  }
  
  console.log(color('\n✨ ステータス確認完了\n', 'green'));
}

main().catch(error => {
  console.error(color(`\n❌ エラー: ${error.message}`, 'red'));
  process.exit(1);
});