import { Context } from 'hono';
import { DataService } from '../services/data-service';
import { ImageManagementService } from '../services/image-management-service';
import { successResponse, errorResponse } from '../utils/response-formatter';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export class HealthController {
  private dataService: DataService;
  private imageService: ImageManagementService;

  constructor(db: D1Database, r2: R2Bucket) {
    this.dataService = new DataService(db, r2);
    this.imageService = new ImageManagementService(db, r2);
  }

  async getHealthStatus(c: Context) {
    return c.json(successResponse({
      service: 'PawMatch API',
      status: 'healthy',
      version: '1.0.0'
    }));
  }

  async getReadinessStatus(c: Context) {
    try {
      const readiness = await this.dataService.getDataReadiness();

      if (!readiness.isReady) {
        return c.json(errorResponse(
          readiness.message,
          'SERVICE_NOT_READY',
          undefined
        ), 503);
      }

      return c.json(successResponse({
        ready: true,
        message: 'Service is ready',
        readiness
      }));

    } catch (error) {
      console.error('Readiness check error:', error);
      return c.json(errorResponse(
        'Error checking readiness',
        'READINESS_CHECK_ERROR'
      ), 503);
    }
  }

  async getStats(c: Context) {
    try {
      const [stats, imageStats, detailedStats] = await Promise.all([
        this.dataService.getPetStatistics(),
        this.imageService.getImageStatistics(),
        this.dataService.getDetailedStatistics()
      ]);

      const missingImages = await this.imageService.getPetsWithMissingImages(10);

      return c.json(successResponse({
        pets: stats,
        images: imageStats,
        byPrefecture: detailedStats.prefectureDistribution,
        recentPets: detailedStats.recentPets,
        missingImages
      }));

    } catch (error) {
      console.error('Stats error:', error);
      return c.json(errorResponse(
        'Failed to get statistics',
        'STATS_ERROR'
      ), 500);
    }
  }
}