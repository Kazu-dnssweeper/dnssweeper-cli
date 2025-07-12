/**
 * DNSプロバイダー自動検出
 */

import { DNSProvider, ProviderDetectionResult } from './types';
import { CloudflareProvider } from './CloudflareProvider';
import { Route53Provider } from './Route53Provider';
import { GoogleCloudProvider } from './GoogleCloudProvider';
import { AzureProvider } from './AzureProvider';
import { OnamaeProvider } from './OnamaeProvider';
import { NamecheapProvider } from './NamecheapProvider';

export class ProviderDetector {
  private providers: DNSProvider[];
  
  constructor() {
    // 利用可能なプロバイダーを登録
    this.providers = [
      new CloudflareProvider(),
      new Route53Provider(),
      new GoogleCloudProvider(),
      new AzureProvider(),
      new OnamaeProvider(),
      new NamecheapProvider(),
    ];
  }
  
  /**
   * CSVヘッダーからプロバイダーを自動検出
   */
  detectProvider(headers: string[]): ProviderDetectionResult | null {
    const results: ProviderDetectionResult[] = [];
    
    // 各プロバイダーで検出を試行
    for (const provider of this.providers) {
      if (provider.detect(headers)) {
        // 信頼度を計算
        const confidence = this.calculateConfidence(provider, headers);
        results.push({ provider, confidence });
      }
    }
    
    // 結果がない場合
    if (results.length === 0) {
      return null;
    }
    
    // 信頼度でソートして最も高いものを返す
    results.sort((a, b) => b.confidence - a.confidence);
    return results[0];
  }
  
  /**
   * プロバイダー名で取得
   */
  getProviderByName(name: string): DNSProvider | null {
    const normalizedName = name.toLowerCase();
    return this.providers.find(p => p.name.toLowerCase() === normalizedName) || null;
  }
  
  /**
   * 利用可能なプロバイダーのリストを取得
   */
  getAvailableProviders(): { name: string; description: string }[] {
    return this.providers.map(p => ({
      name: p.name,
      description: p.description,
    }));
  }
  
  /**
   * 検出の信頼度を計算
   */
  private calculateConfidence(provider: DNSProvider, headers: string[]): number {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    let score = 0;
    let maxScore = 0;
    
    // プロバイダー固有のヘッダーをチェック
    const providerSpecificHeaders: { [key: string]: string[] } = {
      'cloudflare': ['proxied', 'proxy_status', 'proxiable'],
      'route53': ['routingpolicy', 'setidentifier', 'healthcheckid', 'alias'],
      'google-cloud': ['dns_name', 'rrdatas', 'kind', 'project_id'],
      'azure': ['resource_group', 'subscription_id', 'recordset', 'tenant_id'],
      'onamae': ['ホスト名', '優先度', 'hostname', 'タイプ'],
      'namecheap': ['host', 'priority'],
    };
    
    const specificHeaders = providerSpecificHeaders[provider.name] || [];
    
    // 特有のヘッダーがある場合は高スコア
    for (const header of specificHeaders) {
      maxScore += 3; // 重みを増やす
      if (normalizedHeaders.some(h => h === header.toLowerCase() || h.includes(header.toLowerCase()))) {
        score += 3;
      }
    }
    
    // ヘッダーの組み合わせパターンをチェック
    const headerPatterns: { [key: string]: string[][] } = {
      'cloudflare': [['name', 'type', 'content', 'proxied']],
      'route53': [['name', 'type', 'value'], ['recordname', 'recordtype', 'value']],
      'google-cloud': [['dns_name', 'record_type', 'ttl', 'rrdatas']],
      'azure': [['name', 'type', 'ttl', 'value', 'resource_group']],
      'namecheap': [['host', 'type', 'value', 'ttl', 'priority']],
      'onamae': [['ホスト名', 'タイプ', '値'], ['hostname', 'type', 'value']],
    };
    
    const patterns = headerPatterns[provider.name] || [];
    for (const pattern of patterns) {
      const matchCount = pattern.filter(h => 
        normalizedHeaders.some(nh => nh === h.toLowerCase() || nh.includes(h.toLowerCase()))
      ).length;
      
      if (matchCount === pattern.length) {
        score += 5; // 完全一致ボーナス
        maxScore += 5;
      } else if (matchCount >= pattern.length * 0.8) {
        score += 3; // 部分一致ボーナス
        maxScore += 5;
      } else {
        maxScore += 5;
      }
    }
    
    // 基本的なヘッダーの存在をチェック
    const basicHeaders = ['name', 'type', 'value', 'content', 'ttl', 'record'];
    for (const header of basicHeaders) {
      maxScore += 1;
      if (normalizedHeaders.some(h => h === header || h.includes(header))) {
        score += 1;
      }
    }
    
    // プロバイダー特有の除外パターン
    const exclusionPatterns: { [key: string]: string[] } = {
      'cloudflare': ['resource_group', 'subscription_id', 'rrdatas'],
      'route53': ['proxied', 'resource_group', 'dns_name'],
      'google-cloud': ['proxied', 'routingpolicy', 'resource_group'],
      'azure': ['proxied', 'rrdatas', 'routingpolicy'],
      'namecheap': ['proxied', 'resource_group', 'rrdatas'],
      'onamae': ['proxied', 'resource_group', 'rrdatas'],
    };
    
    const exclusions = exclusionPatterns[provider.name] || [];
    for (const exclusion of exclusions) {
      if (normalizedHeaders.some(h => h.includes(exclusion.toLowerCase()))) {
        score -= 2; // 他プロバイダーの特徴がある場合はペナルティ
      }
    }
    
    // 信頼度を0-1の範囲で返す（最小0）
    return maxScore > 0 ? Math.max(0, score / maxScore) : 0;
  }
  
  /**
   * CSVファイルの最初の数行からプロバイダーを推測
   */
  async detectFromFileContent(headers: string[], rows: any[]): Promise<ProviderDetectionResult | null> {
    // まずヘッダーから検出を試行
    let result = this.detectProvider(headers);
    
    // ヘッダーだけでは判断できない場合、データの内容も確認
    if (!result || result.confidence < 0.5) {
      // 各プロバイダーでパースを試行して成功率を確認
      const parseResults: ProviderDetectionResult[] = [];
      
      for (const provider of this.providers) {
        let successCount = 0;
        const testRows = rows.slice(0, Math.min(10, rows.length)); // 最初の10行でテスト
        
        for (const row of testRows) {
          try {
            const record = provider.parse(row, headers);
            if (record && provider.validate && provider.validate(record)) {
              successCount++;
            }
          } catch {
            // パースエラーは無視
          }
        }
        
        if (successCount > 0) {
          const confidence = successCount / testRows.length;
          parseResults.push({ provider, confidence });
        }
      }
      
      // 最も成功率の高いプロバイダーを選択
      if (parseResults.length > 0) {
        parseResults.sort((a, b) => b.confidence - a.confidence);
        result = parseResults[0];
      }
    }
    
    return result;
  }
}