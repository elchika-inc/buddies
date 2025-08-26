import type { MessageBatch, Queue } from '@cloudflare/workers-types';

export interface DispatchMessage {
  type: 'screenshot' | 'crawl' | 'convert';
  petId: string;
  petType: 'dog' | 'cat';
  sourceUrl?: string;
  retryCount?: number;
  maxRetries?: number;
}

export interface DispatchEnv {
  DB: D1Database;
  PAWMATCH_DISPATCH_QUEUE: Queue<DispatchMessage>;
  PAWMATCH_DISPATCH_DLQ?: Queue<DispatchMessage>;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
}

export class QueueHandler {
  constructor(private env: DispatchEnv) {}

  async sendToQueue(message: DispatchMessage): Promise<void> {
    await this.env.PAWMATCH_DISPATCH_QUEUE.send({
      ...message,
      retryCount: message.retryCount || 0,
      maxRetries: message.maxRetries || 3
    }, {
      delaySeconds: message.retryCount ? Math.min(60 * Math.pow(2, message.retryCount), 3600) : 0
    });
  }

  async handleBatch(batch: MessageBatch<DispatchMessage>): Promise<void> {
    for (const message of batch.messages) {
      try {
        await this.processMessage(message.body);
        message.ack();
      } catch (error) {
        console.error('Message processing failed:', error);
        
        const retryCount = (message.body.retryCount || 0) + 1;
        const maxRetries = message.body.maxRetries || 3;
        
        if (retryCount < maxRetries) {
          await this.sendToQueue({
            ...message.body,
            retryCount
          });
          message.ack();
        } else {
          if (this.env.PAWMATCH_DISPATCH_DLQ) {
            await this.env.PAWMATCH_DISPATCH_DLQ.send(message.body);
          }
          message.retry();
        }
      }
    }
  }

  private async processMessage(message: DispatchMessage): Promise<void> {
    switch (message.type) {
      case 'screenshot':
        await this.triggerScreenshot(message);
        break;
      case 'crawl':
        await this.triggerCrawl(message);
        break;
      case 'convert':
        await this.triggerConvert(message);
        break;
    }
    
    await this.env.DB.prepare(`
      INSERT INTO dispatch_log (pet_id, action_type, status, retry_count, created_at)
      VALUES (?, ?, 'completed', ?, CURRENT_TIMESTAMP)
    `).bind(message.petId, message.type, message.retryCount || 0).run();
  }

  private async triggerScreenshot(message: DispatchMessage): Promise<void> {
    const response = await fetch(
      `https://api.github.com/repos/${this.env.GITHUB_OWNER}/${this.env.GITHUB_REPO}/actions/workflows/pet-screenshot.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            pets_batch: JSON.stringify([{
              id: message.petId,
              type: message.petType,
              sourceUrl: message.sourceUrl
            }]),
            batch_id: `queue-${Date.now()}`
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API failed: ${response.status}`);
    }
  }

  private async triggerCrawl(message: DispatchMessage): Promise<void> {
    const response = await fetch('https://pawmatch-crawler.workers.dev/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        petId: message.petId,
        petType: message.petType
      })
    });

    if (!response.ok) {
      throw new Error(`Crawler failed: ${response.status}`);
    }
  }

  private async triggerConvert(message: DispatchMessage): Promise<void> {
    const response = await fetch('https://pawmatch-image-converter.workers.dev/convert/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        petIds: [message.petId]
      })
    });

    if (!response.ok) {
      throw new Error(`Converter failed: ${response.status}`);
    }
  }
}