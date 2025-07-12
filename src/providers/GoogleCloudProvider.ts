/**
 * Google Cloud DNS プロバイダー
 */

import { BaseProvider } from './BaseProvider';
import { IDNSRecord } from '../types/dns';

export class GoogleCloudProvider extends BaseProvider {
  name = 'google-cloud';
  description = 'Google Cloud DNS';
  supportedRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS', 'PTR', 'SOA', 'SPF', 'CAA'];
  
  /**
   * Google Cloud DNS特有のヘッダーを検出
   */
  detect(headers: string[]): boolean {
    const normalizedHeaders = this.normalizeHeaders(headers);
    
    // Google Cloud DNS特有のヘッダー
    const gcloudHeaders = ['dns_name', 'record_type', 'rrdatas'];
    
    // 全ての必須ヘッダーが存在するか確認
    return gcloudHeaders.every(header => normalizedHeaders.includes(header));
  }
  
  /**
   * Google Cloud DNSのCSV行をパース
   */
  parse(row: any, headers: string[]): IDNSRecord | null {
    try {
      // ヘッダーとインデックスのマッピングを作成
      const headerMap = new Map<string, number>();
      headers.forEach((header, index) => {
        headerMap.set(header.toLowerCase(), index);
      });
      
      // 必須フィールドの取得
      const name = this.getFieldValue(row, headerMap, ['dns_name', 'name']);
      const type = this.getFieldValue(row, headerMap, ['record_type', 'type']);
      const rrdatas = this.getFieldValue(row, headerMap, ['rrdatas', 'data']);
      const ttl = this.getFieldValue(row, headerMap, ['ttl']);
      
      if (!name || !type || !rrdatas) {
        return null;
      }
      
      // rrdatasは配列形式または文字列の可能性がある
      const dataValues = this.parseRRDatas(rrdatas);
      
      const record: IDNSRecord = {
        name: this.normalizeDomainName(name),
        type: this.normalizeRecordType(type),
        content: dataValues[0], // 最初の値をメインコンテンツとする
        ttl: this.normalizeTTL(ttl, 300),
        // Google Cloud DNS特有のフィールド
        ...(this.getFieldValue(row, headerMap, ['kind']) && {
          kind: this.getFieldValue(row, headerMap, ['kind']),
        }),
        ...(this.getFieldValue(row, headerMap, ['signature_rrdatas']) && {
          signatureRrdatas: this.getFieldValue(row, headerMap, ['signature_rrdatas']),
        }),
      };
      
      // 複数値がある場合は追加フィールドに格納
      if (dataValues.length > 1) {
        record.additionalValues = dataValues.slice(1);
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
      console.error('Google Cloud DNSパース エラー:', error);
      return null;
    }
  }
  
  /**
   * Google Cloud DNSのrrdatasフィールドをパース
   */
  private parseRRDatas(rrdatas: string): string[] {
    // JSON配列形式の場合
    if (rrdatas.startsWith('[') && rrdatas.endsWith(']')) {
      try {
        return JSON.parse(rrdatas);
      } catch {
        // JSONパースに失敗した場合は通常の処理を続行
      }
    }
    
    // 引用符で囲まれた形式の場合（例: "192.168.1.1"）
    if (rrdatas.startsWith('"') && rrdatas.endsWith('"')) {
      return [rrdatas.slice(1, -1)];
    }
    
    // カンマ区切りの場合
    if (rrdatas.includes(',')) {
      return rrdatas.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    }
    
    return [rrdatas];
  }
  
  /**
   * TXTレコードの引用符を削除
   */
  private unquoteTxtValue(value: string): string {
    // 二重引用符を削除
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