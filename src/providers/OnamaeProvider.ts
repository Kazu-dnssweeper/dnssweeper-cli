/**
 * お名前.com DNSプロバイダー
 */

import { BaseProvider } from './BaseProvider';
import { DNSRecord } from '../types/dns';

export class OnamaeProvider extends BaseProvider {
  name = 'onamae';
  description = 'お名前.com DNS';
  supportedRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS'];
  
  private zoneName: string = '';
  
  /**
   * お名前.com特有のヘッダーを検出
   */
  detect(headers: string[]): boolean {
    const normalizedHeaders = this.normalizeHeaders(headers);
    
    // お名前.comの日本語ヘッダーを検出
    const japaneseHeaders = headers.some(h => 
      h.includes('ホスト名') || 
      h.includes('優先度') || 
      h.includes('タイプ') ||
      h.includes('値'),
    );
    
    // 英語ヘッダーパターン（お名前.comの英語版）
    const hasOnamaePattern = 
      normalizedHeaders.includes('hostname') || 
      normalizedHeaders.includes('host_name') ||
      (normalizedHeaders.includes('type') && normalizedHeaders.includes('value') && normalizedHeaders.includes('priority'));
    
    return japaneseHeaders || hasOnamaePattern;
  }
  
  /**
   * お名前.comのCSV行をパース
   */
  parse(row: any, headers: string[]): DNSRecord | null {
    try {
      // ヘッダーとインデックスのマッピングを作成（日本語対応）
      const headerMap = new Map<string, number>();
      headers.forEach((header, index) => {
        // 日本語ヘッダーを英語に正規化
        const normalizedHeader = this.normalizeJapaneseHeader(header);
        headerMap.set(normalizedHeader.toLowerCase(), index);
      });
      
      // 必須フィールドの取得
      const name = this.getFieldValue(row, headerMap, ['hostname', 'host_name', 'name']);
      const type = this.getFieldValue(row, headerMap, ['type', 'record_type']);
      const content = this.getFieldValue(row, headerMap, ['value', 'content', 'data']);
      const ttl = this.getFieldValue(row, headerMap, ['ttl']);
      const priority = this.getFieldValue(row, headerMap, ['priority', 'preference']);
      
      if (!name || !type || !content) {
        return null;
      }
      
      // お名前.comの相対名を処理（@はルートドメイン）
      const fullName = this.resolveOnamaeName(name);
      
      const record: DNSRecord = {
        name: fullName,
        type: this.normalizeRecordType(type),
        content: content.trim(),
        ttl: this.normalizeTTL(ttl, 3600), // お名前.comのデフォルトは3600秒
      };
      
      // MXレコードの場合は優先度を設定
      if (record.type === 'MX' && priority) {
        record.priority = parseInt(priority);
      }
      
      // SRVレコードの場合は追加フィールドを処理
      if (record.type === 'SRV') {
        // お名前.comのSRVフォーマットから値を抽出
        const srvMatch = content.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
        if (srvMatch) {
          record.priority = parseInt(srvMatch[1]);
          record.weight = parseInt(srvMatch[2]);
          record.port = parseInt(srvMatch[3]);
          record.content = srvMatch[4];
        }
      }
      
      // TXTレコードの引用符を処理
      if (record.type === 'TXT') {
        record.content = this.unquoteTxtValue(record.content);
      }
      
      // CNAMEレコードの末尾のドットを追加（必要な場合）
      if (record.type === 'CNAME' && !record.content.endsWith('.')) {
        record.content += '.';
      }
      
      return this.validate(record) ? record : null;
    } catch (error) {
      console.error('お名前.comパース エラー:', error);
      return null;
    }
  }
  
  /**
   * 日本語ヘッダーを英語に正規化
   */
  private normalizeJapaneseHeader(header: string): string {
    const headerMap: { [key: string]: string } = {
      'ホスト名': 'hostname',
      'タイプ': 'type',
      'TYPE': 'type',
      '値': 'value',
      'VALUE': 'value',
      '優先度': 'priority',
      'TTL': 'ttl',
    };
    
    return headerMap[header.trim()] || header.trim();
  }
  
  /**
   * お名前.comの名前を解決（@をゾーン名に変換など）
   */
  private resolveOnamaeName(name: string): string {
    // @はルートドメインを表す
    if (name === '@') {
      return this.zoneName || name;
    }
    
    // wwwなどの相対名の場合、ゾーン名を追加
    if (!name.includes('.') && this.zoneName) {
      return `${name}.${this.zoneName}`;
    }
    
    return this.normalizeDomainName(name);
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