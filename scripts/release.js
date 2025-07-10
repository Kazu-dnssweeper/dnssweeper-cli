#!/usr/bin/env node
/**
 * リリース自動化スクリプト
 */

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function exec(command, options = {}) {
  console.log(`📍 実行: ${command}`);
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'inherit', ...options });
  } catch (error) {
    if (!options.ignoreError) {
      console.error(`❌ エラー: ${command}`);
      process.exit(1);
    }
  }
}

async function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🚀 DNSweeper CLI リリースプロセス開始\n');
  
  // 1. 現在の状態確認
  console.log('📊 現在の状態を確認中...');
  const currentVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
  console.log(`現在のバージョン: ${currentVersion}`);
  
  // 2. クリーンな状態か確認
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim()) {
    console.log('⚠️  未コミットの変更があります:');
    console.log(gitStatus);
    const proceed = await prompt('続行しますか？ (y/N): ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('リリースを中止しました');
      process.exit(0);
    }
  }
  
  // 3. テスト実行
  console.log('\n🧪 テスト実行中...');
  exec('npm test -- --passWithNoTests --ci --coverage=false --forceExit');
  
  // 4. ビルド
  console.log('\n🏗️  ビルド実行中...');
  exec('npm run build');
  
  // 5. バージョン選択
  console.log('\n📌 新しいバージョンを選択してください:');
  console.log('1) patch (修正: 0.1.0 → 0.1.1)');
  console.log('2) minor (機能追加: 0.1.0 → 0.2.0)');
  console.log('3) major (破壊的変更: 0.1.0 → 1.0.0)');
  console.log('4) 手動入力');
  
  const choice = await prompt('選択 (1-4): ');
  let newVersion;
  
  switch (choice) {
    case '1':
      newVersion = 'patch';
      break;
    case '2':
      newVersion = 'minor';
      break;
    case '3':
      newVersion = 'major';
      break;
    case '4':
      newVersion = await prompt('バージョンを入力 (例: 1.2.3): ');
      break;
    default:
      console.log('無効な選択です');
      process.exit(1);
  }
  
  // 6. CHANGELOG生成
  console.log('\n📝 CHANGELOG生成中...');
  const changelog = await prompt('このリリースの主な変更点を入力してください: ');
  
  // 7. バージョン更新とタグ作成
  console.log('\n🏷️  バージョン更新中...');
  exec(`npm version ${newVersion} -m "chore: release v%s\n\n${changelog}"`);
  
  // 8. プッシュ
  console.log('\n📤 GitHubへプッシュ中...');
  exec('git push origin main --tags');
  
  console.log('\n✅ リリースプロセス完了！');
  console.log('GitHub Actionsがnpm公開を自動的に実行します。');
  console.log('進捗はこちらで確認: https://github.com/Kazu-dnssweeper/dnssweeper-cli/actions');
  
  rl.close();
}

main().catch(error => {
  console.error('❌ エラー:', error.message);
  process.exit(1);
});