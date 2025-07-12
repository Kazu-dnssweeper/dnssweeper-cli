/**
 * Namecheap DNSプロバイダー
 */

import { BaseProvider } from './BaseProvider';
import { IDNSRecord } from '../types/dns';
import { RawCSVRecord } from './types';

/**
 * Namecheap DNS形式の処理
 */
export class NamecheapProvider extends BaseProvider {
  name = 'namecheap';
  description = 'Namecheap DNS Provider';

  /**
   * ヘッダーを解析してNamecheapプロバイダーかどうかを判定
   * @param headers - CSVヘッダー配列
   * @returns プロバイダーが一致するかどうか
   */
  detect(headers: string[]): boolean {
    const lowerHeaders = headers.map(h => h.toLowerCase());
    
    // Namecheapの典型的なヘッダーパターン
    const namecheapPatterns = [
      'record type',
      'host name',
      'hostname',
      'value',
      'ttl'
    ];

    return namecheapPatterns.every(pattern => 
      lowerHeaders.some(header => header.includes(pattern))
    );
  }

  /**
   * NamecheapのCSV行を標準的なDNSレコード形式に変換
   * @param row - CSV行データ
   * @param headers - CSVヘッダー配列
   * @returns 標準化されたDNSレコード
   */
  parse(row: RawCSVRecord, headers: string[]): IDNSRecord | null {
    try {
      // ヘッダーマッピング
      const getField = (field: string): string => {
        const lowerField = field.toLowerCase();
        const index = headers.findIndex(h => 
          h.toLowerCase().includes(lowerField) ||
          h.toLowerCase() === lowerField
        );
        return index !== -1 ? (row[headers[index]] || '') : '';
      };

      // 基本フィールドの取得
      const name = getField('host name') || getField('hostname') || getField('host');
      const type = getField('record type') || getField('type');
      const content = getField('value') || getField('content') || getField('target');
      const ttlValue = getField('ttl');

      // 必須フィールドの検証
      if (!name || !type) {
        return null;
      }

      return {
        name: name.trim(),
        type: type.trim().toUpperCase(),
        content: content.trim(),
        ttl: ttlValue ? parseInt(ttlValue, 10) : 300,
        proxied: false, // Namecheapは通常プロキシ機能なし
        created: '',
        modified: ''
      };
    } catch (error) {
      console.warn(`Namecheap行の解析エラー:`, error);
      return null;
    }
  }

  /**
   * DNSレコードをNamecheap形式にエクスポート
   * @param record - DNSレコード
   * @returns Namecheap形式のレコード
   */
  export(record: IDNSRecord): Record<string, string> {
    return {
      'Host Name': record.name,
      'Record Type': record.type,
      'Value': record.content,
      'TTL': record.ttl.toString()
    };
  }

  /**
   * バリデーション
   * @param record - DNSレコード
   * @returns バリデーション結果
   */
  validate(record: IDNSRecord): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!record.name) {
      errors.push('Host Nameが必要です');
    }

    if (!record.type) {
      errors.push('Record Typeが必要です');
    }

    // TTLの範囲チェック（Namecheapの制限）
    if (record.ttl < 60) {
      errors.push('TTLは60秒以上である必要があります');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}