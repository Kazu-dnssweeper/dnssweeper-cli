const fs = require('fs');
const path = require('path');
const os = require('os');
const PathUtils = require('./utils/path');

// デフォルト設定
const defaultConfig = {
  timeout: 5000, // デフォルト5秒
  retries: 3,
  parallel: 10,
  output: 'console',
  format: 'json',
};

class Config {
  constructor() {
    this.config = { ...defaultConfig };
    this.configPath = this.getConfigPath();
    this.loadConfig();
  }

  getConfigPath() {
    // PathUtilsを使用してOS依存のパス問題を解決
    return PathUtils.getConfigPath('config.json');
  }

  loadConfig() {
    try {
      // PathUtilsの安全なファイル読み込みメソッドを使用
      const configContent = PathUtils.safeReadFile(this.configPath);
      if (configContent) {
        const userConfig = JSON.parse(configContent);
        this.config = { ...this.config, ...userConfig };
      }
    } catch (error) {
      console.warn('Warning: Failed to load config file:', error.message);
      console.warn('Config path:', PathUtils.fixPathEncoding(this.configPath));
    }
  }

  saveConfig() {
    try {
      // PathUtilsの安全なファイル書き込みメソッドを使用
      const success = PathUtils.safeWriteFile(
        this.configPath,
        JSON.stringify(this.config, null, 2)
      );
      if (!success) {
        throw new Error('Failed to write config file');
      }
    } catch (error) {
      console.error('Error: Failed to save config file:', error.message);
      console.error('Config path:', PathUtils.fixPathEncoding(this.configPath));
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this.saveConfig();
  }

  getAll() {
    return { ...this.config };
  }

  // タイムアウト値を取得（ミリ秒単位）
  getTimeout() {
    const timeout = this.get('timeout');
    // 数値でない場合や0以下の場合はデフォルト値を返す
    if (typeof timeout !== 'number' || timeout <= 0) {
      return defaultConfig.timeout;
    }
    return timeout;
  }

  // タイムアウト値を設定（秒単位の入力をミリ秒に変換）
  setTimeout(seconds) {
    const milliseconds = seconds * 1000;
    this.set('timeout', milliseconds);
  }
}

module.exports = new Config();
