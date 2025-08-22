import { Context } from 'hono';
import { DataReadinessService } from '../services/data-readiness-service';
import { StatisticsService } from '../services/statistics-service';
import { ImageStatusService } from '../services/image-status-service';
import { successResponse, errorResponse } from '../utils/response-formatter';

export class HealthController {
  private dataReadinessService: DataReadinessService;
  private statisticsService: StatisticsService;
  private imageStatusService: ImageStatusService;

  constructor(private db: D1Database, private r2: R2Bucket) {
    this.dataReadinessService = new DataReadinessService(db);
    this.statisticsService = new StatisticsService(db);
    this.imageStatusService = new ImageStatusService(db);
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
      const readiness = await this.dataReadinessService.getDataReadiness();

      if (!readiness.isReady) {
        return c.json(errorResponse(
          readiness.message,
          'SERVICE_NOT_READY',
          { readiness }
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
      const [stats, imageStats, recentPets, missingImages] = await Promise.all([
        this.statisticsService.getPetStatistics(),
        this.imageStatusService.getImageStatistics(),
        this.statisticsService.getRecentPets(10),
        this.imageStatusService.getPetsWithMissingImages(10)
      ]);

      const prefectureStats = await this.statisticsService.getStatsByPrefecture();

      return c.json(successResponse({
        pets: stats,
        images: imageStats,
        byPrefecture: prefectureStats,
        recentPets,
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