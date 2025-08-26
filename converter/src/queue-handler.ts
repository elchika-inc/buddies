import type { MessageBatch, Queue, D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { PetForImage as Pet } from './types';

export interface ConvertMessage {
  type: 'convert_to_webp' | 'optimize_jpeg' | 'generate_thumbnails';
  petId: string;
  petType: 'dog' | 'cat';
  sourceFormat?: 'jpeg' | 'png';
  retryCount?: number;
  timestamp: string;
}

export interface ConverterEnv {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
  PAWMATCH_CONVERT_QUEUE: Queue<ConvertMessage>;
  PAWMATCH_CONVERT_DLQ: Queue<ConvertMessage>;
  CF_IMAGE_RESIZING_URL?: string;
}

export class ConverterQueueHandler {
  constructor(private env: ConverterEnv) {}

  async sendToQueue(message: ConvertMessage): Promise<void> {
    const retryCount = message.retryCount || 0;
    const delaySeconds = retryCount > 0 ? Math.min(30 * Math.pow(2, retryCount), 1800) : 0;
    
    await this.env.PAWMATCH_CONVERT_QUEUE.send(
      { ...message, retryCount },
      { delaySeconds }
    );
  }

  async handleBatch(batch: MessageBatch<ConvertMessage>): Promise<void> {
    for (const message of batch.messages) {
      try {
        await this.processMessage(message.body);
        message.ack();
      } catch (error) {
        await this.handleError(message, error);
      }
    }
  }

  private async processMessage(message: ConvertMessage): Promise<void> {
    console.log(`Processing convert message: ${message.type}`, {
      petId: message.petId,
      retryCount: message.retryCount
    });

    const pet = await this.getPetInfo(message.petId);
    if (!pet) {
      throw new Error(`Pet not found: ${message.petId}`);
    }

    switch (message.type) {
      case 'convert_to_webp':
        await this.convertToWebP(pet, message.petType);
        break;
      case 'optimize_jpeg':
        await this.optimizeJpeg(pet, message.petType);
        break;
      case 'generate_thumbnails':
        await this.generateThumbnails(pet, message.petType);
        break;
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }

    await this.logSuccess(message);
  }

  private async getPetInfo(petId: string): Promise<Pet | null> {
    return await this.env.DB
      .prepare('SELECT id, type, name, has_jpeg, has_webp, source_url FROM pets WHERE id = ?')
      .bind(petId)
      .first<Pet>();
  }

  private async convertToWebP(pet: Pet, petType: string): Promise<void> {
    const jpegKey = `pets/${petType}s/${pet.id}/original.jpg`;
    const webpKey = `pets/${petType}s/${pet.id}/optimized.webp`;

    // WebPが既に存在する場合はスキップ
    if (pet.has_webp) {
      const existing = await this.env.IMAGES_BUCKET.head(webpKey);
      if (existing) {
        console.log(`WebP already exists for ${pet.id}`);
        return;
      }
    }

    // JPEG画像を取得
    const jpegObject = await this.env.IMAGES_BUCKET.get(jpegKey);
    if (!jpegObject) {
      throw new Error(`JPEG not found: ${jpegKey}`);
    }

    const jpegBuffer = await jpegObject.arrayBuffer();
    
    // WebP変換（Cloudflare Image Resizing API使用）
    const webpBuffer = await this.performWebPConversion(jpegBuffer);

    // WebP画像を保存
    await this.env.IMAGES_BUCKET.put(webpKey, webpBuffer, {
      httpMetadata: {
        contentType: 'image/webp'
      },
      customMetadata: {
        sourceKey: jpegKey,
        convertedAt: new Date().toISOString(),
        petId: pet.id,
        originalSize: String(jpegBuffer.byteLength),
        convertedSize: String(webpBuffer.byteLength)
      }
    });

    // DBを更新
    await this.updatePetImageStatus(pet.id, true, true);
    
    console.log(`WebP conversion completed for ${pet.id}`);
  }

  private async optimizeJpeg(pet: Pet, petType: string): Promise<void> {
    const jpegKey = `pets/${petType}s/${pet.id}/original.jpg`;
    const optimizedKey = `pets/${petType}s/${pet.id}/optimized.jpg`;

    const jpegObject = await this.env.IMAGES_BUCKET.get(jpegKey);
    if (!jpegObject) {
      throw new Error(`JPEG not found: ${jpegKey}`);
    }

    const jpegBuffer = await jpegObject.arrayBuffer();
    
    // JPEG最適化
    const optimizedBuffer = await this.performJpegOptimization(jpegBuffer);

    // 最適化済み画像を保存
    await this.env.IMAGES_BUCKET.put(optimizedKey, optimizedBuffer, {
      httpMetadata: {
        contentType: 'image/jpeg'
      },
      customMetadata: {
        sourceKey: jpegKey,
        optimizedAt: new Date().toISOString(),
        petId: pet.id,
        originalSize: String(jpegBuffer.byteLength),
        optimizedSize: String(optimizedBuffer.byteLength)
      }
    });

    console.log(`JPEG optimization completed for ${pet.id}`);
  }

  private async generateThumbnails(pet: Pet, petType: string): Promise<void> {
    const jpegKey = `pets/${petType}s/${pet.id}/original.jpg`;
    const thumbnailSizes = [
      { width: 150, height: 150, suffix: 'thumb-small' },
      { width: 300, height: 300, suffix: 'thumb-medium' },
      { width: 600, height: 600, suffix: 'thumb-large' }
    ];

    const jpegObject = await this.env.IMAGES_BUCKET.get(jpegKey);
    if (!jpegObject) {
      throw new Error(`JPEG not found: ${jpegKey}`);
    }

    const jpegBuffer = await jpegObject.arrayBuffer();

    for (const size of thumbnailSizes) {
      const thumbnailKey = `pets/${petType}s/${pet.id}/${size.suffix}.jpg`;
      const thumbnailBuffer = await this.performThumbnailGeneration(
        jpegBuffer, 
        size.width, 
        size.height
      );

      await this.env.IMAGES_BUCKET.put(thumbnailKey, thumbnailBuffer, {
        httpMetadata: {
          contentType: 'image/jpeg'
        },
        customMetadata: {
          sourceKey: jpegKey,
          generatedAt: new Date().toISOString(),
          petId: pet.id,
          width: String(size.width),
          height: String(size.height)
        }
      });
    }

    console.log(`Thumbnails generated for ${pet.id}`);
  }

  private async performWebPConversion(jpegBuffer: ArrayBuffer): Promise<ArrayBuffer> {
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
    
    // フォールバック: 元の画像を返す
    console.warn('WebP conversion not available, returning original');
    return jpegBuffer;
  }

  private async performJpegOptimization(jpegBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    if (this.env.CF_IMAGE_RESIZING_URL) {
      try {
        const response = await fetch(this.env.CF_IMAGE_RESIZING_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'CF-Polished': 'format=jpeg,quality=85,fit=scale-down,width=1200'
          },
          body: jpegBuffer
        });
        
        if (response.ok) {
          return await response.arrayBuffer();
        }
      } catch (error) {
        console.warn('Image optimization failed:', error);
      }
    }
    
    return jpegBuffer;
  }

  private async performThumbnailGeneration(
    jpegBuffer: ArrayBuffer, 
    width: number, 
    height: number
  ): Promise<ArrayBuffer> {
    if (this.env.CF_IMAGE_RESIZING_URL) {
      try {
        const response = await fetch(this.env.CF_IMAGE_RESIZING_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'CF-Polished': `format=jpeg,quality=80,fit=cover,width=${width},height=${height}`
          },
          body: jpegBuffer
        });
        
        if (response.ok) {
          return await response.arrayBuffer();
        }
      } catch (error) {
        console.warn('Thumbnail generation failed:', error);
      }
    }
    
    return jpegBuffer;
  }

  private async updatePetImageStatus(petId: string, hasJpeg: boolean, hasWebp: boolean): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE pets SET 
        has_jpeg = ?,
        has_webp = ?,
        image_checked_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(hasJpeg ? 1 : 0, hasWebp ? 1 : 0, petId).run();
  }

  private async handleError(message: MessageBatch<ConvertMessage>['messages'][0], error: unknown): Promise<void> {
    console.error('Queue message processing failed:', error);
    
    const retryCount = message.body.retryCount || 0;
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      // Dead Letter Queueに送信
      await this.env.PAWMATCH_CONVERT_DLQ.send({
        ...message.body,
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString()
      } as any);

      await this.logFailure(message.body, error);
      message.ack();
    } else {
      // リトライ可能なエラーかチェック
      const isRetryable = this.isRetryableError(error);
      
      if (isRetryable) {
        await this.sendToQueue({
          ...message.body,
          retryCount: retryCount + 1
        });
        message.ack();
      } else {
        // リトライ不可能なエラーはDLQへ
        await this.env.PAWMATCH_CONVERT_DLQ.send({
          ...message.body,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString()
        } as any);
        message.ack();
      }
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('database is locked') ||
      message.includes('r2') ||
      message.includes('bucket')
    );
  }

  private async logSuccess(message: ConvertMessage): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT INTO conversion_log (
          message_type, 
          pet_id, 
          status, 
          retry_count, 
          completed_at
        ) VALUES (?, ?, 'success', ?, CURRENT_TIMESTAMP)
      `).bind(
        message.type,
        message.petId,
        message.retryCount || 0
      ).run();
    } catch (error) {
      console.error('Failed to log success:', error);
    }
  }

  private async logFailure(message: ConvertMessage, error: unknown): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT INTO conversion_log (
          message_type, 
          pet_id, 
          status, 
          error_message,
          retry_count, 
          completed_at
        ) VALUES (?, ?, 'failed', ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        message.type,
        message.petId,
        error instanceof Error ? error.message : 'Unknown error',
        message.retryCount || 0
      ).run();
    } catch (logError) {
      console.error('Failed to log failure:', logError);
    }
  }
}