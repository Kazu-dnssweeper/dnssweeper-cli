#!/usr/bin/env node

/**
 * 大規模テストデータ生成スクリプト
 * ストリーミング処理のテスト用に大量のDNSレコードを生成
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// レコードテンプレート
const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS'];
const prefixes = ['www', 'mail', 'ftp', 'api', 'blog', 'shop', 'admin', 'test', 'dev', 'staging', 'old', 'backup', 'temp'];
const domains = ['example.com', 'test.com', 'demo.com', 'sample.com'];

/**
 * ランダムなIPアドレスを生成
 */
function generateRandomIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

/**
 * ランダムな日付を生成（過去2年間）
 */
function generateRandomDate() {
  const now = Date.now();
  const twoYearsAgo = now - (2 * 365 * 24 * 60 * 60 * 1000);
  const randomTime = twoYearsAgo + Math.random() * (now - twoYearsAgo);
  return new Date(randomTime).toISOString();
}

/**
 * DNSレコードを生成
 */
function generateRecord(index) {
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const type = recordTypes[Math.floor(Math.random() * recordTypes.length)];
  const created = generateRandomDate();
  const modified = generateRandomDate();
  
  let content;
  switch (type) {
    case 'A':
      content = generateRandomIP();
      break;
    case 'AAAA':
      content = `2001:db8::${Math.floor(Math.random() * 65535).toString(16)}`;
      break;
    case 'CNAME':
      content = `${prefix}.${domain}`;
      break;
    case 'MX':
      content = `${Math.floor(Math.random() * 50)} mail.${domain}`;
      break;
    case 'TXT':
      content = `v=spf1 include:_spf.${domain} ~all`;
      break;
    case 'SRV':
      content = `0 5 5060 sipserver.${domain}`;
      break;
    case 'NS':
      content = `ns${Math.floor(Math.random() * 4) + 1}.${domain}`;
      break;
    default:
      content = generateRandomIP();
  }

  return {
    Name: `${prefix}-${index}.${domain}`,
    Type: type,
    Content: content,
    TTL: Math.floor(Math.random() * 86400) + 300,
    Proxied: Math.random() > 0.5 ? 'true' : 'false',
    Created: created,
    Modified: modified,
  };
}

/**
 * CSVファイルを生成
 */
async function generateCSV(recordCount, outputFile) {
  console.log(`📝 ${recordCount.toLocaleString()}件のレコードを生成中...`);
  
  const startTime = performance.now();
  const writeStream = fs.createWriteStream(outputFile);
  
  // ヘッダー
  writeStream.write('Name,Type,Content,TTL,Proxied,Created,Modified\n');
  
  // バッファリング用
  const batchSize = 1000;
  let buffer = [];
  
  for (let i = 0; i < recordCount; i++) {
    const record = generateRecord(i);
    const line = `${record.Name},${record.Type},${record.Content},${record.TTL},${record.Proxied},${record.Created},${record.Modified}\n`;
    buffer.push(line);
    
    // バッチで書き込み
    if (buffer.length >= batchSize) {
      writeStream.write(buffer.join(''));
      buffer = [];
      
      // 進捗表示
      if (i % 10000 === 0 && i > 0) {
        const progress = ((i / recordCount) * 100).toFixed(1);
        process.stdout.write(`\r  進捗: ${progress}% (${i.toLocaleString()}/${recordCount.toLocaleString()})`);
      }
    }
  }
  
  // 残りのバッファを書き込み
  if (buffer.length > 0) {
    writeStream.write(buffer.join(''));
  }
  
  await new Promise((resolve) => writeStream.end(resolve));
  
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  const fileSize = fs.statSync(outputFile).size;
  
  console.log(`\n✅ 生成完了！`);
  console.log(`  - ファイル: ${outputFile}`);
  console.log(`  - レコード数: ${recordCount.toLocaleString()}`);
  console.log(`  - ファイルサイズ: ${formatFileSize(fileSize)}`);
  console.log(`  - 生成時間: ${duration}秒`);
  console.log(`  - 生成速度: ${Math.round(recordCount / duration).toLocaleString()} レコード/秒`);
}

/**
 * ファイルサイズをフォーマット
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// メイン処理
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
使用方法: node generate-large-test-data.js <レコード数> [出力ファイル]

例:
  node generate-large-test-data.js 10000              # 1万件
  node generate-large-test-data.js 100000             # 10万件
  node generate-large-test-data.js 1000000            # 100万件
  node generate-large-test-data.js 1000000 big.csv    # ファイル名指定
    `);
    process.exit(0);
  }
  
  const recordCount = parseInt(args[0]);
  if (isNaN(recordCount) || recordCount <= 0) {
    console.error('❌ エラー: レコード数は正の整数で指定してください');
    process.exit(1);
  }
  
  const outputDir = path.join(__dirname, '..', 'test-data', 'large');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFile = args[1] || path.join(outputDir, `large-${recordCount}.csv`);
  
  console.log('🔧 大規模テストデータ生成ツール');
  console.log('================================');
  
  await generateCSV(recordCount, outputFile);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});

// 実行
main();