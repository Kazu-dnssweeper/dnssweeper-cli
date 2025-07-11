/**
 * DNSレコードの型定義
 */

export interface DNSRecord {
  // 基本フィールド（全プロバイダー共通）
  name: string;
  type: string;
  content: string;
  ttl: number;
  
  // Cloudflare固有
  proxied?: boolean;
  proxiable?: boolean;
  created?: string;
  modified?: string;
  comment?: string | undefined;
  
  // Route 53固有
  routingPolicy?: string | undefined;
  setIdentifier?: string | undefined;
  healthCheckId?: string | undefined;
  additionalValues?: string[];
  
  // Google Cloud DNS固有
  kind?: string | undefined;
  signatureRrdatas?: string | undefined;
  
  // Azure DNS固有
  resourceGroup?: string | undefined;
  subscriptionId?: string | undefined;
  metadata?: string | undefined;
  
  // MX/SRVレコード用
  priority?: number;
  weight?: number;
  port?: number;
  
  // プロバイダー情報
  provider?: string;
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
  detectedProvider?: string;
}