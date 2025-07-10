#!/usr/bin/env node

/**
 * Claude セッションルール自動チェックスクリプト
 * 開発ルール遵守の自動化をサポート
 */

const fs = require('fs');
const path = require('path');

// 終了キーワードのパターン
const END_KEYWORDS = [
  '終わる', '終了', 'お疲れ', '完了', 'finish', 'done', 'bye',
  '終わり', '切り上げ', '作業終了', 'end'
];

// 開始キーワードのパターン  
const START_KEYWORDS = [
  '続きから', '再開', '開始', '始める', 'start', 'continue',
  '作業開始', 'はじめる', '継続'
];

// 禁止キーワードのパターン
const FORBIDDEN_KEYWORDS = [
  'new Date()', 'console.log', '削除機能', 'delete function',
  'rm -', 'unlink', '削除処理'
];

/**
 * テキストから終了キーワードを検出
 */
function detectEndKeywords(text) {
  const lowerText = text.toLowerCase();
  return END_KEYWORDS.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * テキストから開始キーワードを検出
 */
function detectStartKeywords(text) {
  const lowerText = text.toLowerCase();
  return START_KEYWORDS.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * テキストから禁止キーワードを検出
 */
function detectForbiddenKeywords(text) {
  const foundKeywords = [];
  FORBIDDEN_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  });
  return foundKeywords;
}

/**
 * context.mdの更新が必要かチェック
 */
function checkContextUpdateNeeded() {
  const contextPath = path.join(__dirname, '../dnssweeper-context.md');
  try {
    const stats = fs.statSync(contextPath);
    const now = new Date();
    const lastModified = stats.mtime;
    const hoursSinceUpdate = (now - lastModified) / (1000 * 60 * 60);
    
    return {
      needsUpdate: hoursSinceUpdate > 1, // 1時間以上更新されていない
      lastModified: lastModified.toISOString(),
      hoursSinceUpdate: Math.round(hoursSinceUpdate * 10) / 10
    };
  } catch (error) {
    return {
      needsUpdate: true,
      error: 'context.mdが見つかりません'
    };
  }
}

/**
 * 開発ルール遵守チェック
 */
function checkDevelopmentRules() {
  const results = {
    typescript: false,
    eslint: false,
    patterns: false,
    testData: false
  };
  
  // TypeScript設定チェック
  const tsconfigPath = path.join(__dirname, '../tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    results.typescript = tsconfig.compilerOptions?.strict === true;
  }
  
  // ESLint設定チェック
  const eslintPath = path.join(__dirname, '../.eslintrc.js');
  results.eslint = fs.existsSync(eslintPath);
  
  // patterns.jsonチェック
  const patternsPath = path.join(__dirname, '../patterns.json');
  results.patterns = fs.existsSync(patternsPath);
  
  // test-dataチェック
  const testDataPath = path.join(__dirname, '../test-data');
  results.testData = fs.existsSync(testDataPath);
  
  return results;
}

// コマンドライン引数での実行
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const text = args[1] || '';
  
  switch (command) {
    case 'check-end':
      console.log(detectEndKeywords(text));
      break;
    case 'check-start':
      console.log(detectStartKeywords(text));
      break;
    case 'check-forbidden':
      const forbidden = detectForbiddenKeywords(text);
      console.log(JSON.stringify(forbidden));
      break;
    case 'check-context':
      console.log(JSON.stringify(checkContextUpdateNeeded()));
      break;
    case 'check-rules':
      console.log(JSON.stringify(checkDevelopmentRules()));
      break;
    default:
      console.log('使用方法:');
      console.log('node session-check.js check-end "終わる"');
      console.log('node session-check.js check-start "続きから"');
      console.log('node session-check.js check-forbidden "new Date()"');
      console.log('node session-check.js check-context');
      console.log('node session-check.js check-rules');
  }
}

module.exports = {
  detectEndKeywords,
  detectStartKeywords,
  detectForbiddenKeywords,
  checkContextUpdateNeeded,
  checkDevelopmentRules
};