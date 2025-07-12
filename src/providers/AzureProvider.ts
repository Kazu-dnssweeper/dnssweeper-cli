/**
 * Azure DNS プロバイダー
 */

import { BaseProvider } from './BaseProvider';
import { IDNSRecord } from '../types/dns';

export class AzureProvider extends BaseProvider {
  name = 'azure';
  description = 'Azure DNS';
  supportedRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS', 'PTR', 'SOA', 'CAA'];
  
  private zoneName: string = '';
  
  /**
   * Azure DNS特有のヘッダーを検出
   */
  detect(headers: string[]): boolean {
    const normalizedHeaders = this.normalizeHeaders(headers);
    
    // Azure DNS特有のヘッダーパターン
    // Azure形式: Name, Type, TTL, Value (または Records)
    const hasAzurePattern = 
      normalizedHeaders.includes('name') && 
      normalizedHeaders.includes('type') && 
      normalizedHeaders.includes('ttl') && 
      (normalizedHeaders.includes('value') || normalizedHeaders.includes('records'));
    
    // Azure特有のヘッダー
    const azureHeaders = ['recordset', 'resource_group', 'subscription_id'];
    
    return hasAzurePattern || azureHeaders.some(header => normalizedHeaders.includes(header));
  }
  
  /**
   * Azure DNSのCSV行をパース
   */
  parse(row: any, headers: string[]): IDNSRecord | null {
    try {
      // ヘッダーとインデックスのマッピングを作成
      const headerMap = new Map<string, number>();
      headers.forEach((header, index) => {
        headerMap.set(header.toLowerCase(), index);
      });
      
      // 必須フィールドの取得
      const name = this.getFieldValue(row, headerMap, ['name', 'recordset_name', 'hostname']);
      const type = this.getFieldValue(row, headerMap, ['type', 'record_type']);
      const content = this.getFieldValue(row, headerMap, ['value', 'records', 'data', 'target']);
      const ttl = this.getFieldValue(row, headerMap, ['ttl']);
      
      if (!name || !type || !content) {
        return null;
      }
      
      // Azure DNSのレコード値を処理
      const values = this.parseAzureValues(content);
      
      // Azure DNSの相対名を処理（@はルートドメイン）
      const fullName = this.resolveAzureName(name);
      
      const record: IDNSRecord = {
        name: fullName,
        type: this.normalizeRecordType(type),
        content: values[0], // 最初の値をメインコンテンツとする
        ttl: this.normalizeTTL(ttl, 3600), // Azureのデフォルトは3600秒
        // Azure特有のフィールド
        ...(this.getFieldValue(row, headerMap, ['resource_group', 'resourcegroup']) && {
          resourceGroup: this.getFieldValue(row, headerMap, ['resource_group', 'resourcegroup']),
        }),
        ...(this.getFieldValue(row, headerMap, ['subscription_id', 'subscriptionid']) && {
          subscriptionId: this.getFieldValue(row, headerMap, ['subscription_id', 'subscriptionid']),
        }),
        ...(this.getFieldValue(row, headerMap, ['metadata', 'tags']) && {
          metadata: this.getFieldValue(row, headerMap, ['metadata', 'tags']),
        }),
      };
      
      // 複数値がある場合は追加フィールドに格納
      if (values.length > 1) {
        record.additionalValues = values.slice(1);
      }
      
      // MXレコードの場合は優先度を抽出
      if (record.type === 'MX') {
        const priority = this.getFieldValue(row, headerMap, ['priority', 'preference']);
        if (priority) {
          record.priority = parseInt(priority);
        } else if (record.content) {
          // コンテンツから優先度を抽出
          const mxMatch = record.content.match(/^(\d+)\s+(.+)$/);
          if (mxMatch) {
            record.priority = parseInt(mxMatch[1]);
            record.content = mxMatch[2];
          }
        }
      }
      
      // SRVレコードの場合は追加フィールドを処理
      if (record.type === 'SRV') {
        const priority = this.getFieldValue(row, headerMap, ['priority']);
        const weight = this.getFieldValue(row, headerMap, ['weight']);
        const port = this.getFieldValue(row, headerMap, ['port']);
        
        if (priority && weight && port) {
          record.priority = parseInt(priority);
          record.weight = parseInt(weight);
          record.port = parseInt(port);
        }
      }
      
      // TXTレコードの引用符を処理
      if (record.type === 'TXT') {
        record.content = this.unquoteTxtValue(record.content);
      }
      
      return this.validate(record) ? record : null;
    } catch (error) {
      console.error('Azure DNSパース エラー:', error);
      return null;
    }
  }
  
  /**
   * Azureの名前を解決（@をゾーン名に変換など）
   */
  private resolveAzureName(name: string): string {
    // @はルートドメインを表す
    if (name === '@') {
      return this.zoneName || name;
    }
    
    // 相対名の場合、ゾーン名を推測
    if (!name.includes('.') && this.zoneName) {
      return `${name}.${this.zoneName}`;
    }
    
    return this.normalizeDomainName(name);
  }
  
  /**
   * Azure DNSの値フィールドをパース
   */
  private parseAzureValues(value: string): string[] {
    // JSON配列形式の場合
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        // JSONパースに失敗した場合は通常の処理を続行
      }
    }
    
    // セミコロン区切りの場合（Azureの複数値）
    if (value.includes(';')) {
      return value.split(';').map(v => v.trim());
    }
    
    // カンマ区切りの場合
    if (value.includes(',') && !value.includes('"')) {
      return value.split(',').map(v => v.trim());
    }
    
    return [value.trim()];
  }
  
  /**
   * TXTレコードの引用符を削除
   */
  private unquoteTxtValue(value: string): string {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1).replace(/\\"/g, '"');
    }
    return value;
  }
  
  /**
   * ゾーン名を設定（オプション）
   */
  setZoneName(zoneName: string): void {
    this.zoneName = zoneName.replace(/\.$/, '');
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