/**
 * AWS Route 53 DNSプロバイダー
 */

import { BaseProvider } from './BaseProvider';
import { IDNSRecord } from '../types/dns';

export class Route53Provider extends BaseProvider {
  name = 'route53';
  description = 'AWS Route 53';
  supportedRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS', 'PTR', 'SOA', 'SPF', 'CAA'];
  
  /**
   * Route 53特有のヘッダーを検出
   */
  detect(headers: string[]): boolean {
    const normalizedHeaders = this.normalizeHeaders(headers);
    
    // Route 53特有のヘッダー
    const route53Headers = ['routingpolicy', 'routing_policy', 'setidentifier', 'set_identifier', 'hostedzoneid'];
    
    // Route 53の標準的なヘッダーの組み合わせも確認
    const hasNameTypeValue = normalizedHeaders.includes('name') && 
                            normalizedHeaders.includes('type') && 
                            normalizedHeaders.includes('value');
    
    return route53Headers.some(header => normalizedHeaders.includes(header)) || hasNameTypeValue;
  }
  
  /**
   * Route 53のCSV行をパース
   */
  parse(row: any, headers: string[]): IDNSRecord | null {
    try {
      // ヘッダーとインデックスのマッピングを作成
      const headerMap = new Map<string, number>();
      headers.forEach((header, index) => {
        headerMap.set(header.toLowerCase(), index);
      });
      
      // 必須フィールドの取得
      const name = this.getFieldValue(row, headerMap, ['name', 'record_name', 'hostname']);
      const type = this.getFieldValue(row, headerMap, ['type', 'record_type']);
      const content = this.getFieldValue(row, headerMap, ['value', 'values', 'content', 'resourcerecords']);
      const ttl = this.getFieldValue(row, headerMap, ['ttl']);
      
      if (!name || !type || !content) {
        return null;
      }
      
      // Route 53の値は複数の場合カンマ区切りまたは配列形式の可能性がある
      const values = this.parseValues(content);
      
      const record: IDNSRecord = {
        name: this.normalizeDomainName(name),
        type: this.normalizeRecordType(type),
        content: values[0], // 最初の値をメインコンテンツとする
        ttl: this.normalizeTTL(ttl, 300),
        // Route 53特有のフィールド
        ...(this.getFieldValue(row, headerMap, ['routingpolicy', 'routing_policy']) && {
          routingPolicy: this.getFieldValue(row, headerMap, ['routingpolicy', 'routing_policy']),
        }),
        ...(this.getFieldValue(row, headerMap, ['setidentifier', 'set_identifier']) && {
          setIdentifier: this.getFieldValue(row, headerMap, ['setidentifier', 'set_identifier']),
        }),
        ...(this.getFieldValue(row, headerMap, ['healthcheckid', 'health_check_id']) && {
          healthCheckId: this.getFieldValue(row, headerMap, ['healthcheckid', 'health_check_id']),
        }),
      };
      
      // 複数値がある場合は追加フィールドに格納
      if (values.length > 1) {
        record.additionalValues = values.slice(1);
      }
      
      // MXレコードの場合は優先度を抽出
      if (record.type === 'MX' && record.content) {
        const mxMatch = record.content.match(/^(\d+)\s+(.+)$/);
        if (mxMatch) {
          record.priority = parseInt(mxMatch[1]);
          record.content = mxMatch[2];
        }
      }
      
      // TXTレコードの引用符を処理
      if (record.type === 'TXT') {
        record.content = this.unquoteTxtValue(record.content);
      }
      
      return this.validate(record) ? record : null;
    } catch (error) {
      console.error('Route 53パース エラー:', error);
      return null;
    }
  }
  
  /**
   * Route 53の値フィールドをパース（複数値対応）
   */
  private parseValues(value: string): string[] {
    // JSON配列形式の場合
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        // JSONパースに失敗した場合は通常の処理を続行
      }
    }
    
    // カンマ区切りの場合（引用符内のカンマは無視）
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      if (char === '"' && (i === 0 || value[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current) {
      values.push(current.trim());
    }
    
    return values.length > 0 ? values : [value];
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