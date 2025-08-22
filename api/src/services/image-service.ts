/**
 * Cloudflare Workers - 画像配信・変換サービス
 * 
 * R2に保存されたJPEG画像を動的にWebP変換して配信
 * データベースとの整合性チェックも実施
 */

import type { D1Database, R2Bucket, R2Object } from '@cloudflare/workers-types';

interface ImageEnv {
  R2_BUCKET: R2Bucket;
  DB: D1Database;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  GITHUB_TOKEN?: string;
}

interface Pet {
  id: string;
  type: string;
  name: string;
  source_url: string;
}

interface ImageResult {
  success: boolean;
  body?: ArrayBuffer | ReadableStream;
  contentType?: string;
  headers?: Record<string, string>;
  error?: string;
  status?: number;
}

interface ImageCheckResult {
  petId: string;
  hasData: boolean;
  hasImage: boolean;
  imageSize?: number;
  imageUpdated?: string | null;
}

interface ImageStatusDetail {
  id: string;
  name: string;
  hasJpeg: boolean;
  hasWebp: boolean;
  jpegSize: number;
  webpSize: number;
}

interface ImageStatus {
  totalPets: number;
  withImages: number;
  withoutImages: number;
  withWebP: number;
  details: ImageStatusDetail[];
}

export class ImageService {
  private readonly r2: R2Bucket;
  private readonly db: D1Database;
  private readonly env: ImageEnv;

  constructor(env: ImageEnv) {
    this.env = env;
    this.r2 = env.R2_BUCKET;
    this.db = env.DB;
  }

  /**
   * 画像を取得・変換して配信
   */
  async getImage(petId: string, format: string = 'webp'): Promise<ImageResult> {
    try {
      // データベースでペット情報を確認
      const pet = await this.db
        .prepare('SELECT * FROM pets WHERE id = ?')
        .bind(petId)
        .first<Pet>();
      
      if (!pet) {
        return {
          success: false,
          error: 'Pet not found in database',
          status: 404
        };
      }

      // R2から元画像を取得
      const originalKey = `pets/${pet.type}s/${petId}/original.jpg`;
      const originalObject = await this.r2.get(originalKey);
      
      if (!originalObject) {
        console.log(`Image not found in R2: ${originalKey}`);
        
        // 画像が存在しない場合、GitHub Actionsをトリガー
        await this.triggerScreenshotCapture(pet);
        
        return {
          success: false,
          error: 'Image not found, screenshot requested',
          status: 202 // Accepted
        };
      }

      // フォーマットに応じて処理
      if (format === 'jpeg' || format === 'jpg') {
        // JPEGをそのまま返す
        return {
          success: true,
          body: originalObject.body,
          contentType: 'image/jpeg',
          headers: {
            'Cache-Control': 'public, max-age=86400', // 1日キャッシュ
            'ETag': originalObject.etag || '',
            'Last-Modified': originalObject.uploaded?.toISOString() || new Date().toISOString()
          }
        };
      } else if (format === 'webp') {
        // WebP変換（キャッシュチェック）
        const webpKey = `pets/${pet.type}s/${petId}/optimized.webp`;
        let webpObject = await this.r2.get(webpKey);
        
        if (!webpObject) {
          // WebPが存在しない場合、変換して保存
          console.log(`Converting to WebP: ${petId}`);
          
          const jpegBuffer = await originalObject.arrayBuffer();
          const webpBuffer = await this.convertToWebP(jpegBuffer);
          
          // R2に保存
          await this.r2.put(webpKey, webpBuffer, {
            httpMetadata: {
              contentType: 'image/webp'
            },
            customMetadata: {
              sourceKey: originalKey,
              convertedAt: new Date().toISOString(),
              petId: petId
            }
          });
          
          return {
            success: true,
            body: webpBuffer,
            contentType: 'image/webp',
            headers: {
              'Cache-Control': 'public, max-age=604800', // 7日キャッシュ
              'ETag': `"${Date.now()}"`,
              'Last-Modified': new Date().toISOString()
            }
          };
        }
        
        return {
          success: true,
          body: webpObject.body,
          contentType: 'image/webp',
          headers: {
            'Cache-Control': 'public, max-age=604800', // 7日キャッシュ
            'ETag': webpObject.etag || '',
            'Last-Modified': webpObject.uploaded?.toISOString() || new Date().toISOString()
          }
        };
      } else {
        return {
          success: false,
          error: 'Unsupported format',
          status: 400
        };
      }
      
    } catch (error) {
      console.error(`Error processing image for ${petId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500
      };
    }
  }

  /**
   * JPEGからWebPへ変換（Workers内で実行）
   */
  async convertToWebP(jpegBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    // Cloudflare Image Resizing APIを使用
    const response = await fetch(`https://imagedelivery.net/transform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'CF-Polished': 'format=webp,quality=80'
      },
      body: jpegBuffer
    });
    
    if (!response.ok) {
      // フォールバック: そのまま返す（本番環境では適切な変換サービスを使用）
      console.warn('WebP conversion failed, returning original');
      return jpegBuffer;
    }
    
    return await response.arrayBuffer();
  }

  /**
   * スクリーンショット取得をトリガー
   */
  async triggerScreenshotCapture(pet: Pet): Promise<void> {
    try {
      // GitHub Actionsをトリガー
      const response = await fetch(
        `https://api.github.com/repos/${this.env.GITHUB_OWNER}/${this.env.GITHUB_REPO}/actions/workflows/pet-screenshot.yml/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: {
              pets_batch: JSON.stringify([{
                id: pet.id,
                petId: pet.id.replace('pethome_', ''),
                type: pet.type,
                name: pet.name,
                sourceUrl: pet.source_url
              }]),
              batch_id: `single-${pet.id}-${Date.now()}`
            }
          })
        }
      );
      
      if (response.status === 204) {
        console.log(`Screenshot capture triggered for ${pet.id}`);
      } else {
        console.error(`Failed to trigger screenshot: ${response.status}`);
      }
      
    } catch (error) {
      console.error(`Error triggering screenshot:`, error);
    }
  }

  /**
   * 画像の存在確認（ヘルスチェック用）
   */
  async checkImageAvailability(petIds: string[]): Promise<ImageCheckResult[]> {
    const results: ImageCheckResult[] = [];
    
    for (const petId of petIds) {
      const pet = await this.db
        .prepare('SELECT id, type, name FROM pets WHERE id = ?')
        .bind(petId)
        .first<Pet>();
      
      if (!pet) {
        results.push({
          petId,
          hasData: false,
          hasImage: false
        });
        continue;
      }
      
      const imageKey = `pets/${pet.type}s/${petId}/original.jpg`;
      const imageObject = await this.r2.head(imageKey);
      
      results.push({
        petId,
        hasData: true,
        hasImage: !!imageObject,
        imageSize: imageObject?.size || 0,
        imageUpdated: imageObject?.uploaded?.toISOString() || null
      });
    }
    
    return results;
  }

  /**
   * バッチで画像ステータスを確認
   */
  async getImageStatus(): Promise<ImageStatus> {
    try {
      // データベースから全ペットを取得
      const pets = await this.db
        .prepare('SELECT id, type, name FROM pets WHERE id LIKE "pethome_%" LIMIT 100')
        .all<Pet>();
      
      const stats: ImageStatus = {
        totalPets: pets.results?.length || 0,
        withImages: 0,
        withoutImages: 0,
        withWebP: 0,
        details: []
      };
      
      for (const pet of pets.results || []) {
        const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`;
        const webpKey = `pets/${pet.type}s/${pet.id}/optimized.webp`;
        
        const [jpegExists, webpExists] = await Promise.all([
          this.r2.head(jpegKey),
          this.r2.head(webpKey)
        ]);
        
        if (jpegExists) stats.withImages++;
        else stats.withoutImages++;
        
        if (webpExists) stats.withWebP++;
        
        stats.details.push({
          id: pet.id,
          name: pet.name,
          hasJpeg: !!jpegExists,
          hasWebp: !!webpExists,
          jpegSize: jpegExists?.size || 0,
          webpSize: webpExists?.size || 0
        });
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting image status:', error);
      throw error;
    }
  }
}