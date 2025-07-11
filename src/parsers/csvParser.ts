/**
 * CSVパーサー - 各種DNSプロバイダー形式のCSVを解析
 */

import Papa from 'papaparse';
import { promises as fs } from 'fs';
import { DNSRecord } from '../types/dns';
import { ProviderDetector } from '../providers/ProviderDetector';
import { DNSProvider } from '../providers/types';

/**
 * CSVファイルからDNSレコードを読み込む
 * @param filePath - CSVファイルのパス
 * @param providerName - プロバイダー名（省略時は自動検出）
 * @returns DNSレコードの配列
 */
export async function parseDNSRecordsFromCSV(
  filePath: string,
  providerName?: string,
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

    const headers = Object.keys(parseResult.data[0] || {});
    const rows = parseResult.data as Record<string, any>[];

    // プロバイダーの検出または取得
    const detector = new ProviderDetector();
    let provider: DNSProvider | null = null;

    if (providerName) {
      // プロバイダー名が指定されている場合
      provider = detector.getProviderByName(providerName);
      if (!provider) {
        throw new Error(`不明なプロバイダー: ${providerName}`);
      }
    } else {
      // 自動検出
      const detectionResult = await detector.detectFromFileContent(headers, rows.slice(0, 10));
      if (!detectionResult) {
        // Cloudflareをデフォルトとして使用
        console.warn('プロバイダーを自動検出できませんでした。Cloudflare形式として処理します。');
        provider = detector.getProviderByName('cloudflare');
      } else {
        provider = detectionResult.provider;
        if (!process.argv.includes('--output') || !process.argv.includes('json')) {
          console.log(`${provider.description}形式として検出されました（信頼度: ${Math.round(detectionResult.confidence * 100)}%）`);
        }
      }
    }

    if (!provider) {
      throw new Error('プロバイダーを特定できませんでした');
    }

    // DNSRecordに変換
    const records: DNSRecord[] = [];
    
    rows.forEach((row: Record<string, any>, index: number) => {
      try {
        const record = provider.parse(row, headers);
        if (record) {
          // プロバイダー情報を追加
          record.provider = provider.name;
          records.push(record);
        } else {
          console.warn(`警告: 行${index + 2}をパースできませんでした`);
        }
      } catch (error) {
        console.warn(
          `警告: 行${index + 2}の変換エラー: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    return records;
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
    !['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA', 'SPF'].includes(
      record.type,
    )
  ) {
    errors.push(`サポートされていないDNSレコードタイプ: ${record.type}`);
  }

  if (record.ttl < 1 || record.ttl > 2147483647) {
    errors.push(`TTL値が範囲外です: ${record.ttl} (1-2147483647)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 利用可能なプロバイダーのリストを取得
 */
export function getAvailableProviders(): { name: string; description: string }[] {
  const detector = new ProviderDetector();
  return detector.getAvailableProviders();
}