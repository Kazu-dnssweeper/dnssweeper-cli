/**
 * DNSレコードの型定義
 */

export interface DNSRecord {
  name: string;
  type: string;
  content: string;
  ttl: number;
  proxied: boolean;
  created: string;
  modified: string;
}

export interface AnalysisResult {
  record: DNSRecord;
  riskScore: number;
  riskLevel: RiskLevel;
  matchedPatterns: string[];
  reasons: string[];
}

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'safe';

export interface PatternConfig {
  version: string;
  description: string;
  patterns: {
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
  };
  scoring: {
    high: number;
    medium: number;
    low: number;
    base: number;
  };
  thresholds: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    safe: number;
  };
}

export interface AnalysisSummary {
  totalRecords: number;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    safe: number;
  };
  topRiskyRecords: AnalysisResult[];
  processingTime: number;
}
