#!/usr/bin/env node

/**
 * プロジェクトステータス確認スクリプト
 * 現在の開発状況を包括的にチェック
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 色付き出力
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
};

// 実行コマンドのラッパー
function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options });
  } catch (error) {
    if (!options.ignoreError) {
      return null;
    }
    return error.stdout || '';
  }
}

// パッケージ情報
function showPackageInfo() {
  console.log(colors.blue('\n📦 パッケージ情報'));
  console.log('─'.repeat(50));
  
  const packageJson = require('../package.json');
  console.log(`名前: ${colors.cyan(packageJson.name)}`);
  console.log(`バージョン: ${colors.cyan(packageJson.version)}`);
  console.log(`説明: ${packageJson.description}`);
  console.log(`ライセンス: ${packageJson.license}`);
  console.log(`Node.js要件: ${packageJson.engines?.node || 'なし'}`);
}

// Git状態
function showGitStatus() {
  console.log(colors.blue('\n🔄 Git状態'));
  console.log('─'.repeat(50));
  
  const branch = exec('git branch --show-current');
  if (branch) {
    console.log(`現在のブランチ: ${colors.cyan(branch.trim())}`);
    
    const status = exec('git status --porcelain');
    if (status && status.trim()) {
      console.log(colors.yellow('⚠️  未コミットの変更:'));
      console.log(status);
    } else {
      console.log(colors.green('✅ すべての変更がコミット済み'));
    }
    
    // リモートとの差分
    const ahead = exec('git rev-list --count @{u}..HEAD', { ignoreError: true });
    const behind = exec('git rev-list --count HEAD..@{u}', { ignoreError: true });
    
    if (ahead && parseInt(ahead) > 0) {
      console.log(colors.yellow(`⬆️  リモートより ${ahead.trim()} コミット先行`));
    }
    if (behind && parseInt(behind) > 0) {
      console.log(colors.yellow(`⬇️  リモートより ${behind.trim()} コミット遅延`));
    }
    
    // 最新のタグ
    const latestTag = exec('git describe --tags --abbrev=0', { ignoreError: true });
    if (latestTag) {
      console.log(`最新タグ: ${colors.cyan(latestTag.trim())}`);
    }
  } else {
    console.log(colors.red('❌ Gitリポジトリではありません'));
  }
}

// 依存関係の状態
function showDependencies() {
  console.log(colors.blue('\n📚 依存関係'));
  console.log('─'.repeat(50));
  
  // outdatedチェック
  const outdated = exec('npm outdated --json', { ignoreError: true });
  if (outdated) {
    try {
      const outdatedPackages = JSON.parse(outdated);
      const count = Object.keys(outdatedPackages).length;
      if (count > 0) {
        console.log(colors.yellow(`⚠️  ${count} 個の古いパッケージ`));
        Object.entries(outdatedPackages).slice(0, 5).forEach(([name, info]) => {
          console.log(`  ${name}: ${info.current} → ${info.wanted} (最新: ${info.latest})`);
        });
        if (count > 5) {
          console.log(`  ... 他 ${count - 5} 個`);
        }
      } else {
        console.log(colors.green('✅ すべての依存関係が最新'));
      }
    } catch (e) {
      console.log(colors.green('✅ すべての依存関係が最新'));
    }
  }
  
  // セキュリティ監査
  const audit = exec('npm audit --json', { ignoreError: true });
  if (audit) {
    try {
      const auditData = JSON.parse(audit);
      const vulns = auditData.metadata.vulnerabilities;
      const total = vulns.total;
      
      if (total > 0) {
        console.log(colors.red(`\n🚨 セキュリティ脆弱性: ${total} 件`));
        console.log(`  Critical: ${vulns.critical || 0}`);
        console.log(`  High: ${vulns.high || 0}`);
        console.log(`  Moderate: ${vulns.moderate || 0}`);
        console.log(`  Low: ${vulns.low || 0}`);
      } else {
        console.log(colors.green('\n✅ セキュリティ脆弱性なし'));
      }
    } catch (e) {
      console.log(colors.green('\n✅ セキュリティ脆弱性なし'));
    }
  }
}

// ビルド状態
function showBuildStatus() {
  console.log(colors.blue('\n🏗️  ビルド状態'));
  console.log('─'.repeat(50));
  
  // distディレクトリの確認
  if (fs.existsSync('dist')) {
    const stats = fs.statSync('dist');
    const mtime = new Date(stats.mtime);
    const now = new Date();
    const diffHours = Math.floor((now - mtime) / (1000 * 60 * 60));
    
    console.log(colors.green('✅ ビルド済み'));
    console.log(`最終ビルド: ${mtime.toLocaleString()} (${diffHours}時間前)`);
    
    // ビルドサイズ
    const files = exec('find dist -type f -name "*.js" | wc -l', { ignoreError: true });
    if (files) {
      console.log(`ファイル数: ${files.trim()}`);
    }
  } else {
    console.log(colors.red('❌ 未ビルド (distディレクトリなし)'));
  }
  
  // TypeScriptエラーチェック
  console.log('\n📝 TypeScriptチェック...');
  const tscResult = exec('npm run type-check', { ignoreError: true });
  if (tscResult && !tscResult.includes('error')) {
    console.log(colors.green('✅ TypeScriptエラーなし'));
  } else {
    console.log(colors.red('❌ TypeScriptエラーあり'));
  }
}

// テスト状態
function showTestStatus() {
  console.log(colors.blue('\n🧪 テスト状態'));
  console.log('─'.repeat(50));
  
  // カバレッジディレクトリの確認
  if (fs.existsSync('coverage/lcov-report/index.html')) {
    const coverageSummary = path.join('coverage', 'coverage-summary.json');
    if (fs.existsSync(coverageSummary)) {
      try {
        const coverage = JSON.parse(fs.readFileSync(coverageSummary, 'utf8'));
        const total = coverage.total;
        
        console.log('カバレッジ:');
        console.log(`  Statements: ${colors.cyan(total.statements.pct + '%')}`);
        console.log(`  Branches: ${colors.cyan(total.branches.pct + '%')}`);
        console.log(`  Functions: ${colors.cyan(total.functions.pct + '%')}`);
        console.log(`  Lines: ${colors.cyan(total.lines.pct + '%')}`);
      } catch (e) {
        console.log('カバレッジ情報を読み取れません');
      }
    }
  } else {
    console.log(colors.yellow('⚠️  カバレッジレポートなし'));
  }
}

// CI/CD状態
function showCIStatus() {
  console.log(colors.blue('\n🚀 CI/CD状態'));
  console.log('─'.repeat(50));
  
  // GitHub Actions
  const runs = exec('gh run list --limit 5 --json conclusion,status,name,createdAt', { ignoreError: true });
  if (runs) {
    try {
      const runData = JSON.parse(runs);
      if (runData.length > 0) {
        console.log('最近のワークフロー実行:');
        runData.forEach(run => {
          const icon = run.conclusion === 'success' ? '✅' : 
                       run.conclusion === 'failure' ? '❌' :
                       run.status === 'in_progress' ? '⏳' : '❓';
          const date = new Date(run.createdAt).toLocaleString();
          console.log(`  ${icon} ${run.name} - ${date}`);
        });
      }
    } catch (e) {
      console.log('GitHub Actions情報を取得できません');
    }
  } else {
    console.log('GitHub CLI未インストールまたは未認証');
  }
}

// npm公開状態
function showNpmStatus() {
  console.log(colors.blue('\n📤 npm公開状態'));
  console.log('─'.repeat(50));
  
  const packageName = require('../package.json').name;
  const npmInfo = exec(`npm view ${packageName} --json`, { ignoreError: true });
  
  if (npmInfo) {
    try {
      const info = JSON.parse(npmInfo);
      console.log(colors.green('✅ npmに公開済み'));
      console.log(`最新バージョン: ${colors.cyan(info.version)}`);
      console.log(`最終更新: ${new Date(info.time[info.version]).toLocaleString()}`);
      
      // ダウンロード数（npm-stat APIを使用する場合）
      // ここでは簡略化のため省略
    } catch (e) {
      console.log(colors.yellow('⚠️  npmに未公開'));
    }
  } else {
    console.log(colors.yellow('⚠️  npmに未公開'));
  }
}

// TODO/FIXMEチェック
function showTodos() {
  console.log(colors.blue('\n📝 TODO/FIXME'));
  console.log('─'.repeat(50));
  
  const todos = exec('grep -r "TODO\\|FIXME" src/ --include="*.ts" --include="*.js" -n', { ignoreError: true });
  if (todos && todos.trim()) {
    const lines = todos.trim().split('\n');
    console.log(colors.yellow(`${lines.length} 件のTODO/FIXME:`));
    lines.slice(0, 5).forEach(line => {
      console.log(`  ${line}`);
    });
    if (lines.length > 5) {
      console.log(`  ... 他 ${lines.length - 5} 件`);
    }
  } else {
    console.log(colors.green('✅ TODO/FIXMEなし'));
  }
}

// メイン処理
function main() {
  console.log(colors.magenta('═'.repeat(50)));
  console.log(colors.magenta('🔍 DNSweeper CLI プロジェクトステータス'));
  console.log(colors.magenta('═'.repeat(50)));
  
  showPackageInfo();
  showGitStatus();
  showDependencies();
  showBuildStatus();
  showTestStatus();
  showCIStatus();
  showNpmStatus();
  showTodos();
  
  console.log(colors.magenta('\n═'.repeat(50)));
  console.log(colors.green('✨ ステータスチェック完了'));
  
  // 推奨アクション
  console.log(colors.blue('\n💡 推奨アクション:'));
  console.log('- npm run verify : 品質チェック実行');
  console.log('- npm run fix-ci : CIエラー自動修正');
  console.log('- npm run release : リリース作成');
}

// エラーハンドリング付きで実行
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(colors.red(`\n❌ エラー: ${error.message}`));
    process.exit(1);
  }
}