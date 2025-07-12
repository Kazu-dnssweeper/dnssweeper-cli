import { DNSRecord } from '@/types/dns';
export declare function createMockDNSRecord(overrides?: Partial<DNSRecord>): DNSRecord;
export declare function createMockCSVContent(records: DNSRecord[]): string;
export declare function createMockRiskPatterns(): {
    prefixes: {
        high: string[];
        medium: string[];
        low: string[];
    };
    suffixes: {
        high: string[];
        medium: string[];
        low: string[];
    };
    keywords: {
        high: string[];
        medium: string[];
        low: string[];
    };
    ipPatterns: {
        reserved: string[];
        suspicious: string[];
    };
};
export declare function createMockFS(): {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
    clear: () => void;
};
//# sourceMappingURL=test-helpers.d.ts.map