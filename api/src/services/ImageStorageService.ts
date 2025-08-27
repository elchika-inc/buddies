/**
 * 画像ストレージサービス
 * 
 * R2ストレージとの操作に特化した責任を持つ
 */

import type { R2Bucket } from '@cloudflare/workers-types';

export interface ImageProcessingResult {
  success: boolean;
  format: 'jpeg' | 'webp';
  size: number;
  url: string;
  processingTime: number;
  error?: string;
}

export interface ImageFileInfo {
  size?: number;
  exists: boolean;
  lastModified?: Date;
}

export class ImageStorageService {
  constructor(private readonly r2: R2Bucket) {}

  /**
   * 画像キーを生成
   */
  private getImageKey(petId: string, petType: 'dog' | 'cat', format: 'jpeg' | 'webp'): string {
    const extension = format === 'jpeg' ? 'jpg' : 'webp';
    return format === 'jpeg' 
      ? `pets/${petType}s/${petId}/original.${extension}`
      : `pets/${petType}s/${petId}/optimized.${extension}`;
  }

  /**
   * 画像をR2にアップロード
   */
  async uploadImage(
    petId: string,
    petType: 'dog' | 'cat',
    format: 'jpeg' | 'webp',
    data: ArrayBuffer | ReadableStream,
    metadata?: Record<string, string>
  ): Promise<ImageProcessingResult> {
    const startTime = Date.now();
    
    try {
      const extension = format === 'jpeg' ? 'jpg' : 'webp';
      const key = this.getImageKey(petId, petType, format);

      const uploadResult = await this.r2.put(key, data, {
        httpMetadata: {
          contentType: `image/${format}`
        },
        customMetadata: {
          petId,
          petType,
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      });

      const size = uploadResult.size || 0;
      
      return {
        success: true,
        format,
        size,
        url: `/api/v1/images/${petType}/${petId}.${extension}`,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error(`Failed to upload image for ${petId}:`, error);
      return {
        success: false,
        format,
        size: 0,
        url: '',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 画像を削除
   */
  async deleteImage(
    petId: string,
    petType: 'dog' | 'cat',
    format: 'jpeg' | 'webp'
  ): Promise<boolean> {
    try {
      const key = this.getImageKey(petId, petType, format);
      await this.r2.delete(key);

      console.log(`Deleted ${format} image for ${petId}`);
      return true;

    } catch (error) {
      console.error(`Failed to delete image for ${petId}:`, error);
      return false;
    }
  }

  /**
   * 画像の存在確認とメタデータ取得
   */
  async getImageInfo(
    petId: string,
    petType: 'dog' | 'cat',
    format: 'jpeg' | 'webp'
  ): Promise<ImageFileInfo> {
    try {
      const key = this.getImageKey(petId, petType, format);
      const info = await this.r2.head(key);

      if (!info) {
        return { exists: false };
      }

      return {
        exists: true,
        size: info.size,
        lastModified: info.uploaded
      };

    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * バッチで画像の存在確認
   */
  async checkImageExistence(
    petId: string,
    petType: 'dog' | 'cat'
  ): Promise<{ jpeg: boolean; webp: boolean }> {
    const [jpegExists, webpExists] = await Promise.all([
      this.getImageInfo(petId, petType, 'jpeg').then(info => info.exists),
      this.getImageInfo(petId, petType, 'webp').then(info => info.exists)
    ]);

    return { jpeg: jpegExists, webp: webpExists };
  }

  /**
   * 画像URLを生成
   */
  generateImageUrl(
    petId: string,
    petType: 'dog' | 'cat',
    format: 'jpeg' | 'webp'
  ): string {
    const extension = format === 'jpeg' ? 'jpg' : 'webp';
    return `/api/v1/images/${petType}/${petId}.${extension}`;
  }
}