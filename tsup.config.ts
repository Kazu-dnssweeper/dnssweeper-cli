import { defineConfig } from 'tsup';
import { resolve } from 'path';

export default defineConfig({
  // エントリーポイント
  entry: ['src/index.ts'],
  
  // 出力設定
  outDir: 'dist',
  format: ['cjs', 'esm'], // CommonJSとESModules両対応
  
  // TypeScript設定
  dts: {
    // 型定義ファイルを生成
    resolve: true,
    entry: ['src/index.ts'],
  },
  
  // ソースマップ
  sourcemap: true,
  
  // バンドル設定
  splitting: false, // コード分割を無効化（CLIツールのため）
  clean: true, // ビルド前にdistをクリーン
  minify: process.env.NODE_ENV === 'production', // 本番環境でのみ圧縮
  
  // シバン（#!/usr/bin/env node）を保持
  shims: true,
  
  // バナー設定
  banner: {
    js: '#!/usr/bin/env node',
  },
  
  // 外部依存関係（バンドルしない）
  external: [
    // Node.js組み込みモジュール
    'fs',
    'path',
    'os',
    'stream',
    'util',
    'crypto',
    'child_process',
  ],
  
  // プラットフォーム設定
  platform: 'node',
  target: 'node16', // Node.js 16以上
  
  // エイリアス設定
  esbuildOptions(options) {
    options.alias = {
      '@': resolve(__dirname, 'src'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/commands': resolve(__dirname, 'src/commands'),
      '@/parsers': resolve(__dirname, 'src/parsers'),
      '@/patterns': resolve(__dirname, 'src/patterns'),
      '@/analyzers': resolve(__dirname, 'src/analyzers'),
      '@/providers': resolve(__dirname, 'src/providers'),
    };
  },
  
  // ウォッチモード設定
  onSuccess: async () => {
    if (process.env.WATCH) {
      console.log('✅ ビルド成功！ファイル変更を監視中...');
    }
  },
  
  // メタファイル生成（バンドル分析用）
  metafile: process.env.ANALYZE === 'true',
  
  // ログレベル
  silent: false,
  
  // 環境変数の置換
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});