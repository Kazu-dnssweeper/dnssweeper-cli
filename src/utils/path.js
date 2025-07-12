const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Windows環境でも正しく動作するパスユーティリティ
 */
class PathUtils {
  /**
   * OSに依存しない設定ディレクトリパスを取得
   * @returns {string} 設定ディレクトリのパス
   */
  static getConfigDir() {
    // ホームディレクトリを取得
    const homeDir = os.homedir();

    // Windows環境の場合は、APPDATAを優先的に使用
    if (process.platform === 'win32') {
      const appData =
        process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
      return path.join(appData, 'dnssweeper');
    }

    // Unix系（Linux, macOS）の場合
    return path.join(homeDir, '.dnssweeper');
  }

  /**
   * 設定ファイルのパスを取得
   * @param {string} filename - ファイル名
   * @returns {string} 設定ファイルのフルパス
   */
  static getConfigPath(filename = 'config.json') {
    return path.join(this.getConfigDir(), filename);
  }

  /**
   * キャッシュディレクトリのパスを取得
   * @returns {string} キャッシュディレクトリのパス
   */
  static getCacheDir() {
    if (process.platform === 'win32') {
      const localAppData =
        process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
      return path.join(localAppData, 'dnssweeper', 'cache');
    }

    // Unix系の場合、XDG仕様に従う
    const cacheHome =
      process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
    return path.join(cacheHome, 'dnssweeper');
  }

  /**
   * ログディレクトリのパスを取得
   * @returns {string} ログディレクトリのパス
   */
  static getLogDir() {
    if (process.platform === 'win32') {
      const localAppData =
        process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
      return path.join(localAppData, 'dnssweeper', 'logs');
    }

    // Unix系の場合
    const stateHome =
      process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
    return path.join(stateHome, 'dnssweeper');
  }

  /**
   * パスを正規化（Windows/Unix両対応）
   * @param {string} inputPath - 入力パス
   * @returns {string} 正規化されたパス
   */
  static normalizePath(inputPath) {
    if (!inputPath) return '';

    // UNCパス（\\server\share）の処理
    const isUNC = inputPath.startsWith('\\\\') || inputPath.startsWith('//');

    // パスを正規化
    let normalized = path.normalize(inputPath);

    // Windows環境でUNCパスの場合、先頭の\\を保持
    if (process.platform === 'win32' && isUNC) {
      // path.normalizeがUNCパスの\\を削除する場合があるため復元
      if (!normalized.startsWith('\\\\')) {
        normalized = '\\\\' + normalized.replace(/^[\\\\//]+/, '');
      }
    }

    return normalized;
  }

  /**
   * 相対パスを絶対パスに変換
   * @param {string} relativePath - 相対パス
   * @param {string} basePath - 基準パス（省略時は現在の作業ディレクトリ）
   * @returns {string} 絶対パス
   */
  static toAbsolutePath(relativePath, basePath = process.cwd()) {
    if (path.isAbsolute(relativePath)) {
      return this.normalizePath(relativePath);
    }

    return path.resolve(basePath, relativePath);
  }

  /**
   * ディレクトリが存在することを確認し、なければ作成
   * @param {string} dirPath - ディレクトリパス
   * @returns {boolean} 成功した場合true
   */
  static ensureDirectoryExists(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to create directory: ${dirPath}`, error);
      return false;
    }
  }

  /**
   * ファイルパスからディレクトリ部分を取得し、存在を確認
   * @param {string} filePath - ファイルパス
   * @returns {boolean} 成功した場合true
   */
  static ensureFileDirectoryExists(filePath) {
    const dirPath = path.dirname(filePath);
    return this.ensureDirectoryExists(dirPath);
  }

  /**
   * Windowsの予約語をチェック
   * @param {string} filename - ファイル名
   * @returns {boolean} 予約語の場合true
   */
  static isWindowsReservedName(filename) {
    const reserved = [
      'CON',
      'PRN',
      'AUX',
      'NUL',
      'COM1',
      'COM2',
      'COM3',
      'COM4',
      'COM5',
      'COM6',
      'COM7',
      'COM8',
      'COM9',
      'LPT1',
      'LPT2',
      'LPT3',
      'LPT4',
      'LPT5',
      'LPT6',
      'LPT7',
      'LPT8',
      'LPT9',
    ];

    const upperName = filename.toUpperCase();
    return (
      reserved.includes(upperName) ||
      reserved.some((r) => upperName.startsWith(r + '.'))
    );
  }

  /**
   * ファイル名をサニタイズ（無効な文字を除去）
   * @param {string} filename - ファイル名
   * @returns {string} サニタイズされたファイル名
   */
  static sanitizeFilename(filename) {
    // Windowsで無効な文字
    const invalidChars = /[<>:"|?*]/g;
    
    // 制御文字 (0-31) も置換
    // eslint-disable-next-line no-control-regex
    const controlChars = /[\x00-\x1f]/g;

    // 無効な文字を置換
    let sanitized = filename.replace(invalidChars, '_').replace(controlChars, '_');

    // 先頭と末尾の空白とドットを削除
    sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');

    // Windowsの予約語チェック
    if (process.platform === 'win32' && this.isWindowsReservedName(sanitized)) {
      sanitized = '_' + sanitized;
    }

    // 空の場合はデフォルト名
    return sanitized || 'unnamed';
  }

  /**
   * プラットフォーム固有のパス区切り文字を取得
   * @returns {string} パス区切り文字
   */
  static getPathSeparator() {
    return path.sep;
  }

  /**
   * 環境変数を含むパスを展開
   * @param {string} inputPath - 入力パス
   * @returns {string} 展開されたパス
   */
  static expandPath(inputPath) {
    if (!inputPath) return '';

    // ~ をホームディレクトリに展開（Unix系）
    if (inputPath.startsWith('~')) {
      inputPath = inputPath.replace(/^~/, os.homedir());
    }

    // 環境変数を展開
    inputPath = inputPath.replace(
      /\$([A-Z_][A-Z0-9_]*)/gi,
      (match, varName) => {
        return process.env[varName] || match;
      }
    );

    // Windows形式の環境変数も展開
    inputPath = inputPath.replace(/%([^%]+)%/g, (match, varName) => {
      return process.env[varName] || match;
    });

    return this.normalizePath(inputPath);
  }

  /**
   * Windows長いパス名のサポート（\\?\プレフィックスを追加）
   * @param {string} inputPath - 入力パス
   * @returns {string} 長いパス名対応のパス
   */
  static toLongPath(inputPath) {
    if (process.platform !== 'win32') {
      return inputPath;
    }

    // 既に長いパス形式の場合はそのまま返す
    if (inputPath.startsWith('\\\\?\\')) {
      return inputPath;
    }

    // UNCパスの場合
    if (inputPath.startsWith('\\\\')) {
      return '\\\\?\\UNC\\' + inputPath.substring(2);
    }

    // 絶対パスの場合のみ変換
    if (path.isAbsolute(inputPath)) {
      return '\\\\?\\' + inputPath;
    }

    return inputPath;
  }

  /**
   * ファイルの存在確認（Windows長いパス名対応）
   * @param {string} filePath - ファイルパス
   * @returns {boolean} 存在する場合true
   */
  static fileExists(filePath) {
    try {
      // Windows環境で長いパスの場合は特殊処理
      if (process.platform === 'win32' && filePath.length > 250) {
        filePath = this.toLongPath(filePath);
      }
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }

  /**
   * 安全にファイルを読み込み（文字エンコーディング対応）
   * @param {string} filePath - ファイルパス
   * @param {string} encoding - 文字エンコーディング（デフォルト: utf8）
   * @returns {string|null} ファイル内容（失敗時はnull）
   */
  static safeReadFile(filePath, encoding = 'utf8') {
    try {
      // Windows環境で長いパスの場合は特殊処理
      if (process.platform === 'win32' && filePath.length > 250) {
        filePath = this.toLongPath(filePath);
      }

      // ファイル存在確認
      if (!this.fileExists(filePath)) {
        return null;
      }

      return fs.readFileSync(filePath, encoding);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to read file: ${filePath}`, error.message);
      return null;
    }
  }

  /**
   * 安全にファイルを書き込み（ディレクトリ作成付き）
   * @param {string} filePath - ファイルパス
   * @param {string} content - ファイル内容
   * @param {string} encoding - 文字エンコーディング（デフォルト: utf8）
   * @returns {boolean} 成功した場合true
   */
  static safeWriteFile(filePath, content, encoding = 'utf8') {
    try {
      // ディレクトリの存在確認・作成
      if (!this.ensureFileDirectoryExists(filePath)) {
        return false;
      }

      // Windows環境で長いパスの場合は特殊処理
      if (process.platform === 'win32' && filePath.length > 250) {
        filePath = this.toLongPath(filePath);
      }

      fs.writeFileSync(filePath, content, encoding);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to write file: ${filePath}`, error.message);
      return false;
    }
  }

  /**
   * Windowsの権限問題を解決するためのヘルパー
   * @param {string} dirPath - ディレクトリパス
   * @returns {boolean} アクセス可能な場合true
   */
  static isDirectoryAccessible(dirPath) {
    try {
      // アクセス権限をチェック
      fs.accessSync(dirPath, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * パス文字列のエンコーディング問題を修正
   * @param {string} pathString - パス文字列
   * @returns {string} 修正されたパス文字列
   */
  static fixPathEncoding(pathString) {
    if (!pathString || typeof pathString !== 'string') {
      return '';
    }

    // Windows環境での日本語パス対応
    if (process.platform === 'win32') {
      try {
        // 不正な文字をチェック・修正
        return pathString.normalize('NFC');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Path encoding normalization failed:', error.message);
        return pathString;
      }
    }

    return pathString;
  }
}

module.exports = PathUtils;
