#!/usr/bin/env node

/**
 * 分散処理のベンチマークスクリプト
 * ワーカー数とファイルサイズによるパフォーマンス比較
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const os = require('os');

// ベンチマーク設定
const testFiles = [
  { name: '100万件', file: 'test-data/large/1m-records.csv', size: '83.4MB' },
  { name: '1000万件', file: 'test-data/large/10m-records.csv', size: '834MB' },
];

const maxCores = os.cpus().length;
const workerCounts = [1, 2, Math.floor(maxCores / 2), maxCores - 1, maxCores];

// ベンチマーク実行
async function runBenchmark() {
  console.log(chalk.bold.blue('🚀 DNSweeper 分散処理 ベンチマーク'));
  console.log(chalk.gray('='.repeat(80)));
  console.log(chalk.gray(`システム: ${os.platform()} | CPUコア数: ${maxCores}`));
  console.log();

  const results = [];

  for (const testFile of testFiles) {
    // ファイルが存在するか確認
    const filePath = path.join(process.cwd(), testFile.file);
    if (!fs.existsSync(filePath)) {
      console.log(chalk.yellow(`⚠️  ${testFile.name} のテストファイルが見つかりません`));
      console.log(chalk.gray(`   scripts/generate-large-test-data.js を実行してテストデータを生成してください`));
      console.log();
      continue;
    }

    console.log(chalk.bold(`📊 ${testFile.name} (${testFile.size})`));
    console.log(chalk.gray('-'.repeat(60)));

    const fileResults = {
      file: testFile.name,
      results: {},
    };

    // 通常モード（ベースライン）
    console.log(chalk.gray('  通常モード（ベースライン）'));
    try {
      const startTime = Date.now();
      execSync(`npx ts-node src/index.ts analyze ${filePath} --output json`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const baselineTime = (Date.now() - startTime) / 1000;
      
      fileResults.baseline = baselineTime;
      console.log(chalk.gray(`    時間: ${baselineTime.toFixed(2)}秒`));
    } catch (error) {
      fileResults.baseline = null;
      console.log(chalk.red('    エラー'));
    }

    console.log();

    // 分散処理モード（各ワーカー数）
    for (const workers of workerCounts) {
      if (workers > maxCores) continue;
      
      process.stdout.write(chalk.cyan(`  分散処理（${workers}ワーカー）`.padEnd(30)));

      try {
        const startTime = Date.now();
        const output = execSync(
          `npx ts-node src/index.ts analyze ${filePath} --distributed --workers ${workers} --output json`,
          {
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: ['pipe', 'pipe', 'ignore'],
          }
        );
        const executionTime = (Date.now() - startTime) / 1000;

        // 統計情報を抽出
        let stats = {};
        try {
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            stats = {
              totalRecords: data.summary?.totalRecords || 0,
              throughput: data.stats?.avgThroughput || 0,
            };
          }
        } catch (e) {
          // JSON解析エラーは無視
        }

        fileResults.results[`${workers}workers`] = {
          time: executionTime,
          throughput: stats.throughput,
          speedup: fileResults.baseline ? (fileResults.baseline / executionTime).toFixed(2) : null,
        };

        // 結果表示
        console.log(chalk.cyan(
          `時間: ${executionTime.toFixed(2)}秒`.padEnd(20) +
          `速度: ${stats.throughput ? Math.round(stats.throughput).toLocaleString() + ' rec/s' : 'N/A'}`.padEnd(20) +
          `高速化: ${fileResults.baseline ? (fileResults.baseline / executionTime).toFixed(2) + 'x' : 'N/A'}`
        ));

      } catch (error) {
        fileResults.results[`${workers}workers`] = { error: true };
        console.log(chalk.red('エラー'));
      }
    }

    results.push(fileResults);
    console.log();
  }

  // サマリー表示
  displaySummary(results);
}

// サマリー表示
function displaySummary(results) {
  console.log(chalk.bold.blue('📈 分散処理ベンチマーク結果サマリー'));
  console.log(chalk.gray('='.repeat(80)));
  console.log();

  for (const fileResult of results) {
    if (!fileResult.baseline) continue;
    
    console.log(chalk.bold(`${fileResult.file}:`));
    console.log(chalk.gray(`  ベースライン（通常モード）: ${fileResult.baseline.toFixed(2)}秒`));
    
    // 最適なワーカー数を特定
    let bestWorkers = null;
    let bestTime = fileResult.baseline;
    
    for (const [key, result] of Object.entries(fileResult.results)) {
      if (!result.error && result.time < bestTime) {
        bestTime = result.time;
        bestWorkers = key;
      }
    }
    
    if (bestWorkers) {
      const speedup = (fileResult.baseline / bestTime).toFixed(2);
      console.log(chalk.green(`  🥇 最速: ${bestWorkers} (${bestTime.toFixed(2)}秒, ${speedup}x高速化)`));
    }
    
    console.log();
  }

  // スケーラビリティグラフ（簡易版）
  console.log(chalk.bold.yellow('📊 スケーラビリティ:'));
  console.log(chalk.gray('  ワーカー数が増えるにつれて、パフォーマンスが向上します'));
  console.log(chalk.gray('  ただし、CPUコア数を超えると効果が頭打ちになります'));
  console.log();
  
  // 推奨設定
  console.log(chalk.bold.yellow('💡 推奨設定:'));
  console.log(chalk.gray(`  - 最適なワーカー数: CPUコア数 - 1 (${maxCores - 1})`));
  console.log(chalk.gray('  - 10GB以上のファイル: 分散処理モードを強く推奨'));
  console.log(chalk.gray('  - メモリに余裕がある場合: チャンクサイズを大きく（--chunk-size 10000）'));
  console.log();
}

// 実行
console.log();
runBenchmark().catch(error => {
  console.error(chalk.red('ベンチマークエラー:'), error);
  process.exit(1);
});