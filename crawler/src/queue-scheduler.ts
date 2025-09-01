/**
 * Queue Scheduler
 * Cron TriggerからQueueにメッセージを送信する
 */

import { Env } from './types';

export interface CrawlQueueMessage {
  petType: 'cat' | 'dog';
  timestamp: string;
  options: {
    limit: number;
    useDifferential: boolean;
    minFetchCount: number;
    maxPages: number;
  };
}

export class QueueScheduler {
  constructor(private env: Env) {}

  /**
   * CronトリガーからQueueにメッセージを送信
   */
  async scheduleCrawl(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log('Queue Scheduler triggered at:', timestamp);

    const crawlOptions = {
      limit: 10,
      useDifferential: true,
      minFetchCount: 5,
      maxPages: 5
    };

    // 猫と犬それぞれのQueueにメッセージを送信
    const catMessage: CrawlQueueMessage = {
      petType: 'cat',
      timestamp,
      options: crawlOptions
    };

    const dogMessage: CrawlQueueMessage = {
      petType: 'dog',
      timestamp,
      options: crawlOptions
    };

    // Queue送信（並列）
    const results = await Promise.allSettled([
      this.env.PAWMATCH_CAT_QUEUE?.send(catMessage),
      this.env.PAWMATCH_DOG_QUEUE?.send(dogMessage)
    ]);

    results.forEach((result, index) => {
      const petType = index === 0 ? 'cat' : 'dog';
      if (result.status === 'fulfilled') {
        console.log(`✅ ${petType} crawl queued successfully`);
      } else {
        console.error(`❌ Failed to queue ${petType} crawl:`, result.reason);
      }
    });
  }

  /**
   * Queue Consumerで実際のクロール処理を実行
   */
  async processCrawlQueue(batch: MessageBatch<CrawlQueueMessage>, petType: 'cat' | 'dog'): Promise<void> {
    console.log(`Processing ${petType} queue: ${batch.messages.length} messages`);

    for (const message of batch.messages) {
      try {
        const { options, timestamp } = message.body;
        console.log(`Processing ${petType} crawl from ${timestamp}`);

        // CrawlerFactoryを使ってクロール実行
        const { CrawlerFactory } = await import('./CrawlerFactory');
        const crawler = CrawlerFactory.createCrawler('pet-home', this.env);
        
        const result = await crawler.crawl(petType, options);
        console.log(`${petType} crawl completed:`, result);

        // メッセージを確認済みにする
        message.ack();
      } catch (error) {
        console.error(`Failed to process ${petType} crawl:`, error);
        // エラーの場合、メッセージをリトライ
        message.retry();
      }
    }
  }
}