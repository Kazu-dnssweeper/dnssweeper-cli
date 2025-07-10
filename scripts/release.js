#!/usr/bin/env node

/**
 * リリース自動化スクリプト
 * バージョン管理、リリースノート生成、npm公開を自動化
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 色付き出力
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
};

// 実行コマンドのラッパー
function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options });
  } catch (error) {
    if (!options.ignoreError) {
      console.error(colors.red(`❌ コマンド実行エラー: ${command}`));
      throw error;
    }
    return error.stdout || '';
  }
}

// ユーザー入力を取得
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Git状態チェック
function checkGitStatus() {
  const status = exec('git status --porcelain');
  if (status.trim()) {
    console.log(colors.red('❌ 未コミットの変更があります'));
    console.log(status);
    return false;
  }
  return true;
}

// テスト実行
function runTests() {
  console.log(colors.blue('\n🧪 テストを実行中...'));
  try {
    exec('npm test -- --passWithNoTests');
    console.log(colors.green('✅ テスト成功'));
    return true;
  } catch (error) {
    console.error(colors.red('❌ テスト失敗'));
    return false;
  }
}

// ビルド実行
function runBuild() {
  console.log(colors.blue('\n🏗️  ビルドを実行中...'));
  try {
    exec('npm run build');
    console.log(colors.green('✅ ビルド成功'));
    return true;
  } catch (error) {
    console.error(colors.red('❌ ビルド失敗'));
    return false;
  }
}

// バージョン選択
async function selectVersion() {
  const currentVersion = require('../package.json').version;
  console.log(colors.blue(`\n現在のバージョン: ${currentVersion}`));
  
  console.log('\nバージョンタイプを選択してください:');
  console.log('1. patch (バグ修正) - x.x.X');
  console.log('2. minor (新機能) - x.X.0');
  console.log('3. major (破壊的変更) - X.0.0');
  console.log('4. カスタム');
  
  const choice = await prompt('選択 (1-4): ');
  
  switch (choice) {
    case '1':
      return 'patch';
    case '2':
      return 'minor';
    case '3':
      return 'major';
    case '4':
      return await prompt('バージョンを入力 (例: 1.2.3): ');
    default:
      console.log(colors.red('無効な選択'));
      process.exit(1);
  }
}

// リリースノート生成
function generateReleaseNotes(version) {
  const commits = exec('git log $(git describe --tags --abbrev=0 2>/dev/null || echo HEAD)..HEAD --oneline', { ignoreError: true });
  
  let notes = `## 🚀 DNSweeper CLI v${version}\n\n`;
  notes += `リリース日: ${new Date().toISOString().split('T')[0]}\n\n`;
  
  if (commits) {
    notes += '### 変更内容\n\n';
    const lines = commits.trim().split('\n');
    
    const features = [];
    const fixes = [];
    const others = [];
    
    lines.forEach(line => {
      if (line.includes('feat:') || line.includes('feature:')) {
        features.push(line);
      } else if (line.includes('fix:')) {
        fixes.push(line);
      } else {
        others.push(line);
      }
    });
    
    if (features.length > 0) {
      notes += '#### ✨ 新機能\n';
      features.forEach(f => notes += `- ${f}\n`);
      notes += '\n';
    }
    
    if (fixes.length > 0) {
      notes += '#### 🐛 バグ修正\n';
      fixes.forEach(f => notes += `- ${f}\n`);
      notes += '\n';
    }
    
    if (others.length > 0) {
      notes += '#### 📝 その他\n';
      others.forEach(o => notes += `- ${o}\n`);
      notes += '\n';
    }
  }
  
  notes += '### インストール\n\n```bash\nnpm install -g dnssweeper-cli@' + version + '\n```\n';
  
  return notes;
}

// メイン処理
async function main() {
  console.log(colors.blue('🚀 DNSweeper CLI リリース自動化システム\n'));
  
  // 事前チェック
  console.log(colors.yellow('📋 事前チェック...'));
  
  if (!checkGitStatus()) {
    console.log(colors.yellow('\n変更をコミットしますか? (y/n)'));
    const answer = await prompt('> ');
    if (answer.toLowerCase() === 'y') {
      const message = await prompt('コミットメッセージ: ');
      exec(`git add -A && git commit -m "${message}"`);
    } else {
      process.exit(1);
    }
  }
  
  // メインブランチにいるか確認
  const branch = exec('git branch --show-current').trim();
  if (branch !== 'main' && branch !== 'master') {
    console.log(colors.yellow(`⚠️  現在のブランチ: ${branch}`));
    console.log('メインブランチでのリリースを推奨します');
    const answer = await prompt('続行しますか? (y/n): ');
    if (answer.toLowerCase() !== 'y') {
      process.exit(1);
    }
  }
  
  // テストとビルド
  if (!runTests()) {
    process.exit(1);
  }
  
  if (!runBuild()) {
    process.exit(1);
  }
  
  // バージョン選択
  const versionType = await selectVersion();
  
  // バージョン更新
  console.log(colors.blue('\n📝 バージョンを更新中...'));
  let newVersion;
  if (['patch', 'minor', 'major'].includes(versionType)) {
    const result = exec(`npm version ${versionType} --no-git-tag-version`);
    newVersion = result.match(/v?(\d+\.\d+\.\d+)/)[1];
  } else {
    exec(`npm version ${versionType} --no-git-tag-version`);
    newVersion = versionType;
  }
  
  console.log(colors.green(`✅ 新バージョン: ${newVersion}`));
  
  // リリースノート生成
  const releaseNotes = generateReleaseNotes(newVersion);
  console.log(colors.blue('\n📄 リリースノート:'));
  console.log(releaseNotes);
  
  // 確認
  console.log(colors.yellow('\n🚨 リリース前の最終確認'));
  console.log(`- バージョン: ${newVersion}`);
  console.log(`- npm公開: dnssweeper-cli@${newVersion}`);
  console.log(`- GitHubタグ: v${newVersion}`);
  
  const answer = await prompt('\nリリースを実行しますか? (y/n): ');
  if (answer.toLowerCase() !== 'y') {
    console.log(colors.yellow('リリースをキャンセルしました'));
    // バージョンを戻す
    exec('git checkout -- package.json package-lock.json');
    process.exit(0);
  }
  
  // コミットとタグ作成
  console.log(colors.blue('\n📤 変更をコミット中...'));
  exec('git add package.json package-lock.json');
  exec(`git commit -m "chore: release v${newVersion}"`);
  exec(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
  
  // プッシュ
  console.log(colors.blue('\n📤 GitHubにプッシュ中...'));
  exec('git push');
  exec('git push --tags');
  
  console.log(colors.green('\n✨ リリース準備完了！'));
  console.log('\n次のステップ:');
  console.log('1. GitHub Actions の Publish ワークフローを手動実行');
  console.log(`   https://github.com/Kazu-dnssweeper/dnssweeper-cli/actions/workflows/publish.yml`);
  console.log(`2. バージョン ${newVersion} を入力`);
  console.log('3. ワークフロー実行');
  console.log('\n または GitHub でリリースを作成すると自動的に npm に公開されます');
}

// エラーハンドリング付きで実行
if (require.main === module) {
  main().catch((error) => {
    console.error(colors.red(`\n❌ エラー: ${error.message}`));
    process.exit(1);
  });
}