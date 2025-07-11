#!/usr/bin/env node

/**
 * PDCAメトリクス収集スクリプト
 * npm統計、GitHub統計、パフォーマンスデータを収集
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

async function collectMetrics() {
  const metrics = {
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    week: getWeekNumber(),
  };

  // パッケージ情報
  try {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    metrics.package = {
      name: packageJson.name,
      version: packageJson.version,
      dependencies: Object.keys(packageJson.dependencies || {}).length,
      devDependencies: Object.keys(packageJson.devDependencies || {}).length,
    };
  } catch (error) {
    console.error('パッケージ情報の取得に失敗:', error.message);
  }

  // ビルドサイズ
  try {
    const distFiles = await fs.readdir('dist').catch(() => []);
    let totalSize = 0;
    for (const file of distFiles) {
      const stats = await fs.stat(path.join('dist', file));
      totalSize += stats.size;
    }
    metrics.build = {
      size: totalSize,
      sizeKB: Math.round(totalSize / 1024),
      files: distFiles.length,
    };
  } catch (error) {
    console.error('ビルドサイズの取得に失敗:', error.message);
  }

  // Git統計
  try {
    const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
    const contributors = execSync('git shortlog -sn', { encoding: 'utf8' })
      .split('\n')
      .filter(line => line.trim())
      .length;
    
    metrics.git = {
      totalCommits: parseInt(commitCount),
      contributors: contributors,
      branch: execSync('git branch --show-current', { encoding: 'utf8' }).trim(),
    };
  } catch (error) {
    console.error('Git統計の取得に失敗:', error.message);
  }

  // テストカバレッジ（既存のカバレッジレポートから読み取り）
  try {
    const coverageSummary = JSON.parse(
      await fs.readFile('coverage/coverage-summary.json', 'utf8')
    );
    metrics.coverage = {
      lines: coverageSummary.total.lines.pct,
      statements: coverageSummary.total.statements.pct,
      functions: coverageSummary.total.functions.pct,
      branches: coverageSummary.total.branches.pct,
    };
  } catch (error) {
    console.error('カバレッジ情報の取得に失敗:', error.message);
  }

  // メトリクスを保存
  const metricsDir = path.join('.pdca', 'metrics');
  await fs.mkdir(metricsDir, { recursive: true });
  
  const filename = path.join(metricsDir, `${metrics.date}-metrics.json`);
  await fs.writeFile(filename, JSON.stringify(metrics, null, 2));
  
  console.log('メトリクス収集完了:', filename);
  return metrics;
}

function getWeekNumber() {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date - firstDay) / 86400000;
  return `${date.getFullYear()}-W${Math.ceil((pastDays + firstDay.getDay() + 1) / 7).toString().padStart(2, '0')}`;
}

// DORAメトリクス計算
async function calculateDoraMetrics() {
  const dora = {};

  try {
    // デプロイメント頻度（簡易版：package.jsonのバージョン変更を追跡）
    const versionChanges = execSync(
      'git log --since="1 week ago" --grep="version" --oneline | wc -l',
      { encoding: 'utf8' }
    ).trim();
    dora.deploymentFrequency = parseInt(versionChanges) || 0;

    // リードタイム（簡易版：PRの平均マージ時間）
    // 実際の実装ではGitHub APIを使用
    dora.leadTime = 'N/A (GitHub API required)';

    // MTTR（簡易版：fix commitの間隔）
    const fixCommits = execSync(
      'git log --since="1 month ago" --grep="fix" --pretty=format:"%ct"',
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);
    
    if (fixCommits.length > 1) {
      const intervals = [];
      for (let i = 1; i < fixCommits.length; i++) {
        intervals.push(parseInt(fixCommits[i-1]) - parseInt(fixCommits[i]));
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      dora.mttr = Math.round(avgInterval / 3600) + ' hours';
    } else {
      dora.mttr = 'N/A';
    }

    // 変更失敗率（簡易版：revert commitの割合）
    const totalCommits = execSync('git rev-list --count HEAD --since="1 month ago"', { encoding: 'utf8' }).trim();
    const revertCommits = execSync('git log --since="1 month ago" --grep="revert" --oneline | wc -l', { encoding: 'utf8' }).trim();
    dora.changeFailureRate = ((parseInt(revertCommits) / parseInt(totalCommits)) * 100).toFixed(2) + '%';

  } catch (error) {
    console.error('DORAメトリクスの計算に失敗:', error.message);
  }

  return dora;
}

// メイン実行
async function main() {
  try {
    const metrics = await collectMetrics();
    const doraMetrics = await calculateDoraMetrics();
    
    // 結果を表示
    console.log('\n📊 収集されたメトリクス:');
    console.log(JSON.stringify({ ...metrics, dora: doraMetrics }, null, 2));
    
    // GitHub Actions用の出力
    if (process.env.GITHUB_OUTPUT) {
      const output = [
        `metrics_collected=true`,
        `test_coverage=${metrics.coverage?.lines || 0}`,
        `build_size_kb=${metrics.build?.sizeKB || 0}`,
        `total_commits=${metrics.git?.totalCommits || 0}`,
        `deployment_frequency=${doraMetrics.deploymentFrequency}`,
        `change_failure_rate=${doraMetrics.changeFailureRate}`,
      ].join('\n');
      
      await fs.appendFile(process.env.GITHUB_OUTPUT, output);
    }
    
  } catch (error) {
    console.error('メトリクス収集エラー:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}