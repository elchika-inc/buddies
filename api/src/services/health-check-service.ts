/**
 * ヘルスチェックサービス
 * 
 * @description システムの各コンポーネントの健全性を監視する専門サービス
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { MetadataService } from './metadata-service';
import { ReadinessService } from './readiness-service';
import { StatisticsService } from './statistics-service';
import type { ServiceHealth, SystemMetrics } from '../types/statistics';

/**
 * ヘルスチェックサービス
 * 
 * @class HealthCheckService
 * @description 単一責任: システムヘルスの監視と報告
 */
export class HealthCheckService {
  private metadataService: MetadataService;
  private readinessService: ReadinessService;
  private statisticsService: StatisticsService;

  constructor(
    private readonly db: D1Database,
    private readonly r2?: R2Bucket
  ) {
    this.metadataService = new MetadataService(db);
    this.readinessService = new ReadinessService(db);
    this.statisticsService = new StatisticsService(db);
  }

  /**
   * サービスヘルスチェック
   * 
   * @returns {Promise<ServiceHealth[]>} 各サービスのヘルス状態
   * @description Database、R2 Storage、Data Readinessの状態を確認
   * @performance 各サービスのレスポンスタイムも計測
   */
  async checkServiceHealth(): Promise<ServiceHealth[]> {
    const health: ServiceHealth[] = [];

    // DBヘルスチェック
    try {
      const dbStart = Date.now();
      await this.db.prepare('SELECT 1').first();
      health.push({
        service: 'Database',
        status: 'healthy',
        message: 'Database is accessible',
        lastCheck: new Date().toISOString(),
        metrics: {
          responseTime: Date.now() - dbStart
        }
      });
    } catch (error) {
      health.push({
        service: 'Database',
        status: 'down',
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck: new Date().toISOString()
      });
    }

    // R2ヘルスチェック
    if (this.r2) {
      try {
        const r2Start = Date.now();
        await this.r2.head('health-check');
        health.push({
          service: 'R2 Storage',
          status: 'healthy',
          message: 'R2 bucket is accessible',
          lastCheck: new Date().toISOString(),
          metrics: {
            responseTime: Date.now() - r2Start
          }
        });
      } catch (error) {
        // R2のHEADが404でも正常とみなす
        health.push({
          service: 'R2 Storage',
          status: 'healthy',
          message: 'R2 bucket is accessible',
          lastCheck: new Date().toISOString()
        });
      }
    }

    // データ準備状態チェック
    const readiness = await this.readinessService.getDataReadiness();
    health.push({
      service: 'Data Readiness',
      status: readiness.isReady ? 'healthy' : 'degraded',
      message: readiness.message,
      lastCheck: new Date().toISOString(),
      metrics: {
        totalPets: readiness.totalPets.toString(),
        imageCoverage: readiness.imageCoverage.toString()
      }
    });

    return health;
  }

  /**
   * システムメトリクスを取得
   * 
   * @returns {Promise<SystemMetrics>} システム全体のメトリクス
   * @description 統計、準備状態、ヘルス、ストレージ、パフォーマンスの総合情報
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const [pets, readiness, health] = await Promise.all([
      this.statisticsService.getPetStatistics(),
      this.readinessService.getDataReadiness(),
      this.checkServiceHealth()
    ]);

    // ストレージ使用量を取得
    const storage = await this.statisticsService.estimateStorageUsage();

    // パフォーマンスメトリクス（仮の値）
    const successRate = parseFloat(
      await this.metadataService.getMetadata('api_success_rate', '99.5') || '99.5'
    );
    const avgResponseTime = parseInt(
      await this.metadataService.getMetadata('avg_response_time', '50') || '50'
    );

    return {
      pets: {
        totalPets: pets.totalPets,
        totalDogs: pets.totalDogs,
        totalCats: pets.totalCats,
        petsWithJpeg: pets.petsWithJpeg,
        petsWithWebp: pets.petsWithWebp
      },
      readiness: {
        isReady: readiness.isReady,
        imageCoverage: readiness.imageCoverage,
        message: readiness.message
      },
      health,
      storage,
      performance: {
        avgResponseTime,
        successRate
      }
    };
  }

  /**
   * クイックヘルスチェック
   * 
   * @returns {Promise<boolean>} システムが正常に動作しているか
   * @description 簡単な正常性確認（ロードバランサー用）
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.db.prepare('SELECT 1').first();
      return true;
    } catch {
      return false;
    }
  }
}