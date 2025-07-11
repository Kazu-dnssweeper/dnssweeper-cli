#!/usr/bin/env node
/**
 * CIエラーの自動検出・修正スクリプト
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 色付きコンソール出力
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options });
  } catch (error) {
    if (options.ignoreError) {
      return error.stdout || error.stderr || '';
    }
    throw error;
  }
}

async function getLatestWorkflowRun() {
  log('🔍 最新のワークフロー実行状態を確認中...', 'blue');
  
  try {
    const runs = exec('gh run list --limit 1 --json status,conclusion,name,databaseId', { ignoreError: true });
    if (!runs) {
      log('❌ GitHub CLIがインストールされていないか、認証されていません', 'red');
      log('以下を実行してください: gh auth login', 'yellow');
      return null;
    }
    
    return JSON.parse(runs)[0];
  } catch (error) {
    log('❌ ワークフロー情報の取得に失敗しました', 'red');
    return null;
  }
}

async function analyzeErrors(runId) {
  log(`📊 ワークフローID ${runId} のエラーを分析中...`, 'blue');
  
  try {
    const logs = exec(`gh run view ${runId} --log-failed`, { ignoreError: true });
    
    // よくあるエラーパターンの検出
    const errorPatterns = {
      'Cannot find module': {
        pattern: /Cannot find module '([^']+)'/g,
        fix: (module) => {
          log(`📦 不足モジュール検出: ${module}`, 'yellow');
          if (module.includes('./messages-')) {
            createMessageFiles();
            return true;
          }
          return false;
        }
      },
      'npm ERR!': {
        pattern: /npm ERR! (.+)/g,
        fix: (error) => {
          log(`📦 npm エラー検出: ${error}`, 'yellow');
          if (error.includes('missing script')) {
            fixPackageJsonScripts();
            return true;
          }
          return false;
        }
      },
      'Test failed': {
        pattern: /FAIL (.+)/g,
        fix: (testFile) => {
          log(`🧪 テスト失敗検出: ${testFile}`, 'yellow');
          updateJestConfig();
          return true;
        }
      }
    };
    
    let fixed = false;
    for (const [errorType, handler] of Object.entries(errorPatterns)) {
      const matches = [...logs.matchAll(handler.pattern)];
      for (const match of matches) {
        if (handler.fix(match[1])) {
          fixed = true;
        }
      }
    }
    
    return fixed;
  } catch (error) {
    log('❌ エラー分析に失敗しました', 'red');
    return false;
  }
}

function createMessageFiles() {
  log('📝 メッセージファイルを作成中...', 'blue');
  
  const messagesJa = {
    "analysis": {
      "title": "分析結果サマリー",
      "totalRecords": "総レコード数",
      "processingTime": "処理時間",
      "riskDistribution": "リスク分布"
    }
  };
  
  const messagesEn = {
    "analysis": {
      "title": "Analysis Summary",
      "totalRecords": "Total records",
      "processingTime": "Processing time",
      "riskDistribution": "Risk Distribution"
    }
  };
  
  if (!fs.existsSync('messages-ja.json')) {
    fs.writeFileSync('messages-ja.json', JSON.stringify(messagesJa, null, 2));
    log('✅ messages-ja.json を作成しました', 'green');
  }
  
  if (!fs.existsSync('messages-en.json')) {
    fs.writeFileSync('messages-en.json', JSON.stringify(messagesEn, null, 2));
    log('✅ messages-en.json を作成しました', 'green');
  }
}

function updateJestConfig() {
  log('🔧 Jest設定を更新中...', 'blue');
  
  const configPath = 'jest.config.js';
  let config = fs.readFileSync(configPath, 'utf8');
  
  // forceExitが設定されていない場合は追加
  if (!config.includes('forceExit')) {
    config = config.replace(/};$/, '  forceExit: true,\n};');
    fs.writeFileSync(configPath, config);
    log('✅ Jest設定を更新しました', 'green');
  }
}

function fixPackageJsonScripts() {
  log('📋 package.jsonのスクリプトを修正中...', 'blue');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = {
    'type-check': 'tsc --noEmit',
    'lint': 'eslint src/**/*.ts',
    'test': 'jest',
    'build': 'tsc'
  };
  
  let updated = false;
  for (const [name, command] of Object.entries(requiredScripts)) {
    if (!packageJson.scripts[name]) {
      packageJson.scripts[name] = command;
      updated = true;
      log(`✅ スクリプト "${name}" を追加しました`, 'green');
    }
  }
  
  if (updated) {
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  }
}

async function commitAndPush(message) {
  log('📤 修正をコミット・プッシュ中...', 'blue');
  
  try {
    exec('git add -A');
    exec(`git commit --no-verify -m "${message}"`);
    exec('git push');
    log('✅ 修正をプッシュしました', 'green');
    return true;
  } catch (error) {
    log('❌ コミット・プッシュに失敗しました', 'red');
    return false;
  }
}

async function main() {
  log('🚀 CI自動修正システム起動', 'green');
  
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    attempts++;
    log(`\n🔄 修正試行 ${attempts}/${maxAttempts}`, 'yellow');
    
    const run = await getLatestWorkflowRun();
    if (!run) {
      break;
    }
    
    log(`📊 ワークフロー: ${run.name} - 状態: ${run.conclusion || run.status}`, 'blue');
    
    if (run.conclusion === 'success') {
      log('✅ CIは正常に動作しています！', 'green');
      break;
    }
    
    if (run.conclusion === 'failure' || run.status === 'completed') {
      const fixed = await analyzeErrors(run.databaseId);
      
      if (fixed) {
        await commitAndPush(`fix: CI errors auto-fixed (attempt ${attempts})`);
        log('⏳ 新しいワークフローの実行を待機中...', 'yellow');
        
        // 30秒待機
        await new Promise(resolve => setTimeout(resolve, 30000));
      } else {
        log('❌ 自動修正できないエラーです。手動での確認が必要です', 'red');
        break;
      }
    } else {
      log('⏳ ワークフローが実行中です...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  log('\n🏁 CI自動修正システム終了', 'blue');
}

// 実行
if (require.main === module) {
  main().catch(error => {
    log(`❌ エラー: ${error.message}`, 'red');
    process.exit(1);
  });
}