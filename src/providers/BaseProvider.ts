/**
 * DNSプロバイダーの基底クラス
 */

import { DNSProvider } from './types';
import { DNSRecord } from '../types/dns';

export abstract class BaseProvider implements DNSProvider {
  abstract name: string;
  abstract description: string;
  abstract supportedRecordTypes: string[];
  
  /**
   * ヘッダーの正規化
   */
  protected normalizeHeaders(headers: string[]): string[] {
    return headers.map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'));
  }
  
  /**
   * 共通のレコードタイプマッピング
   */
  protected normalizeRecordType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'a': 'A',
      'aaaa': 'AAAA',
      'cname': 'CNAME',
      'mx': 'MX',
      'txt': 'TXT',
      'srv': 'SRV',
      'ns': 'NS',
      'ptr': 'PTR',
      'soa': 'SOA',
      'caa': 'CAA',
    };
    
    return typeMap[type.toLowerCase()] || type.toUpperCase();
  }
  
  /**
   * TTL値の正規化（デフォルト値を含む）
   */
  protected normalizeTTL(ttl: any, defaultTTL: number = 3600): number {
    const parsed = parseInt(ttl);
    return isNaN(parsed) ? defaultTTL : parsed;
  }
  
  /**
   * ドメイン名の正規化（末尾のドットを処理）
   */
  protected normalizeDomainName(name: string, zoneName?: string): string {
    // 末尾のドットを削除
    name = name.replace(/\.$/, '');
    
    // @をゾーン名に置換
    if (name === '@' && zoneName) {
      return zoneName;
    }
    
    // 相対名の場合、ゾーン名を追加
    if (zoneName && !name.includes('.') && name !== zoneName) {
      return `${name}.${zoneName}`;
    }
    
    return name;
  }
  
  abstract detect(headers: string[]): boolean;
  abstract parse(row: any, headers: string[]): DNSRecord | null;
  
  /**
   * 基本的なバリデーション
   */
  validate(record: DNSRecord): boolean {
    // レコード名の検証
    if (!record.name || record.name.trim() === '') {
      return false;
    }
    
    // レコードタイプの検証
    if (!this.supportedRecordTypes.includes(record.type)) {
      return false;
    }
    
    // コンテンツの検証
    if (!record.content || record.content.trim() === '') {
      return false;
    }
    
    // TTLの検証
    if (record.ttl !== undefined && (record.ttl < 0 || record.ttl > 2147483647)) {
      return false;
    }
    
    return true;
  }
}