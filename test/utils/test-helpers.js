"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockDNSRecord = createMockDNSRecord;
exports.createMockCSVContent = createMockCSVContent;
exports.createMockRiskPatterns = createMockRiskPatterns;
exports.createMockFS = createMockFS;
function createMockDNSRecord(overrides) {
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
function createMockCSVContent(records) {
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
function createMockRiskPatterns() {
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
function createMockFS() {
    const files = new Map();
    return {
        readFile: async (path) => {
            const content = files.get(path);
            if (!content) {
                throw new Error(`ENOENT: no such file or directory, open '${path}'`);
            }
            return content;
        },
        writeFile: async (path, content) => {
            files.set(path, content);
        },
        exists: async (path) => {
            return files.has(path);
        },
        clear: () => files.clear(),
    };
}
//# sourceMappingURL=test-helpers.js.map