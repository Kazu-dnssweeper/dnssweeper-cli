/**
 * DNSプロバイダー関連の型定義
 */

import { DNSRecord } from '../types/dns';

/**
 * DNSプロバイダーインターフェース
 */
export interface DNSProvider {
  /** プロバイダー名 */
  name: string;
  
  /** プロバイダーの説明 */
  description: string;
  
  /** サポートされているレコードタイプ */
  supportedRecordTypes: string[];
  
  /** CSVヘッダーからプロバイダーを検出 */
  detect(headers: string[]): boolean;
  
  /** CSVの行をDNSRecordに変換 */
  parse(row: any, headers: string[]): DNSRecord | null;
  
  /** プロバイダー固有のバリデーション */
  validate?(record: DNSRecord): boolean;
}

/**
 * プロバイダー検出結果
 */
export interface ProviderDetectionResult {
  provider: DNSProvider;
  confidence: number; // 0-1の信頼度
}

/**
 * プロバイダー固有のメタデータ
 */
export interface ProviderMetadata {
  /** エクスポート日時 */
  exportedAt?: Date;
  
  /** ゾーン名 */
  zoneName?: string;
  
  /** アカウントID */
  accountId?: string;
  
  /** その他のメタデータ */
  [key: string]: any;
}