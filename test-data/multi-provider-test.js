/**
 * マルチプロバイダー機能の統合テスト
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 マルチプロバイダー機能の統合テストを開始...\n');

// テスト用のCSVファイルパス
const testFiles = {
  cloudflare: path.join(__dirname, 'cloudflare-sample.csv'),
  route53: path.join(__dirname, 'route53-sample.csv'),
  azure: path.join(__dirname, 'azure-sample.csv'),
  onamae: path.join(__dirname, 'onamae-sample.csv'),
};

// CLIコマンドのパス
const CLI_PATH = path.join(__dirname, '..', 'dist', 'index.js');

// ビルドが必要な場合
try {
  console.log('📦 プロジェクトをビルド中...');
  execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  console.log('✅ ビルド完了\n');
} catch (error) {
  console.error('❌ ビルドエラー:', error.message);
  process.exit(1);
}

// 各プロバイダーのテスト
Object.entries(testFiles).forEach(([provider, filePath]) => {
  console.log(`\n📋 ${provider.toUpperCase()}のテスト:`);
  console.log('─'.repeat(50));
  
  try {
    // ファイルの存在確認
    if (!fs.existsSync(filePath)) {
      console.error(`❌ テストファイルが見つかりません: ${filePath}`);
      return;
    }
    
    // 自動検出でのテスト
    console.log('\n1. 自動検出モード:');
    const autoCommand = `node "${CLI_PATH}" analyze "${filePath}" --output json 2>/dev/null`;
    const autoResult = execSync(autoCommand, { encoding: 'utf8', shell: true });
    const autoData = JSON.parse(autoResult);
    
    console.log(`   ✅ 検出されたプロバイダー: ${autoData.summary?.detectedProvider || '不明'}`);
    console.log(`   ✅ 分析されたレコード数: ${autoData.summary?.totalRecords || 0}`);
    
    // 明示的なプロバイダー指定でのテスト
    console.log('\n2. プロバイダー指定モード:');
    const explicitCommand = `node "${CLI_PATH}" analyze "${filePath}" --provider ${provider} --output json 2>/dev/null`;
    const explicitResult = execSync(explicitCommand, { encoding: 'utf8', shell: true });
    const explicitData = JSON.parse(explicitResult);
    
    console.log(`   ✅ 指定プロバイダー: ${provider}`);
    console.log(`   ✅ 分析されたレコード数: ${explicitData.summary?.totalRecords || 0}`);
    
    // リスク分析結果の表示
    console.log('\n3. リスク分析結果:');
    const riskDist = explicitData.summary?.riskDistribution || {};
    console.log(`   - Critical: ${riskDist.critical || 0}`);
    console.log(`   - High: ${riskDist.high || 0}`);
    console.log(`   - Medium: ${riskDist.medium || 0}`);
    console.log(`   - Low: ${riskDist.low || 0}`);
    console.log(`   - Safe: ${riskDist.safe || 0}`);
    
  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }
});

// 複数ファイルの同時分析テスト
console.log('\n\n📋 複数ファイル同時分析テスト:');
console.log('─'.repeat(50));

try {
  const allFiles = Object.values(testFiles).join(' ');
  const multiCommand = `node "${CLI_PATH}" analyze ${allFiles} --output json 2>/dev/null`;
  const multiResult = execSync(multiCommand, { encoding: 'utf8', shell: true });
  const multiData = JSON.parse(multiResult);
  
  console.log(`✅ 分析されたファイル数: ${Object.keys(testFiles).length}`);
  console.log(`✅ 総レコード数: ${multiData.summary?.totalRecords || 0}`);
  console.log(`✅ 処理時間: ${multiData.summary?.processingTime || 0}秒`);
  
} catch (error) {
  console.error(`❌ エラー: ${error.message}`);
}

console.log('\n\n✅ すべてのテストが完了しました！');