import type { MessageBatch, Queue } from '@cloudflare/workers-types';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { RetryHandler } from './utils/RetryHandler';
import { PetHomeCrawler } from './crawlers/PetHomeCrawler';

export interface CrawlMessage {
  type: 'crawl_pet' | 'crawl_list' | 'update_pet';
  petId?: string;
  petType?: 'dog' | 'cat';
  pageUrl?: string;
  retryCount?: number;
  timestamp: string;
}

export interface CrawlDLQMessage extends CrawlMessage {
  error: string;
  failedAt: string;
}

interface PetRecord {
  id: string;
  type: 'dog' | 'cat';
  name: string;
  source_url: string;
}

export interface CrawlerEnv {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
  PAWMATCH_CRAWL_QUEUE: Queue<CrawlMessage>;
  PAWMATCH_CRAWL_DLQ: Queue<CrawlMessage>;
  PET_HOME_BASE_URL: string;
  GITHUB_ACTIONS?: string;
}

export class CrawlerQueueHandler {
  private crawler: PetHomeCrawler;

  constructor(private env: CrawlerEnv) {
    this.crawler = new PetHomeCrawler(env);
  }

  async sendToQueue(message: CrawlMessage): Promise<void> {
    const retryCount = message.retryCount || 0;
    const delaySeconds = retryCount > 0 ? Math.min(60 * Math.pow(2, retryCount), 3600) : 0;
    
    await this.env.PAWMATCH_CRAWL_QUEUE.send(
      { ...message, retryCount },
      { delaySeconds }
    );
  }

  async handleBatch(batch: MessageBatch<CrawlMessage>): Promise<void> {
    for (const message of batch.messages) {
      try {
        await this.processMessage(message.body);
        message.ack();
      } catch (error) {
        await this.handleError(message, error);
      }
    }
  }

  private async processMessage(message: CrawlMessage): Promise<void> {
    console.log(`Processing crawl message: ${message.type}`, {
      petId: message.petId,
      retryCount: message.retryCount
    });

    switch (message.type) {
      case 'crawl_pet':
        await this.crawlPet(message);
        break;
      case 'crawl_list':
        await this.crawlList(message);
        break;
      case 'update_pet':
        await this.updatePet(message);
        break;
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }

    await this.logSuccess(message);
  }

  private async crawlPet(message: CrawlMessage): Promise<void> {
    if (!message.petId || !message.petType) {
      throw new Error('petId and petType are required for crawl_pet');
    }

    await RetryHandler.execute(
      async () => {
        // PetHomeCrawlerのcrawlメソッドを使用
        const result = await this.crawler.crawl(message.petType!, {
          limit: 1,
          useDifferential: false
        });
        
        if (!result.success) {
          throw new Error(result.errors?.join(', ') || 'Crawl failed');
        }
      },
      RetryHandler.getHttpRetryConfig()
    );
  }

  private async crawlList(message: CrawlMessage): Promise<void> {
    if (!message.petType) {
      throw new Error('petType is required for crawl_list');
    }

    await RetryHandler.execute(
      async () => {
        // 一覧をクロールして新しいペットを取得
        const result = await this.crawler.crawl(message.petType!, {
          limit: 20,
          useDifferential: true
        });
        
        if (!result.success) {
          throw new Error(result.errors?.join(', ') || 'List crawl failed');
        }
      },
      RetryHandler.getHttpRetryConfig()
    );
  }

  private async updatePet(message: CrawlMessage): Promise<void> {
    if (!message.petId) {
      throw new Error('petId is required for update_pet');
    }

    await RetryHandler.execute(
      async () => {
        const pet = await this.env.DB.prepare(
          'SELECT id, type, name, source_url FROM pets WHERE id = ?'
        ).bind(message.petId).first<PetRecord>();

        if (!pet) {
          throw new Error(`Pet not found: ${message.petId}`);
        }

        // 特定のペットを再クロール
        const result = await this.crawler.crawl(pet.type, {
          limit: 1,
          useDifferential: false
        });
        
        if (!result.success) {
          throw new Error(result.errors?.join(', ') || 'Update failed');
        }
      },
      RetryHandler.getDatabaseRetryConfig()
    );
  }

  private async handleError(message: MessageBatch<CrawlMessage>['messages'][0], error: unknown): Promise<void> {
    console.error('Queue message processing failed:', error);
    
    const retryCount = message.body.retryCount || 0;
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      // Dead Letter Queueに送信
      const dlqMessage: CrawlDLQMessage = {
        ...message.body,
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString()
      };
      await this.env.PAWMATCH_CRAWL_DLQ.send(dlqMessage);

      await this.logFailure(message.body, error);
      message.ack();
    } else {
      // リトライ
      const isRetryableError = this.isRetryableError(error);
      
      if (isRetryableError) {
        await this.sendToQueue({
          ...message.body,
          retryCount: retryCount + 1
        });
        message.ack();
      } else {
        // リトライ不可能なエラーはDLQへ
        const dlqMessage: CrawlDLQMessage = {
          ...message.body,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString()
        };
        await this.env.PAWMATCH_CRAWL_DLQ.send(dlqMessage);
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
      message.includes('database is locked')
    );
  }

  private async logSuccess(message: CrawlMessage): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT INTO crawl_log (
          message_type, 
          pet_id, 
          status, 
          retry_count, 
          completed_at
        ) VALUES (?, ?, 'success', ?, CURRENT_TIMESTAMP)
      `).bind(
        message.type,
        message.petId || null,
        message.retryCount || 0
      ).run();
    } catch (error) {
      console.error('Failed to log success:', error);
    }
  }

  private async logFailure(message: CrawlMessage, error: unknown): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT INTO crawl_log (
          message_type, 
          pet_id, 
          status, 
          error_message,
          retry_count, 
          completed_at
        ) VALUES (?, ?, 'failed', ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        message.type,
        message.petId || null,
        error instanceof Error ? error.message : 'Unknown error',
        message.retryCount || 0
      ).run();
    } catch (logError) {
      console.error('Failed to log failure:', logError);
    }
  }
}