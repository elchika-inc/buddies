/**
 * データ準備状態管理サービス
 * 
 * データの準備状況の評価と管理に特化
 */

import type { D1Database } from '@cloudflare/workers-types';
import { MetadataService } from './metadata-service';
import { StatisticsService } from './statistics-service';

interface DataReadiness {
  isReady: boolean;
  totalPets: number;
  totalDogs: number;
  totalCats: number;
  petsWithJpeg: number;
  imageCoverage: number;
  lastSyncAt: string | null;
  message: string;
}

export class DataReadinessService {
  private metadataService: MetadataService;
  private statisticsService: StatisticsService;

  constructor(private readonly db: D1Database) {
    this.metadataService = new MetadataService(db);
    this.statisticsService = new StatisticsService(db);
  }

  /**
   * データ準備状態を評価して更新
   */
  async evaluateAndUpdateReadiness(): Promise<{ isReady: boolean; imageCoverage: number }> {
    const stats = await this.statisticsService.getPetStatistics();
    
    // 設定値を取得
    const minDogs = await this.metadataService.getNumberMetadata('min_required_dogs', 30);
    const minCats = await this.metadataService.getNumberMetadata('min_required_cats', 30);
    const minCoverage = parseFloat(await this.metadataService.getMetadata('min_image_coverage', '0.8') || '0.8');
    
    const imageCoverage = stats.totalPets > 0 
      ? stats.petsWithJpeg / stats.totalPets 
      : 0;

    const isReady = stats.totalDogs >= minDogs && 
                   stats.totalCats >= minCats && 
                   imageCoverage >= minCoverage;

    // メタデータを更新
    await this.metadataService.setMultipleMetadata([
      ['total_pets', stats.totalPets.toString()],
      ['total_dogs', stats.totalDogs.toString()],
      ['total_cats', stats.totalCats.toString()],
      ['pets_with_jpeg', stats.petsWithJpeg.toString()],
      ['pets_with_webp', stats.petsWithWebp.toString()],
      ['data_ready', isReady.toString()],
      ['last_sync_at', new Date().toISOString()]
    ]);
    
    return { isReady, imageCoverage };
  }

  /**
   * データ準備状態を取得
   */
  async getDataReadiness(): Promise<DataReadiness> {
    const isReady = await this.metadataService.getBooleanMetadata('data_ready', false);
    const totalPets = await this.metadataService.getNumberMetadata('total_pets', 0);
    const totalDogs = await this.metadataService.getNumberMetadata('total_dogs', 0);
    const totalCats = await this.metadataService.getNumberMetadata('total_cats', 0);
    const petsWithJpeg = await this.metadataService.getNumberMetadata('pets_with_jpeg', 0);
    const lastSyncAt = await this.metadataService.getMetadata('last_sync_at');

    const minDogs = await this.metadataService.getNumberMetadata('min_required_dogs', 30);
    const minCats = await this.metadataService.getNumberMetadata('min_required_cats', 30);

    const imageCoverage = totalPets > 0 ? petsWithJpeg / totalPets : 0;

    let message: string;
    if (isReady) {
      message = 'Data is ready for use';
    } else {
      const needDogs = Math.max(0, minDogs - totalDogs);
      const needCats = Math.max(0, minCats - totalCats);
      message = `Need ${needDogs} more dogs and ${needCats} more cats`;
    }

    return {
      isReady,
      totalPets,
      totalDogs,
      totalCats,
      petsWithJpeg,
      imageCoverage: Math.round(imageCoverage * 100) / 100,
      lastSyncAt,
      message
    };
  }

  /**
   * 最小要件を設定
   */
  async setMinimumRequirements(minDogs: number, minCats: number, minCoverage: number): Promise<void> {
    await this.metadataService.setMultipleMetadata([
      ['min_required_dogs', minDogs.toString()],
      ['min_required_cats', minCats.toString()],
      ['min_image_coverage', minCoverage.toString()]
    ]);
  }
}