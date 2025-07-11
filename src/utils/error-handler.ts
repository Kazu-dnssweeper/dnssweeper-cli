/**
 * エラーハンドリングユーティリティ
 * Zodエラーを含む各種エラーの統一的な処理
 */

import { z } from 'zod';
import chalk from 'chalk';
import { getLanguage } from './messages';

/**
 * エラータイプの定義
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * カスタムエラークラス
 */
export class DNSweeperError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public details?: Record<string, any>,
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'DNSweeperError';
  }
}

/**
 * エラーメッセージの定義
 */
const errorMessages = {
  ja: {
    [ErrorType.VALIDATION]: 'バリデーションエラー',
    [ErrorType.FILE_NOT_FOUND]: 'ファイルが見つかりません',
    [ErrorType.PARSE_ERROR]: '解析エラー',
    [ErrorType.NETWORK]: 'ネットワークエラー',
    [ErrorType.PERMISSION]: '権限エラー',
    [ErrorType.UNKNOWN]: '不明なエラー',
    fieldRequired: 'フィールドが必須です',
    invalidFormat: '無効な形式です',
    outOfRange: '値が範囲外です',
    retry: '再試行してください',
    checkFile: 'ファイルパスを確認してください',
    checkPermission: 'ファイルの権限を確認してください',
  },
  en: {
    [ErrorType.VALIDATION]: 'Validation Error',
    [ErrorType.FILE_NOT_FOUND]: 'File not found',
    [ErrorType.PARSE_ERROR]: 'Parse Error',
    [ErrorType.NETWORK]: 'Network Error',
    [ErrorType.PERMISSION]: 'Permission Error',
    [ErrorType.UNKNOWN]: 'Unknown Error',
    fieldRequired: 'Field is required',
    invalidFormat: 'Invalid format',
    outOfRange: 'Value out of range',
    retry: 'Please try again',
    checkFile: 'Please check the file path',
    checkPermission: 'Please check file permissions',
  },
};

/**
 * Zodエラーをユーザーフレンドリーな形式に変換
 */
export function formatZodError(error: z.ZodError): string[] {
  const lang = getLanguage();
  const messages = errorMessages[lang as keyof typeof errorMessages];
  
  return error.issues.map(err => {
    const field = err.path.join('.');
    let message = '';
    
    switch (err.code) {
      case 'invalid_type':
        message = `${field}: ${messages.fieldRequired}`;
        break;
        
      case 'too_small':
      case 'too_big':
        message = `${field}: ${messages.outOfRange}`;
        break;
        
      default:
        message = `${field}: ${err.message}`;
    }
    
    return message;
  });
}

/**
 * エラーを処理してユーザーフレンドリーなメッセージを表示
 */
export function handleError(error: unknown, context?: string): void {
  const lang = getLanguage();
  const messages = errorMessages[lang as keyof typeof errorMessages];
  
  console.error(chalk.red('\n❌ エラーが発生しました'));
  
  if (context) {
    console.error(chalk.yellow(`📍 コンテキスト: ${context}`));
  }
  
  if (error instanceof z.ZodError) {
    console.error(chalk.red(`\n${messages[ErrorType.VALIDATION]}:`));
    const formattedErrors = formatZodError(error);
    formattedErrors.forEach(err => {
      console.error(chalk.red(`  • ${err}`));
    });
  } else if (error instanceof DNSweeperError) {
    console.error(chalk.red(`\n${messages[error.type]}: ${error.message}`));
    if (error.details) {
      console.error(chalk.gray('詳細:'), error.details);
    }
  } else if (error instanceof Error) {
    // Node.jsの標準エラーを処理
    if (error.message.includes('ENOENT')) {
      console.error(chalk.red(`\n${messages[ErrorType.FILE_NOT_FOUND]}: ${error.message}`));
      console.error(chalk.yellow(`💡 ${messages.checkFile}`));
    } else if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
      console.error(chalk.red(`\n${messages[ErrorType.PERMISSION]}: ${error.message}`));
      console.error(chalk.yellow(`💡 ${messages.checkPermission}`));
    } else {
      console.error(chalk.red(`\n${error.message}`));
    }
    
    if (process.env.DEBUG) {
      console.error(chalk.gray('\nスタックトレース:'));
      console.error(chalk.gray(error.stack));
    }
  } else {
    console.error(chalk.red(`\n${messages[ErrorType.UNKNOWN]}: ${String(error)}`));
  }
  
  console.error(chalk.yellow(`\n💡 ${messages.retry}`));
}

/**
 * エラーをラップして詳細情報を追加
 */
export function wrapError(
  error: unknown,
  type: ErrorType,
  message: string,
  details?: Record<string, any>,
): DNSweeperError {
  const originalError = error instanceof Error ? error : new Error(String(error));
  
  return new DNSweeperError(
    message,
    type,
    {
      ...details,
      originalMessage: originalError.message,
    },
    originalError,
  );
}

/**
 * 非同期関数のエラーハンドリングラッパー
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      process.exit(1);
    }
  }) as T;
}

/**
 * リトライ機能付きの非同期処理
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {},
): Promise<T> {
  const { maxRetries = 3, delay = 1000, onRetry } = options;
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt, error);
        }
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
}