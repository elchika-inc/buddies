/**
 * 統合データサービス（ファサード）
 * 
 * 分割されたサービスへのアクセスを提供する統合インターフェース
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { MetadataService } from './metadata-service';
import { ReadinessService } from './readiness-service';
import { StatisticsService } from './statistics-service';
import { HealthCheckService } from './health-check-service';
import type { DataReadiness, PetStatistics } from '../types/services';
import type { DetailedStatistics, ServiceHealth, SystemMetrics } from '../types/statistics';

/**
 * 統合データサービス（ファサード）
 * 
 * @class DataService
 * @description 分割されたサービスへの統一的なアクセスを提供
 * @pattern Facade Pattern - 複数のサービスを単一のインターフェースで統合
 */
export class DataService {
  private metadataService: MetadataService;
  private readinessService: ReadinessService;
  private statisticsService: StatisticsService;
  private healthCheckService: HealthCheckService;

  constructor(
    private readonly db: D1Database,
    private readonly r2?: R2Bucket
  ) {
    this.metadataService = new MetadataService(db);
    this.readinessService = new ReadinessService(db);
    this.statisticsService = new StatisticsService(db);
    this.healthCheckService = new HealthCheckService(db, r2);
  }

  /**
   * データ準備状態を取得（ReadinessServiceに委譲）
   * 
   * @returns {Promise<DataReadiness>} データ準備状態
   * @delegation ReadinessService
   */
  async getDataReadiness(): Promise<DataReadiness> {
    return this.readinessService.getDataReadiness();
  }

  /**
   * データ準備状態を評価して更新（ReadinessServiceに委譲）
   */
  async evaluateAndUpdateReadiness(): Promise<{ isReady: boolean; imageCoverage: number }> {
    return this.readinessService.evaluateAndUpdateReadiness();
  }

  /**
   * ペット統計情報を取得（StatisticsServiceに委譲）
   * 
   * @returns {Promise<PetStatistics>} ペットの統計情報
   * @delegation StatisticsService
   */
  async getPetStatistics(): Promise<PetStatistics> {
    return this.statisticsService.getPetStatistics();
  }

  /**
   * サービスヘルスチェック（HealthCheckServiceに委譲）
   * 
   * @returns {Promise<ServiceHealth[]>} 各サービスのヘルス状態
   * @delegation HealthCheckService
   */
  async checkServiceHealth(): Promise<ServiceHealth[]> {
    return this.healthCheckService.checkServiceHealth();
  }

  /**
   * システムメトリクスを取得（HealthCheckServiceに委譲）
   * 
   * @delegation HealthCheckService
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    return this.healthCheckService.getSystemMetrics();
  }

  /**
   * 詳細統計を取得（StatisticsServiceに委譲）
   * 
   * @returns {Promise<DetailedStatistics>} 型安全な詳細統計情報
   * @delegation StatisticsService
   */
  async getDetailedStatistics(): Promise<DetailedStatistics> {
    return this.statisticsService.getDetailedStatistics();
  }

  /**
   * メタデータ操作のラッパー
   */
  async getMetadata(key: string, defaultValue?: string): Promise<string | null> {
    return this.metadataService.getMetadata(key, defaultValue);
  }

  async setMetadata(key: string, value: string): Promise<void> {
    return this.metadataService.setMetadata(key, value);
  }

  async deleteMetadata(key: string): Promise<void> {
    return this.metadataService.deleteMetadata(key);
  }

  /**
   * キャッシュクリア
   */
  async clearCache(): Promise<void> {
    await this.metadataService.deleteMetadata('pet_statistics');
    await this.metadataService.deleteMetadata('data_readiness');
    console.log('Cache cleared');
  }
}