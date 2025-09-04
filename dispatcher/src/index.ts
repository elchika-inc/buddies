/**
 * PawMatch Dispatcher - Cloudflare Workers Entry Point
 * 
 * このモジュールは、画像処理が必要なペットを検出し、
 * GitHub Actionsワークフローをトリガーして画像変換を実行します。
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';
import type { MessageBatch, ScheduledEvent } from '@cloudflare/workers-types';
import type { Env, DispatchMessage } from './types';
import { isErr } from './types/result';
import { ApiService } from './services/api-service';
import { QueueService } from './services/queue-service';
import { QueueHandler } from './handlers/queue-handler';

const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use('*', cors());

/**
 * ヘルスチェックエンドポイント
 */
app.get('/', (c) => {
  return c.json({ 
    service: 'PawMatch Dispatcher',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

/**
 * ペット処理バッチを作成・送信する共通処理
 */
async function createAndSendBatch(
  env: Env,
  limit: number,
  prefix: 'dispatch' | 'cron'
): Promise<{
  success: boolean;
  batchId?: string;
  count?: number;
  message?: string;
  error?: string;
  pets?: Array<{ id: string; name: string }>;
}> {
  try {
    const apiService = new ApiService(env);
    const queueService = new QueueService(env);
    
    // 画像がないペットを取得
    const result = await apiService.fetchPetsWithoutImages(limit);
    
    if (isErr(result)) {
      return {
        success: false,
        error: result.error.message
      };
    }
    
    const pets = result.data;
    
    if (pets.length === 0) {
      return {
        success: true,
        message: 'No pets without images found',
        count: 0
      };
    }
    
    // バッチIDを生成
    const batchId = QueueService.generateBatchId(prefix);
    
    // PetRecordをPetDispatchDataに変換
    const petDispatchData = pets.map(QueueService.convertPetRecordToDispatchData);
    
    // Queueにメッセージを送信
    const sendResult = await queueService.sendDispatchMessage(petDispatchData, batchId);
    
    if (isErr(sendResult)) {
      return {
        success: false,
        error: sendResult.error.message
      };
    }
    
    return {
      success: true,
      batchId,
      count: pets.length,
      message: 'Batch queued for processing',
      pets: pets.map(p => ({ id: p.id, name: p.name }))
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * 手動ディスパッチエンドポイント
 */
app.post('/dispatch', async (c: Context<{ Bindings: Env }>) => {
  let requestData: { limit?: number } = {};
  
  try {
    const rawData = await c.req.json();
    if (rawData && typeof rawData === 'object' && 'limit' in rawData) {
      const limit = (rawData as Record<string, unknown>)['limit'];
      if (typeof limit === 'number' && limit > 0 && limit <= 100) {
        requestData.limit = limit;
      }
    }
  } catch {
    // JSONパースエラーは無視してデフォルト値を使用
  }
  
  const { limit = 30 } = requestData;
  const result = await createAndSendBatch(c.env, limit, 'dispatch');
  
  if (result.success) {
    return c.json(result);
  } else {
    console.error('Dispatch error:', result.error);
    return c.json(result, 500);
  }
});

/**
 * 定期実行エンドポイント（Cron用）
 */
app.post('/scheduled', async (c: Context<{ Bindings: Env }>) => {
  console.log('Scheduled dispatch triggered');
  
  const result = await createAndSendBatch(c.env, 30, 'cron');
  
  if (result.success) {
    console.log(`Scheduled dispatch completed: ${result.count} pets`);
    return c.json(result);
  } else {
    console.error('Scheduled dispatch error:', result.error);
    return c.json(result, 500);
  }
});

/**
 * ディスパッチ履歴エンドポイント（将来の実装用）
 */
app.get('/history', async (c: Context<{ Bindings: Env }>) => {
  return c.json({
    success: true,
    message: 'History endpoint not yet implemented',
    history: []
  });
});

/**
 * Cloudflare Workers エクスポート
 */
export default {
  /**
   * HTTPリクエストハンドラー
   */
  fetch: app.fetch,
  
  /**
   * Queueコンシューマー
   */
  async queue(batch: MessageBatch<DispatchMessage>, env: Env): Promise<void> {
    const handler = new QueueHandler(env);
    await handler.handleBatch(batch);
  },
  
  /**
   * Cronジョブハンドラー
   */
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    try {
      console.log(`Scheduled execution triggered: ${event.cron}`);
      
      // /scheduledエンドポイントを呼び出し
      const response = await app.fetch(
        new Request('http://dispatcher/scheduled', {
          method: 'POST'
        }),
        env
      );
      
      const result = await response.json();
      console.log('Scheduled execution result:', result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Scheduled execution error:', errorMessage);
    }
  }
};