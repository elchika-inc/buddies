import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';
import type { MessageBatch, ScheduledEvent, ExecutionContext } from '@cloudflare/workers-types';
import type { Env, DispatchMessage, DLQMessage, PetRecord, PetDispatchData } from './types';
import { isPetRecord } from './types';

const app = new Hono<{ Bindings: Env }>();

// 環境変数の型安全な取得
function getEnv(c: Context<{ Bindings: Env }>): Env {
  if (!c.env) {
    throw new Error('Environment variables not available');
  }
  return c.env;
}

// CORS設定
app.use('*', cors());

// ヘルスチェック
app.get('/', (c) => {
  return c.json({ 
    service: 'PawMatch Dispatcher',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 画像がないペットを取得（API経由）
async function fetchPetsWithoutImages(env: Env, limit = 10): Promise<PetRecord[]> {
  try {
    const apiUrl = env.API_URL || 'https://pawmatch-api.elchika.app';
    const response = await fetch(`${apiUrl}/api/stats`);
    
    if (!response.ok) {
      console.error(`API request failed: ${response.status}`);
      return [];
    }
    
    const data = await response.json() as any;
    
    if (!data.success || !data.data?.missingImages) {
      console.error('Invalid API response structure');
      return [];
    }
    
    // APIレスポンスをPetRecord型に変換（必要なフィールドのみ）
    const pets = data.data.missingImages.slice(0, limit).map((pet: any) => ({
      id: pet.id,
      type: pet.type,
      name: pet.name,
      source_url: pet.sourceUrl, // APIはcamelCase、DBはsnake_case
      has_jpeg: pet.hasJpeg ? 1 : 0,
      has_webp: pet.hasWebp ? 1 : 0
    }));
    
    return pets.filter(isPetRecord);
  } catch (error) {
    console.error('Failed to fetch pets from API:', error);
    return [];
  }
}

// GitHub Actions ワークフローをトリガー
async function triggerGitHubWorkflow(
  env: Env,
  pets: PetRecord[],
  batchId: string
): Promise<Response> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/${env.WORKFLOW_FILE}/dispatches`;
  
  // JSONファイル形式に合わせたデータ構造
  const petsData = pets.map(pet => ({
    id: pet.id,
    name: pet.name,
    sourceUrl: pet.source_url,  // camelCaseに変換
    type: pet.type
  }));
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        // automated-image-pipeline.yml用の入力形式
        batch_data: JSON.stringify(petsData),
        batch_id: batchId,
        limit: String(pets.length)
      }
    })
  });
  
  return response;
}

// 手動トリガー（Queueに送信）
app.post('/dispatch', async (c) => {
  const { limit = 10 } = await c.req.json().catch(() => ({}));
  
  try {
    const env = getEnv(c);
    
    // 画像がないペットを取得（API経由）
    const pets = await fetchPetsWithoutImages(env, limit);
    
    if (pets.length === 0) {
      return c.json({
        success: true,
        message: 'No pets without images found',
        count: 0
      });
    }
    
    // バッチIDを生成
    const batchId = `dispatch-${Date.now()}`;
    
    // Queueにメッセージを送信
    const message: DispatchMessage = {
      type: 'screenshot',
      pets: pets.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        source_url: p.source_url
      })),
      batchId,
      retryCount: 0,
      timestamp: new Date().toISOString()
    };
    
    await env.PAWMATCH_DISPATCH_QUEUE.send(message);
    
    // ディスパッチ履歴をAPIに送信（オプション）
    // TODO: APIに履歴記録エンドポイントを追加する場合はここで呼び出す
    
    return c.json({
      success: true,
      message: 'Batch queued for processing',
      batchId,
      count: pets.length,
      pets: pets.map(p => ({ id: p.id, name: p.name }))
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dispatch error:', error);
    return c.json({
      success: false,
      error: errorMessage
    }, 500);
  }
});

// Cron実行（scheduled） - Queueに送信
app.post('/scheduled', async (c) => {
  console.log('Scheduled dispatch triggered');
  
  try {
    const env = getEnv(c);
    
    // 画像がないペットを取得（API経由、10件に統一）
    const pets = await fetchPetsWithoutImages(env, 10);
    
    if (pets.length === 0) {
      console.log('No pets without images found');
      return c.json({ success: true, message: 'No pets to process' });
    }
    
    // バッチIDを生成
    const batchId = `cron-${new Date().toISOString().split('T')[0]}-${Date.now()}`;
    
    // Queueにメッセージを送信
    const message: DispatchMessage = {
      type: 'screenshot',
      pets: pets.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        source_url: p.source_url
      })),
      batchId,
      retryCount: 0,
      timestamp: new Date().toISOString()
    };
    
    await env.PAWMATCH_DISPATCH_QUEUE.send(message);
    
    // ディスパッチ履歴をAPIに送信（オプション）
    // TODO: APIに履歴記録エンドポイントを追加する場合はここで呼び出す
    
    console.log(`Scheduled dispatch queued: ${pets.length} pets`);
    
    return c.json({
      success: true,
      batchId,
      count: pets.length
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Scheduled dispatch error:', error);
    return c.json({
      success: false,
      error: errorMessage
    }, 500);
  }
});

// ディスパッチ履歴を取得（API経由）
app.get('/history', async (c) => {
  try {
    const env = getEnv(c);
    
    // TODO: APIから履歴を取得するエンドポイントを呼び出す
    // const response = await fetch(`${env.API_URL}/api/dispatch/history`);
    // const data = await response.json();
    
    return c.json({
      success: true,
      message: 'History endpoint not implemented (DB removed)',
      history: []
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('History fetch error:', error);
    return c.json({
      success: false,
      error: errorMessage
    }, 500);
  }
});

// Queue Consumer - GitHub Actionsを呼び出す処理
async function handleQueueBatch(batch: MessageBatch<DispatchMessage>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    try {
      const { type, pets, batchId, retryCount = 0 } = message.body;
      
      console.log(`Processing queue message: ${batchId}, type: ${type}, retry: ${retryCount}`);
      
      // GitHub Actionsをトリガー (petsは既にPetDispatchData[]型として定義されている)
      if (!pets || !Array.isArray(pets)) {
        throw new Error('Invalid pets data in queue message');
      }
      
      // PetDispatchDataをPetRecordに変換
      const petRecords: PetRecord[] = pets.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        source_url: p.source_url,
        has_jpeg: 0, // Queue経由の場合はデフォルト値
        has_webp: 0  // Queue経由の場合はデフォルト値
      }));
      
      const response = await triggerGitHubWorkflow(env, petRecords, batchId);
      
      if (!response.ok) {
        // 429 (Rate Limit) の場合は後でリトライ
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delaySeconds = retryAfter ? parseInt(retryAfter) : 60;
          
          if (retryCount < 3) {
            // リトライメッセージをキューに再送信
            await env.PAWMATCH_DISPATCH_QUEUE.send(
              { ...message.body, retryCount: retryCount + 1 },
              { delaySeconds }
            );
            message.ack(); // 現在のメッセージは処理済みとする
            continue;
          }
        }
        
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      // 成功時の処理
      // TODO: APIに完了通知を送信する場合はここで呼び出す
      console.log(`Batch ${batchId} completed successfully`);
      
      message.ack();
      
    } catch (error) {
      console.error('Queue message processing failed:', error);
      const retryCount = message.body.retryCount || 0;
      
      if (retryCount >= 3) {
        // 最大リトライ回数に達した場合はDLQに送信
        const dlqMessage: DLQMessage = {
          ...message.body,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString()
        };
        await env.PAWMATCH_DISPATCH_DLQ.send(dlqMessage);
        
        // TODO: APIに失敗通知を送信する場合はここで呼び出す
        console.error(`Batch ${message.body.batchId} failed:`, error instanceof Error ? error.message : 'Unknown error');
        
        message.ack();
      } else {
        // リトライ
        message.retry();
      }
    }
  }
}

// クリーンアップ処理（API経由）
async function performDataCleanup(env: Env, ctx: ExecutionContext): Promise<void> {
  console.log('Starting data cleanup process via API');
  
  try {
    // APIのクリーンアップエンドポイントを呼び出す
    const apiUrl = env.API_URL || 'https://pawmatch-api.elchika.app';
    const response = await fetch(`${apiUrl}/api/admin/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.API_KEY ? { 'Authorization': `Bearer ${env.API_KEY}` } : {})
      },
      body: JSON.stringify({
        cleanupType: 'expired',
        includeImages: !!env.R2_BUCKET
      })
    });
    
    if (!response.ok) {
      throw new Error(`API cleanup request failed: ${response.status}`);
    }
    
    const result = await response.json() as any;
    console.log('Cleanup result from API:', result);
    
    // R2から画像削除（必要に応じて）
    if (env.R2_BUCKET && result.expiredImages && Array.isArray(result.expiredImages)) {
      console.log(`Deleting ${result.expiredImages.length} expired images from R2`);
      
      const deletePromises = result.expiredImages.map(async (imageKey: string) => {
        try {
          await env.R2_BUCKET!.delete(imageKey);
        } catch (error) {
          console.error(`Failed to delete image ${imageKey}:`, error);
        }
      });
      
      // バッチで削除（最大10個ずつ）
      const batchSize = 10;
      for (let i = 0; i < deletePromises.length; i += batchSize) {
        await Promise.all(deletePromises.slice(i, i + batchSize));
      }
    }
    
  } catch (error) {
    console.error('Data cleanup failed:', error);
    // エラーログのみ出力（DB接続がないため履歴記録はできない）
  }
}

// Cloudflare Workers のエントリポイント
export default {
  fetch: app.fetch,
  
  async queue(batch: MessageBatch<DispatchMessage>, env: Env): Promise<void> {
    await handleQueueBatch(batch, env);
  },
  
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    try {
      const cronType = event.cron;
      console.log(`Scheduled execution triggered: ${cronType}`);
      
      // cronスケジュールに基づいて処理を分岐
      if (cronType === '0 2 * * *' || cronType === '0 0 2 * * *') {
        // 毎日深夜2時: データクリーンアップ
        await performDataCleanup(env, ctx);
      } else {
        // その他: スクリーンショット処理
        const response = await app.fetch(
          new Request('http://dispatcher/scheduled', {
            method: 'POST'
          }),
          env
        );
        
        const result = await response.json();
        console.log('Scheduled execution result:', result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Scheduled execution error:', errorMessage);
    }
  }
};