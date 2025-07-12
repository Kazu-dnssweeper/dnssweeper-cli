#!/usr/bin/env node

const DNSResolver = require('./src/dns_resolver');

// DNSリゾルバーのインスタンスを作成
const resolver = new DNSResolver();

// テストケース: 国際化ドメイン名
const testDomains = [
  '日本.jp',          // 日本語ドメイン
  '中国.中国',        // 中国語ドメイン  
  'пример.рф',        // ロシア語ドメイン
  'example.com',      // 通常のASCIIドメイン
  'google.com'        // 実在するドメイン
];

console.log('DNSweeper CLI - bug-001 修正確認');
console.log('=================================');
console.log('国際化ドメイン名（IDN）の解決テスト\n');

// 各ドメインを解決
async function runTests() {
  for (const domain of testDomains) {
    console.log(`\nテスト中: ${domain}`);
    console.log('-'.repeat(40));
    
    try {
      const result = await resolver.resolve(domain);
      
      console.log(`元のドメイン: ${result.domain}`);
      console.log(`Punycode変換: ${result.asciiDomain}`);
      console.log(`解決成功: ${result.resolved ? '✓' : '✗'}`);
      
      if (result.resolved) {
        console.log(`IPアドレス: ${result.addresses.join(', ')}`);
      } else {
        console.log(`エラー: ${result.error}`);
      }
    } catch (error) {
      console.error(`予期しないエラー: ${error.message}`);
    }
  }
  
  console.log('\n=================================');
  console.log('テスト完了');
}

// テストを実行
runTests().catch(console.error);