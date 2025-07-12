/**
 * Namecheap DNSプロバイダー
 */

import { BaseProvider } from './BaseProvider';
import { DNSRecord, RawCSVRecord } from '../types/dns';

export class NamecheapProvider extends BaseProvider {
  name = 'namecheap';
  description = 'Namecheap DNS Provider';
  
  /**
   * NamecheapのCSVフォーマットを検出
   * Host, Type, Value, TTL, Priority
   */
  detect(headers: string[]): boolean {
    const normalized = headers.map(h => h.toLowerCase().trim());
    
    // Namecheap特有のヘッダー構成をチェック
    const hasHost = normalized.includes('host');
    const hasType = normalized.includes('type');
    const hasValue = normalized.includes('value');
    const hasTTL = normalized.includes('ttl');
    const hasPriority = normalized.includes('priority');
    
    // Host, Type, Value, TTLの組み合わせはNamecheapの典型的なパターン
    return hasHost && hasType && hasValue && hasTTL && hasPriority;
  }
  
  /**
   * Namecheap形式のレコードをパース
   */
  parse(row: RawCSVRecord, headers: string[]): DNSRecord | null {
    const getValue = this.createGetValue(row, headers);
    
    // 必須フィールドの取得
    const host = getValue(['host', 'hostname']);
    const type = getValue(['type', 'record_type']);
    const value = getValue(['value', 'target', 'content']);
    const ttl = getValue(['ttl']);
    
    if (!host || !type || !value) {
      return null;
    }
    
    // オプションフィールド
    const priority = getValue(['priority', 'mx_priority']);
    
    return {
      name: host,
      type: type.toUpperCase(),
      value: value,
      ttl: ttl ? parseInt(ttl, 10) : 1800, // Namecheapのデフォルトは1800秒
      ...(priority && { priority: parseInt(priority, 10) }),
      provider: this.name,
    };
  }
  
  /**
   * レコードのバリデーション
   */
  validate(record: DNSRecord): boolean {
    // 基本的なバリデーション
    if (!super.validate(record)) {
      return false;
    }
    
    // Namecheap特有のバリデーション
    // TTLは60以上（Namecheapの最小値）
    if (record.ttl && record.ttl < 60) {
      return false;
    }
    
    // ホスト名の制限（Namecheapは@でルートドメインを表す）
    if (record.name === '@' || record.name.includes('@')) {
      // これは有効
      return true;
    }
    
    return true;
  }
  
  /**
   * エクスポート形式への変換
   */
  export(records: DNSRecord[]): string {
    const headers = ['Host', 'Type', 'Value', 'TTL', 'Priority'];
    const rows = [headers];
    
    for (const record of records) {
      const row = [
        record.name,
        record.type,
        record.value,
        record.ttl?.toString() || '1800',
        record.priority?.toString() || '',
      ];
      rows.push(row);
    }
    
    return rows.map(row => row.join(',')).join('\n');
  }
}