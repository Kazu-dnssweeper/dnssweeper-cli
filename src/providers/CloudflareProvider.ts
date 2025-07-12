/**
 * Cloudflare DNSプロバイダー
 */

import { BaseProvider } from './BaseProvider';
import { IDNSRecord } from '../types/dns';

export class CloudflareProvider extends BaseProvider {
  name = 'cloudflare';
  description = 'Cloudflare DNS';
  supportedRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS', 'CAA'];
  
  /**
   * Cloudflare特有のヘッダーを検出
   */
  detect(headers: string[]): boolean {
    const normalizedHeaders = this.normalizeHeaders(headers);
    
    // Cloudflare特有のヘッダー
    const cloudflareHeaders = ['proxied', 'proxy_status', 'proxiable'];
    
    // いずれかのCloudflare特有ヘッダーが存在するか確認
    return cloudflareHeaders.some(header => normalizedHeaders.includes(header));
  }
  
  /**
   * CloudflareのCSV行をパース
   */
  parse(row: any, headers: string[]): IDNSRecord | null {
    try {
      // ヘッダーとインデックスのマッピングを作成
      const headerMap = new Map<string, number>();
      headers.forEach((header, index) => {
        headerMap.set(header.toLowerCase(), index);
      });
      
      // 必須フィールドの取得
      const name = this.getFieldValue(row, headerMap, ['name', 'hostname', 'record_name']);
      const type = this.getFieldValue(row, headerMap, ['type', 'record_type']);
      const content = this.getFieldValue(row, headerMap, ['content', 'value', 'target']);
      const ttl = this.getFieldValue(row, headerMap, ['ttl']);
      
      if (!name || !type || !content) {
        return null;
      }
      
      const record: IDNSRecord = {
        name: this.normalizeDomainName(name),
        type: this.normalizeRecordType(type),
        content: content.trim(),
        ttl: this.normalizeTTL(ttl, 300), // Cloudflareのデフォルトは300秒
        // Cloudflare特有のフィールド
        proxied: this.getFieldValue(row, headerMap, ['proxied', 'proxy_status']) === 'true',
        proxiable: this.getFieldValue(row, headerMap, ['proxiable']) === 'true',
        ...(this.getFieldValue(row, headerMap, ['comment', 'notes']) && {
          comment: this.getFieldValue(row, headerMap, ['comment', 'notes']),
        }),
      };
      
      // MXレコードの場合は優先度を追加
      if (record.type === 'MX') {
        const priority = this.getFieldValue(row, headerMap, ['priority', 'mx_priority']);
        if (priority) {
          record.priority = parseInt(priority);
        }
      }
      
      return this.validate(record) ? record : null;
    } catch (error) {
      console.error('Cloudflareパース エラー:', error);
      return null;
    }
  }
  
  /**
   * フィールド値を複数の可能なヘッダー名から取得
   */
  private getFieldValue(row: any, headerMap: Map<string, number>, possibleHeaders: string[]): string | undefined {
    // rowがオブジェクトの場合（Papa.parseでheader:trueの場合）
    if (typeof row === 'object' && !Array.isArray(row)) {
      for (const header of possibleHeaders) {
        // 大文字小文字を考慮して検索
        const value = row[header] || row[header.charAt(0).toUpperCase() + header.slice(1)];
        if (value !== undefined && value !== null && value !== '') {
          return value.toString();
        }
      }
      return undefined;
    }
    
    // rowが配列の場合（旧形式）
    for (const header of possibleHeaders) {
      const index = headerMap.get(header.toLowerCase());
      if (index !== undefined && row[index]) {
        return row[index].toString();
      }
    }
    return undefined;
  }
}