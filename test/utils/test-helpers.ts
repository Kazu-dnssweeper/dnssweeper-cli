import { DNSRecord } from '@/types/dns';

// テスト用のモックデータ生成
export function createMockDNSRecord(overrides?: Partial<DNSRecord>): DNSRecord {
  return {
    type: 'A',
    name: 'test.example.com',
    content: '192.168.1.1',
    ttl: 3600,
    created: '2024-01-01T00:00:00Z',
    modified: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// CSVファイルのモック
export function createMockCSVContent(records: DNSRecord[]): string {
  const headers = ['Type', 'Name', 'Content', 'TTL', 'Priority', 'Created', 'Modified'];
  const rows = records.map(r => [
    r.type,
    r.name,
    r.content,
    r.ttl?.toString() || '',
    r.priority?.toString() || '',
    r.created || '',
    r.modified || '',
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// リスクパターンのモックデータ
export function createMockRiskPatterns() {
  return {
    prefixes: {
      high: ['test', 'temp', 'old', 'dev', 'staging'],
      medium: ['backup', 'bak', 'demo', 'tmp'],
      low: ['www', 'mail', 'ftp', 'smtp'],
    },
    suffixes: {
      high: ['.old', '.bak', '.temp', '.test'],
      medium: ['.backup', '.dev', '.staging'],
      low: ['.com', '.net', '.org'],
    },
    keywords: {
      high: ['deprecated', 'obsolete', 'removed'],
      medium: ['legacy', 'archive', 'historical'],
      low: ['production', 'live', 'active'],
    },
    ipPatterns: {
      reserved: [
        '^192\\.168\\.',
        '^10\\.',
        '^172\\.(1[6-9]|2[0-9]|3[0-1])\\.',
        '^127\\.',
      ],
      suspicious: ['^0\\.', '^255\\.'],
    },
  };
}

// テスト用のファイルシステムモック
export function createMockFS() {
  const files = new Map<string, string>();
  
  return {
    readFile: async (path: string): Promise<string> => {
      const content = files.get(path);
      if (!content) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    },
    writeFile: async (path: string, content: string): Promise<void> => {
      files.set(path, content);
    },
    exists: async (path: string): Promise<boolean> => {
      return files.has(path);
    },
    clear: () => files.clear(),
  };
}