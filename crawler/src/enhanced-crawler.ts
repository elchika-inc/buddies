import { RetryHandler } from './utils/RetryHandler';
import type { ICrawler } from './interfaces/ICrawler';

export class EnhancedCrawler {
  private retryHandler = RetryHandler;

  async crawlWithRetry(crawler: ICrawler, url: string): Promise<any> {
    return await this.retryHandler.execute(
      async () => {
        const result = await crawler.crawlPage(url);
        if (!result.success) {
          throw new Error(result.error || 'Crawl failed');
        }
        return result;
      },
      {
        maxAttempts: 3,
        delayMs: 2000,
        backoffMultiplier: 2,
        retryableErrors: (error) => {
          const message = error instanceof Error ? error.message : String(error);
          return (
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('503') ||
            message.includes('429')
          );
        }
      }
    );
  }

  async saveImageWithRetry(
    imageUrl: string, 
    bucketKey: string, 
    bucket: R2Bucket
  ): Promise<void> {
    return await this.retryHandler.execute(
      async () => {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Image fetch failed: ${response.status}`);
        }
        
        const buffer = await response.arrayBuffer();
        await bucket.put(bucketKey, buffer, {
          httpMetadata: {
            contentType: response.headers.get('content-type') || 'image/jpeg'
          }
        });
      },
      RetryHandler.getHttpRetryConfig()
    );
  }

  async updateDatabaseWithRetry(
    db: D1Database,
    petId: string,
    data: any
  ): Promise<void> {
    return await this.retryHandler.execute(
      async () => {
        const result = await db.prepare(`
          UPDATE pets 
          SET name = ?, breed = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(data.name, data.breed, petId).run();
        
        if (!result.success) {
          throw new Error('Database update failed');
        }
      },
      RetryHandler.getDatabaseRetryConfig()
    );
  }
}