/**
 * CSVパーサー - Cloudflare形式のDNSレコードCSVを解析
 */

import Papa from 'papaparse';
import { promises as fs } from 'fs';
import { DNSRecord } from '../types/dns';

/**
 * CSVファイルからDNSレコードを読み込む
 * @param filePath - CSVファイルのパス
 * @returns DNSレコードの配列
 */
export async function parseDNSRecordsFromCSV(
  filePath: string,
): Promise<DNSRecord[]> {
  try {
    // ファイルの存在確認
    await fs.access(filePath);

    // ファイル読み込み
    const csvContent = await fs.readFile(filePath, 'utf-8');

    // Papa Parseで解析
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
    });

    if (parseResult.errors.length > 0) {
      throw new Error(
        `CSV解析エラー: ${parseResult.errors.map(e => e.message).join(', ')}`,
      );
    }

    // DNSRecordに変換
    const records: DNSRecord[] = parseResult.data.map(
      (row: any, index: number) => {
        try {
          return {
            name: row.Name || '',
            type: row.Type || '',
            content: row.Content || '',
            ttl: parseInt(row.TTL) || 300,
            proxied: row.Proxied === 'true' || row.Proxied === true,
            created: row.Created || '',
            modified: row.Modified || '',
          };
        } catch (error) {
          throw new Error(
            `行${index + 2}の変換エラー: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );

    // 基本的なバリデーション
    const validRecords = records.filter((record, index) => {
      if (!record.name || !record.type) {
        console.warn(
          `警告: 行${index + 2}は必須フィールドが不足しています（Name: ${record.name}, Type: ${record.type}）`,
        );
        return false;
      }
      return true;
    });

    return validRecords;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`CSVファイル読み込みエラー: ${error.message}`);
    }
    throw new Error(`CSVファイル読み込みエラー: ${String(error)}`);
  }
}

/**
 * DNSレコードのバリデーション
 * @param record - 検証するDNSレコード
 * @returns バリデーション結果
 */
export function validateDNSRecord(record: DNSRecord): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!record.name) {
    errors.push('Name フィールドが必須です');
  }

  if (!record.type) {
    errors.push('Type フィールドが必須です');
  }

  if (
    !['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS'].includes(
      record.type,
    )
  ) {
    errors.push(`サポートされていないDNSレコードタイプ: ${record.type}`);
  }

  if (record.ttl < 1 || record.ttl > 86400) {
    errors.push(`TTL値が範囲外です: ${record.ttl} (1-86400)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
