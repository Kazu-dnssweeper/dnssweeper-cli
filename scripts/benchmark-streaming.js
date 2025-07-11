#!/usr/bin/env node

/**
 * ストリーミング処理のベンチマークスクリプト
 * 通常モードとストリーミングモードのパフォーマンスを比較
 */

const { spawn } = require('child_process');
const path = require('path');

// メモリ使用量を監視
function monitorMemory(processName, pid) {
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  const memoryStats = {
    peak: startMemory,
    samples: []
  };

  const interval = setInterval(() => {
    try {
      const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      memoryStats.samples.push(currentMemory);
      if (currentMemory > memoryStats.peak) {
        memoryStats.peak = currentMemory;
      }
    } catch (error) {
      clearInterval(interval);
    }
  }, 100);

  return {
    stop: () => {
      clearInterval(interval);
      return memoryStats;
    }
  };
}

// コマンドを実行してベンチマーク
async function runBenchmark(command, args, label) {
  console.log(`\n📊 ${label}`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  const monitor = monitorMemory(label);
  
  return new Promise((resolve) => {
    const child = spawn('node', [command, ...args], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });

    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      const memoryStats = monitor.stop();
      
      // 結果から統計情報を抽出
      const totalRecordsMatch = output.match(/総レコード数:\s*(\d+)/);
      const totalRecords = totalRecordsMatch ? parseInt(totalRecordsMatch[1]) : 0;
      
      console.log(`✅ 完了`);
      console.log(`  - 処理時間: ${duration.toFixed(2)}秒`);
      console.log(`  - レコード数: ${totalRecords.toLocaleString()}`);
      console.log(`  - 処理速度: ${Math.round(totalRecords / duration).toLocaleString()} レコード/秒`);
      console.log(`  - ピークメモリ: ${memoryStats.peak.toFixed(1)} MB`);
      console.log(`  - 平均メモリ: ${(memoryStats.samples.reduce((a, b) => a + b, 0) / memoryStats.samples.length).toFixed(1)} MB`);
      console.log(`  - 終了コード: ${code}`);
      
      if (errorOutput) {
        console.log(`  - エラー: ${errorOutput}`);
      }
      
      resolve({
        label,
        duration,
        totalRecords,
        peakMemory: memoryStats.peak,
        exitCode: code
      });
    });
  });
}

// メイン処理
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
使用方法: node benchmark-streaming.js <CSVファイル>

例:
  node benchmark-streaming.js test-data/large/large-100000.csv
  node benchmark-streaming.js test-data/large/large-1000000.csv
    `);
    process.exit(0);
  }
  
  const csvFile = args[0];
  const fs = require('fs');
  
  if (!fs.existsSync(csvFile)) {
    console.error(`❌ エラー: ファイルが見つかりません: ${csvFile}`);
    process.exit(1);
  }
  
  const fileSize = fs.statSync(csvFile).size;
  console.log('🔧 ストリーミング処理ベンチマーク');
  console.log('================================');
  console.log(`📁 対象ファイル: ${csvFile}`);
  console.log(`📏 ファイルサイズ: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
  
  // 通常モード
  const normalResult = await runBenchmark(
    'dist/index.js',
    ['analyze', csvFile, '--output', 'table'],
    '通常モード'
  );
  
  // ストリーミングモード
  const streamResult = await runBenchmark(
    'dist/index.js',
    ['analyze', csvFile, '--stream', '--output', 'table'],
    'ストリーミングモード'
  );
  
  // 比較結果
  console.log('\n📈 比較結果');
  console.log('='.repeat(60));
  console.log(`処理時間の改善: ${((1 - streamResult.duration / normalResult.duration) * 100).toFixed(1)}%`);
  console.log(`メモリ使用量の改善: ${((1 - streamResult.peakMemory / normalResult.peakMemory) * 100).toFixed(1)}%`);
  
  // より大きなファイルの推奨
  if (fileSize < 50 * 1024 * 1024) {
    console.log('\n💡 ヒント: より大きなファイルでテストすると、ストリーミングの効果がより顕著に現れます。');
    console.log('   例: node scripts/generate-large-test-data.js 1000000');
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});

// 実行
main();