/**
 * 統合画像管理サービス（リファクタ済み）
 * 
 * 責任分離により以下のサービスに分割：
 * - ImageStatusService: 画像ステータス管理
 * - ImageStorageService: R2ストレージ操作
 * - ImageStatisticsService: 統計生成
 * - ImageBatchService: バッチ処理
 * 
 * 既存コードとの互換性のためファサードパターンを使用
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { ImageManagementFacade } from './ImageManagementFacade';

// 既存のインターフェースをエクスポート（互換性維持）
export interface ImageStatus {
  petId: string;
  hasJpeg: boolean;
  hasWebp: boolean;
  jpegSize?: number;
  webpSize?: number;
  jpegUrl?: string;
  webpUrl?: string;
  lastChecked: string;
  screenshotRequestedAt?: string;
  screenshotCompletedAt?: string;
}

export interface ImageProcessingResult {
  success: boolean;
  format: 'jpeg' | 'webp';
  size: number;
  url: string;
  processingTime: number;
  error?: string;
}

export interface BatchImageUpdate {
  totalPets: number;
  processed: number;
  updated: number;
  failed: number;
  errors: string[];
}

export interface ImageStatistics {
  total_pets: number;
  pets_with_jpeg: number;
  pets_with_webp: number;
  pets_with_both: number;
  pets_without_images: number;
  screenshots_requested: number;
  screenshots_completed: number;
  coverage: {
    jpeg: string | number;
    webp: string | number;
    both: string | number;
  };
  storage: {
    jpegStorageMB: string;
    webpStorageMB: string;
    totalStorageMB: string;
  };
}

export interface PetWithMissingImage {
  id: string;
  type: 'dog' | 'cat';
  name: string;
  source_url: string;
  has_jpeg: number;
  has_webp: number;
}

/**
 * 既存コードとの互換性を保つためのラッパークラス
 */
export class ImageManagementService extends ImageManagementFacade {
  constructor(
    private readonly db: D1Database,
    private readonly r2: R2Bucket
  ) {
    super(db, r2);
  }

}