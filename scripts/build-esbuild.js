#!/usr/bin/env node

/**
 * esbuildによる超高速ビルドスクリプト
 * tsupよりもさらに高速なビルドが可能
 */

const esbuild = require('esbuild');
const { resolve } = require('path');
const fs = require('fs');

// ビルド設定
const buildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node16',
  outfile: 'dist/index.js',
  format: 'cjs',
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  
  // バナー（シバン）
  banner: {
    js: '#!/usr/bin/env node',
  },
  
  // 外部モジュール（バンドルしない）
  external: [
    // 依存パッケージ
    'chalk',
    'commander',
    'ora',
    'papaparse',
    
    // Node.js組み込みモジュール
    'fs',
    'path',
    'os',
    'stream',
    'util',
    'crypto',
    'child_process',
    'events',
    'assert',
    'buffer',
    'querystring',
    'string_decoder',
    'url',
    'zlib',
  ],
  
  // エイリアス設定
  alias: {
    '@': resolve(__dirname, '../src'),
    '@/types': resolve(__dirname, '../src/types'),
    '@/utils': resolve(__dirname, '../src/utils'),
    '@/commands': resolve(__dirname, '../src/commands'),
    '@/parsers': resolve(__dirname, '../src/parsers'),
    '@/patterns': resolve(__dirname, '../src/patterns'),
    '@/analyzers': resolve(__dirname, '../src/analyzers'),
    '@/providers': resolve(__dirname, '../src/providers'),
  },
  
  // 環境変数の定義
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  
  // ログ設定
  logLevel: 'info',
  
  // メタファイル生成（バンドル分析用）
  metafile: process.env.ANALYZE === 'true',
};

// distディレクトリをクリーン
function cleanDist() {
  const distPath = resolve(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }
  fs.mkdirSync(distPath, { recursive: true });
}

// ビルド実行
async function build() {
  console.log('🚀 esbuildビルド開始...');
  const startTime = Date.now();
  
  try {
    // distをクリーン
    cleanDist();
    
    // ビルド実行
    const result = await esbuild.build(buildOptions);
    
    // メタファイルを保存（分析用）
    if (result.metafile) {
      fs.writeFileSync(
        'dist/metafile.json',
        JSON.stringify(result.metafile, null, 2)
      );
      console.log('📊 メタファイルを生成しました: dist/metafile.json');
    }
    
    // 実行権限を付与
    const outputPath = resolve(__dirname, '../dist/index.js');
    fs.chmodSync(outputPath, '755');
    
    const endTime = Date.now();
    const buildTime = endTime - startTime;
    console.log(`✅ ビルド完了！ (${buildTime}ms)`);
    
    // ファイルサイズ情報
    const stats = fs.statSync(outputPath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    console.log(`📦 出力ファイルサイズ: ${fileSizeKB} KB`);
    
  } catch (error) {
    console.error('❌ ビルドエラー:', error);
    process.exit(1);
  }
}

// ウォッチモード
async function watch() {
  console.log('👀 ウォッチモード開始...');
  
  const ctx = await esbuild.context({
    ...buildOptions,
    plugins: [
      {
        name: 'on-rebuild',
        setup(build) {
          build.onEnd(result => {
            if (result.errors.length === 0) {
              console.log(`✅ 再ビルド完了！ (${new Date().toLocaleTimeString()})`);
              
              // 実行権限を付与
              const outputPath = resolve(__dirname, '../dist/index.js');
              fs.chmodSync(outputPath, '755');
            } else {
              console.error('❌ ビルドエラー:', result.errors);
            }
          });
        },
      },
    ],
  });
  
  await ctx.watch();
  console.log('ファイル変更を監視中...');
}

// メイン処理
async function main() {
  const isWatch = process.argv.includes('--watch') || process.argv.includes('-w');
  
  if (isWatch) {
    await watch();
  } else {
    await build();
  }
}

// 実行
main().catch(error => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});