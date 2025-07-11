#!/usr/bin/env node

/**
 * 実行権限自動設定スクリプト
 * セキュリティを保ちながら開発効率を向上
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 実行権限を付与するファイルのホワイトリスト
const EXECUTABLE_FILES = [
  // ビルド済みCLI
  'dist/index.js',
  
  // スクリプトファイル
  'scripts/release.js',
  'scripts/status.js',
  'scripts/fix-ci.js',
  'scripts/collect-metrics.js',
  'scripts/fix-permissions.sh',
  'scripts/benchmark-streaming.js',
  'scripts/generate-large-test-data.js',
  'scripts/watch-issues.sh',
  
  // GitHub utilsスクリプト
  'scripts/github-utils/auto-label-issues.js',
  'scripts/github-utils/check-pr-status.js',
  'scripts/github-utils/get-open-issues.js',
  
  // このスクリプト自身
  'scripts/setup-permissions.js'
];

// シェルスクリプトパターン
const SHELL_SCRIPT_PATTERN = /\.sh$/;

// 実行可能なNode.jsファイルのシバン行
const NODE_SHEBANG_PATTERN = /^#!.*node/;
const SHELL_SHEBANG_PATTERN = /^#!.*sh/;

/**
 * ファイルに実行権限を付与
 */
function makeExecutable(filePath) {
  try {
    // ファイルが存在するか確認
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  スキップ: ${filePath} (ファイルが存在しません)`);
      return false;
    }
    
    // Windowsの場合はスキップ（chmod不要）
    if (process.platform === 'win32') {
      console.log(`⏭️  スキップ: ${filePath} (Windows環境)`);
      return true;
    }
    
    // 実行権限を付与
    fs.chmodSync(filePath, '755');
    console.log(`✅ 実行権限付与: ${filePath}`);
    
    // Gitに権限を記録（Gitリポジトリ内の場合）
    try {
      execSync(`git update-index --chmod=+x ${filePath}`, { stdio: 'ignore' });
    } catch (e) {
      // Gitリポジトリでない場合は無視
    }
    
    return true;
  } catch (error) {
    console.error(`❌ エラー: ${filePath} - ${error.message}`);
    return false;
  }
}

/**
 * ファイルがシバン行を持つか確認
 */
function hasShebang(filePath) {
  try {
    const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
    return NODE_SHEBANG_PATTERN.test(firstLine) || SHELL_SHEBANG_PATTERN.test(firstLine);
  } catch (error) {
    return false;
  }
}

/**
 * ディレクトリ内のシェルスクリプトを検索
 */
function findShellScripts(dir) {
  const shellScripts = [];
  
  function walk(currentPath) {
    try {
      const files = fs.readdirSync(currentPath);
      
      for (const file of files) {
        const fullPath = path.join(currentPath, file);
        const stat = fs.statSync(fullPath);
        
        // node_modulesと.gitは除外
        if (file === 'node_modules' || file === '.git') {
          continue;
        }
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (SHELL_SCRIPT_PATTERN.test(file) || hasShebang(fullPath)) {
          shellScripts.push(path.relative(process.cwd(), fullPath));
        }
      }
    } catch (error) {
      // アクセス権限がないディレクトリは無視
    }
  }
  
  walk(dir);
  return shellScripts;
}

/**
 * メイン処理
 */
function main() {
  console.log('🔧 実行権限の自動設定を開始します...\n');
  
  let successCount = 0;
  let skipCount = 0;
  
  // ホワイトリストのファイルに権限付与
  console.log('📋 ホワイトリストのファイルを処理中...');
  for (const file of EXECUTABLE_FILES) {
    if (makeExecutable(file)) {
      successCount++;
    } else {
      skipCount++;
    }
  }
  
  // プロジェクト内のシェルスクリプトを検索
  console.log('\n🔍 シェルスクリプトとシバン行を持つファイルを検索中...');
  const foundScripts = findShellScripts('.');
  const additionalScripts = foundScripts.filter(f => !EXECUTABLE_FILES.includes(f));
  
  if (additionalScripts.length > 0) {
    // TypeScriptソースファイルは除外（ビルド後のJSファイルのみ実行可能にする）
    const relevantScripts = additionalScripts.filter(f => !f.endsWith('.ts') && !f.endsWith('.d.ts'));
    
    if (relevantScripts.length > 0) {
      console.log(`\n📌 追加で見つかった実行可能ファイル:`);
      for (const script of relevantScripts) {
        console.log(`   - ${script}`);
      }
      
      console.log('\n💡 ヒント: これらのファイルをホワイトリストに追加することを検討してください。');
      console.log('   scripts/setup-permissions.js の EXECUTABLE_FILES 配列に追加できます。');
    }
  }
  
  // サマリー
  console.log('\n📊 実行結果:');
  console.log(`   ✅ 権限付与: ${successCount} ファイル`);
  console.log(`   ⏭️  スキップ: ${skipCount} ファイル`);
  
  // Git設定の確認
  try {
    const filemode = execSync('git config core.filemode', { encoding: 'utf8' }).trim();
    if (filemode !== 'true') {
      console.log('\n⚠️  注意: git config core.filemode が false です。');
      console.log('   実行権限がGitに記録されない可能性があります。');
      console.log('   修正: git config core.filemode true');
    }
  } catch (e) {
    // Gitリポジトリでない場合は無視
  }
  
  console.log('\n✨ 完了しました！');
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 予期しないエラーが発生しました:', error.message);
  process.exit(1);
});

// 実行
if (require.main === module) {
  main();
}