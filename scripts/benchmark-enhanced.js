#!/usr/bin/env node

/**
 * 強化版ストリーミングのベンチマークスクリプト
 * 各モードのパフォーマンスを比較
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// ベンチマーク設定
const testFiles = [
  { name: '10万件', file: 'test-data/large/100k-records.csv', size: '10MB' },
  { name: '100万件', file: 'test-data/large/1m-records.csv', size: '83.4MB' },
  { name: '1000万件', file: 'test-data/large/10m-records.csv', size: '834MB' },
];

const modes = [
  { 
    name: '通常モード', 
    command: 'npx ts-node src/index.ts analyze',
    options: '',
    color: chalk.gray,
  },
  { 
    name: 'ストリーミング', 
    command: 'npx ts-node src/index.ts analyze',
    options: '--stream',
    color: chalk.blue,
  },
  { 
    name: '最適化ストリーミング', 
    command: 'npx ts-node src/index.ts analyze',
    options: '--stream --memory-limit 50',
    color: chalk.green,
  },
  { 
    name: '強化ストリーミング', 
    command: 'npx ts-node src/index.ts analyze',
    options: '--enhanced',
    color: chalk.magenta,
  },
  { 
    name: '強化+適応的チャンク', 
    command: 'npx ts-node src/index.ts analyze',
    options: '--enhanced --adaptive-chunking',
    color: chalk.cyan,
  },
  { 
    name: '強化+並列度5', 
    command: 'npx ts-node src/index.ts analyze',
    options: '--enhanced --parallelism 5',
    color: chalk.yellow,
  },
];

// メモリ使用量を測定する関数
function measureMemoryUsage(command) {
  if (process.platform === 'win32') {
    // Windowsでのメモリ測定（簡易版）
    return 0;
  }
  
  try {
    // /usr/bin/time -l (macOS) または /usr/bin/time -v (Linux)
    const timeCmd = process.platform === 'darwin' ? 'gtime -l' : '/usr/bin/time -v';
    const output = execSync(`${timeCmd} ${command} 2>&1`, { encoding: 'utf8' });
    
    // メモリ使用量を抽出
    const memMatch = output.match(/maximum resident set size[:\s]+(\d+)/i);
    if (memMatch) {
      // KB to MB
      return Math.round(parseInt(memMatch[1]) / 1024);
    }
  } catch (error) {
    // エラーは無視
  }
  
  return 0;
}

// ベンチマーク実行
async function runBenchmark() {
  console.log(chalk.bold.blue('🚀 DNSweeper 強化ストリーミング ベンチマーク'));
  console.log(chalk.gray('='.repeat(80)));
  console.log();

  const results = [];

  for (const testFile of testFiles) {
    // ファイルが存在するか確認
    const filePath = path.join(process.cwd(), testFile.file);
    if (!fs.existsSync(filePath)) {
      console.log(chalk.yellow(`⚠️  ${testFile.name} のテストファイルが見つかりません`));
      console.log(chalk.gray(`   ${filePath}`));
      console.log(chalk.gray('   scripts/generate-large-test-data.js を実行してテストデータを生成してください'));
      console.log();
      continue;
    }

    console.log(chalk.bold(`📊 ${testFile.name} (${testFile.size})`));
    console.log(chalk.gray('-'.repeat(60)));

    const fileResults = {
      file: testFile.name,
      results: {},
    };

    for (const mode of modes) {
      process.stdout.write(mode.color(`  ${mode.name.padEnd(25)}`));

      try {
        // コマンド構築
        const fullCommand = `${mode.command} ${filePath} ${mode.options} --output json`;
        
        // 実行時間測定
        const startTime = Date.now();
        const output = execSync(fullCommand, { 
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024, // 10MB
          stdio: ['pipe', 'pipe', 'ignore'], // stderrを無視
        });
        const endTime = Date.now();
        const executionTime = (endTime - startTime) / 1000;

        // メモリ使用量測定（簡易版）
        const memoryUsage = measureMemoryUsage(fullCommand);

        // 結果から統計を抽出
        let throughput = 0;
        let recordCount = 0;
        
        try {
          // JSON出力から情報を抽出
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            recordCount = data.summary?.totalRecords || 0;
            throughput = recordCount / executionTime;
          }
        } catch (e) {
          // JSON解析エラーは無視
        }

        // 結果を保存
        fileResults.results[mode.name] = {
          time: executionTime,
          memory: memoryUsage,
          throughput: Math.round(throughput),
          success: true,
        };

        // 結果表示
        console.log(mode.color(
          `時間: ${executionTime.toFixed(2)}秒`.padEnd(20) +
          `メモリ: ${memoryUsage || 'N/A'}MB`.padEnd(15) +
          `速度: ${throughput ? Math.round(throughput).toLocaleString() + ' rec/s' : 'N/A'}`
        ));

      } catch (error) {
        fileResults.results[mode.name] = {
          time: 0,
          memory: 0,
          throughput: 0,
          success: false,
          error: error.message,
        };
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
  console.log(chalk.bold.blue('📈 ベンチマーク結果サマリー'));
  console.log(chalk.gray('='.repeat(80)));
  console.log();

  // 各ファイルサイズでの最速モードを特定
  for (const fileResult of results) {
    console.log(chalk.bold(`${fileResult.file}:`));
    
    const successfulModes = Object.entries(fileResult.results)
      .filter(([_, result]) => result.success)
      .sort((a, b) => a[1].time - b[1].time);

    if (successfulModes.length > 0) {
      const [fastestMode, fastestResult] = successfulModes[0];
      const [slowestMode, slowestResult] = successfulModes[successfulModes.length - 1];
      
      console.log(chalk.green(`  🥇 最速: ${fastestMode} (${fastestResult.time.toFixed(2)}秒)`));
      
      if (fastestResult.throughput) {
        console.log(chalk.gray(`     スループット: ${fastestResult.throughput.toLocaleString()} records/sec`));
      }
      
      // 改善率
      if (slowestMode !== fastestMode) {
        const improvement = ((slowestResult.time - fastestResult.time) / slowestResult.time * 100).toFixed(1);
        console.log(chalk.gray(`     ${slowestMode}比: ${improvement}% 高速化`));
      }
    }
    console.log();
  }

  // 推奨設定
  console.log(chalk.bold.yellow('💡 推奨設定:'));
  console.log(chalk.gray('  - 10万件以下: 通常モード（シンプルで高速）'));
  console.log(chalk.gray('  - 10万〜100万件: 強化ストリーミング'));
  console.log(chalk.gray('  - 100万件以上: 強化ストリーミング + 適応的チャンク'));
  console.log(chalk.gray('  - メモリ制限環境: 最適化ストリーミング（--memory-limit 50）'));
  console.log();
}

// 実行
console.log();
runBenchmark().catch(error => {
  console.error(chalk.red('ベンチマークエラー:'), error);
  process.exit(1);
});