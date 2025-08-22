/**
 * Cloudflare Worker - 画像変換専用サービス（リファクタリング版）
 * 
 * petsテーブルのhas_jpeg/has_webpカラムを参照して効率的な画像処理
 */

import type { D1Database, R2Bucket, ExecutionContext, ScheduledEvent } from '@cloudflare/workers-types';
import type { PetForImage as Pet, ImageRequest } from './types';

interface ImageEnv {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  CF_IMAGE_RESIZING_URL?: string;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
}

interface ImageWorker {
  fetch(request: Request, env: ImageEnv, ctx: ExecutionContext): Promise<Response>;
  scheduled(event: ScheduledEvent, env: ImageEnv, ctx: ExecutionContext): Promise<void>;
}

/**
 * 画像処理のメインクラス
 */
class ImageProcessor {
  constructor(private env: ImageEnv) {}

  /**
   * リクエストパスを解析
   */
  parseRequest(url: URL): ImageRequest | null {
    const pathMatch = url.pathname.match(/^\/convert\/pets\/(dog|cat)s\/([^\/]+)\/(webp|jpeg|jpg|auto)$/);
    if (!pathMatch) return null;
    
    const [, petType, petId, format] = pathMatch;
    return {
      petType: petType as 'dog' | 'cat',
      petId,
      format: format as ImageRequest['format']
    };
  }

  /**
   * 実際のフォーマットを決定
   */
  determineFormat(requestedFormat: string, acceptHeader: string | null): 'jpeg' | 'webp' {
    if (requestedFormat === 'auto') {
      return acceptHeader?.includes('image/webp') ? 'webp' : 'jpeg';
    }
    return requestedFormat === 'webp' ? 'webp' : 'jpeg';
  }

  /**
   * ペット情報を取得
   */
  async getPetInfo(petId: string): Promise<Pet | null> {
    return await this.env.DB
      .prepare('SELECT id, type, name, has_jpeg, has_webp, source_url FROM pets WHERE id = ?')
      .bind(petId)
      .first<Pet>();
  }

  /**
   * JPEG画像を処理
   */
  async processJpegRequest(pet: Pet, petType: string): Promise<Response> {
    // JPEGが存在しない場合
    if (!pet.has_jpeg) {
      await this.requestScreenshot(pet);
      return this.createPendingResponse();
    }

    const jpegKey = `pets/${petType}s/${pet.id}/original.jpg`;
    const jpegObject = await this.env.R2_BUCKET.get(jpegKey);

    if (!jpegObject) {
      // R2にないがDBにはある場合、DBを更新
      await this.updatePetImageStatus(pet.id, false, pet.has_webp === 1);
      return new Response('Image file missing', { status: 404 });
    }

    return new Response(jpegObject.body, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'ETag': jpegObject.etag || `"${pet.id}-jpeg"`,
        'X-Image-Source': 'original'
      }
    });
  }

  /**
   * WebP画像を処理
   */
  async processWebpRequest(pet: Pet, petType: string): Promise<Response> {
    const webpKey = `pets/${petType}s/${pet.id}/optimized.webp`;

    // キャッシュされたWebPがある場合
    if (pet.has_webp) {
      const cachedWebp = await this.getCachedWebp(webpKey, pet);
      if (cachedWebp) return cachedWebp;
    }

    // WebPがない場合、JPEGから変換
    return await this.convertJpegToWebp(pet, petType, webpKey);
  }

  /**
   * キャッシュされたWebPを取得
   */
  private async getCachedWebp(webpKey: string, pet: Pet): Promise<Response | null> {
    const webpObject = await this.env.R2_BUCKET.get(webpKey);
    
    if (webpObject) {
      return new Response(webpObject.body, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=604800',
          'ETag': webpObject.etag || '',
          'X-Image-Source': 'cached'
        }
      });
    }

    // R2にないがDBにはある場合、DBを更新
    await this.updatePetImageStatus(pet.id, pet.has_jpeg === 1, false);
    return null;
  }

  /**
   * JPEGからWebPに変換
   */
  private async convertJpegToWebp(pet: Pet, petType: string, webpKey: string): Promise<Response> {
    // JPEGがない場合
    if (!pet.has_jpeg) {
      await this.requestScreenshot(pet);
      return this.createPendingResponse();
    }

    const jpegKey = `pets/${petType}s/${pet.id}/original.jpg`;
    const jpegObject = await this.env.R2_BUCKET.get(jpegKey);

    if (!jpegObject) {
      await this.updatePetImageStatus(pet.id, false, false);
      await this.requestScreenshot(pet);
      return this.createPendingResponse();
    }

    // 変換処理
    console.log(`Converting ${pet.id} to WebP`);
    const jpegBuffer = await jpegObject.arrayBuffer();
    const webpBuffer = await this.convertToWebP(jpegBuffer);

    // 変換した画像を保存
    await this.saveWebpImage(webpKey, webpBuffer, jpegKey, pet.id, jpegBuffer.byteLength);

    // DBのステータスを更新
    await this.updatePetImageStatus(pet.id, true, true);

    return new Response(webpBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=604800',
        'ETag': `"${pet.id}-webp-${Date.now()}"`,
        'X-Image-Source': 'converted'
      }
    });
  }

  /**
   * WebP画像をR2に保存
   */
  private async saveWebpImage(
    webpKey: string, 
    webpBuffer: ArrayBuffer, 
    jpegKey: string, 
    petId: string, 
    jpegSize: number
  ): Promise<void> {
    await this.env.R2_BUCKET.put(webpKey, webpBuffer, {
      httpMetadata: {
        contentType: 'image/webp'
      },
      customMetadata: {
        sourceKey: jpegKey,
        convertedAt: new Date().toISOString(),
        petId: petId,
        compressionRatio: `${(webpBuffer.byteLength / jpegSize * 100).toFixed(1)}%`
      }
    });
  }

  /**
   * WebP変換処理
   */
  private async convertToWebP(jpegBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    // Cloudflare Image Resizing APIを使用する場合
    if (this.env.CF_IMAGE_RESIZING_URL) {
      try {
        const response = await fetch(this.env.CF_IMAGE_RESIZING_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'CF-Polished': 'format=webp,quality=85,fit=scale-down,width=1200'
          },
          body: jpegBuffer
        });
        
        if (response.ok) {
          return await response.arrayBuffer();
        }
      } catch (error) {
        console.warn('Image Resizing API failed:', error);
      }
    }
    
    // Workers内での簡易変換（フォールバック）
    console.warn('Using fallback: returning original JPEG (WebP conversion not available)');
    return jpegBuffer;
  }

  /**
   * ペットの画像ステータスを更新
   */
  private async updatePetImageStatus(petId: string, hasJpeg: boolean, hasWebp: boolean): Promise<void> {
    try {
      await this.env.DB.prepare(`
        UPDATE pets SET 
          has_jpeg = ?,
          has_webp = ?,
          image_checked_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(hasJpeg ? 1 : 0, hasWebp ? 1 : 0, petId).run();
      console.log(`Updated image status for ${petId}: JPEG=${hasJpeg}, WebP=${hasWebp}`);
    } catch (error) {
      console.error(`Failed to update image status for ${petId}:`, error);
    }
  }

  /**
   * スクリーンショットをリクエスト
   */
  private async requestScreenshot(pet: Pet): Promise<void> {
    try {
      // DBにスクリーンショットリクエストを記録
      await this.env.DB.prepare(`
        UPDATE pets SET 
          screenshot_requested_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(pet.id).run();
      
      // GitHub Actions経由でスクリーンショットをトリガー
      await this.triggerScreenshotCapture(pet);
    } catch (error) {
      console.error(`Failed to request screenshot for ${pet.id}:`, error);
    }
  }

  /**
   * GitHub Actionsトリガー
   */
  private async triggerScreenshotCapture(pet: Pet): Promise<void> {
    if (!this.env.GITHUB_TOKEN || !this.env.GITHUB_OWNER || !this.env.GITHUB_REPO) {
      console.log('GitHub Actions not configured');
      return;
    }
    
    try {
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
                sourceUrl: pet.source_url || `https://www.pet-home.jp/${pet.type}s/pn${pet.id.replace('pethome_', '')}/`
              }]),
              batch_id: `single-${pet.id}-${Date.now()}`
            }
          })
        }
      );
      
      if (response.status === 204) {
        console.log(`Screenshot capture triggered for ${pet.id}`);
      }
    } catch (error) {
      console.error('Failed to trigger screenshot:', error);
    }
  }

  /**
   * ペンディングレスポンスを作成
   */
  private createPendingResponse(): Response {
    return new Response('Image not available, screenshot requested', { 
      status: 202,
      headers: { 'Retry-After': '30' }
    });
  }

  /**
   * エラーレスポンスを作成
   */
  createErrorResponse(error: unknown, petId: string): Response {
    console.error(`Error processing image for ${petId}:`, error);
    return new Response(JSON.stringify({ 
      error: 'Image processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * メインのWorker実装
 */
const imageWorker: ImageWorker = {
  async fetch(request: Request, env: ImageEnv, ctx: ExecutionContext): Promise<Response> {
    const processor = new ImageProcessor(env);
    const url = new URL(request.url);
    
    // リクエストを解析
    const imageRequest = processor.parseRequest(url);
    if (!imageRequest) {
      return new Response('Invalid path format', { status: 400 });
    }

    const { petType, petId, format: requestedFormat } = imageRequest;

    try {
      // フォーマットを決定
      const format = processor.determineFormat(
        requestedFormat, 
        request.headers.get('Accept')
      );

      // ペット情報を取得
      const pet = await processor.getPetInfo(petId);
      if (!pet) {
        return new Response('Pet not found in database', { status: 404 });
      }

      // フォーマットに応じて処理
      if (format === 'jpeg') {
        return await processor.processJpegRequest(pet, petType);
      } else if (format === 'webp') {
        return await processor.processWebpRequest(pet, petType);
      }

      return new Response('Unsupported format', { status: 400 });

    } catch (error) {
      return processor.createErrorResponse(error, petId);
    }
  },

  /**
   * 画像ステータス確認用のScheduledイベントハンドラー
   */
  async scheduled(event: ScheduledEvent, env: ImageEnv, ctx: ExecutionContext): Promise<void> {
    console.log('Running DB-based image status check...');
    
    try {
      // DBから画像が不足しているペットを取得
      const missingPets = await env.DB.prepare(`
        SELECT id, type, name, source_url, has_jpeg, has_webp
        FROM pets 
        WHERE has_jpeg = 0 OR has_jpeg IS NULL
        ORDER BY created_at DESC 
        LIMIT 50
      `).all<Pet>();
      
      console.log(`Found ${missingPets.results?.length || 0} pets missing images`);
      
      // 定期的な整合性チェック（サンプル）
      const samplePets = await env.DB.prepare(`
        SELECT id, type, has_jpeg, has_webp
        FROM pets 
        ORDER BY RANDOM() 
        LIMIT 10
      `).all<Pet>();
      
      if (samplePets.results) {
        for (const pet of samplePets.results) {
          const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`;
          const webpKey = `pets/${pet.type}s/${pet.id}/optimized.webp`;
          
          const [jpegExists, webpExists] = await Promise.all([
            env.R2_BUCKET.head(jpegKey).then(r => !!r).catch(() => false),
            env.R2_BUCKET.head(webpKey).then(r => !!r).catch(() => false)
          ]);
          
          // DBとR2の状態が異なる場合は修正
          if ((pet.has_jpeg === 1) !== jpegExists || (pet.has_webp === 1) !== webpExists) {
            const processor = new ImageProcessor(env);
            await processor['updatePetImageStatus'](pet.id, jpegExists, webpExists);
            console.log(`Fixed status for ${pet.id}: JPEG=${jpegExists}, WebP=${webpExists}`);
          }
        }
      }
      
      console.log('Image status check completed');
      
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  }
};

export default imageWorker;