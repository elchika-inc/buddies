import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';
import type { MessageBatch, Queue } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  PAWMATCH_DISPATCH_QUEUE: Queue<DispatchMessage>;
  PAWMATCH_DISPATCH_DLQ: Queue<DispatchMessage>;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  WORKFLOW_FILE: string;
  API_URL: string;
  [key: string]: unknown;
}

interface DispatchMessage {
  type: 'screenshot' | 'crawl' | 'convert';
  pets: Array<{
    id: string;
    name: string;
    type: 'dog' | 'cat';
    source_url: string;
  }>;
  batchId: string;
  retryCount?: number;
  timestamp: string;
}

interface PetRecord {
  id: string;
  type: 'dog' | 'cat';
  name: string;
  source_url: string;
  has_jpeg: number;
  has_webp: number;
}

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

// 画像がないペットを取得
async function fetchPetsWithoutImages(db: D1Database, limit = 10): Promise<PetRecord[]> {
  const query = `
    SELECT id, type, name, source_url, has_jpeg, has_webp
    FROM pets
    WHERE has_jpeg = 0 OR has_webp = 0
    ORDER BY created_at DESC
    LIMIT ?
  `;
  
  const result = await db.prepare(query).bind(limit).all();
  return (result.results || []) as unknown as PetRecord[];
}

// GitHub Actions ワークフローをトリガー
async function triggerGitHubWorkflow(
  env: Env,
  pets: PetRecord[],
  batchId: string
): Promise<Response> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/${env.WORKFLOW_FILE}/dispatches`;
  
  const petsData = pets.map(pet => ({
    id: pet.id,
    name: pet.name,
    sourceUrl: pet.source_url,
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
        pets_batch: JSON.stringify(petsData),
        batch_id: batchId
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
    
    // 画像がないペットを取得
    const pets = await fetchPetsWithoutImages(env.DB, limit);
    
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
    
    // ディスパッチ履歴を記録
    await env.DB.prepare(`
      INSERT INTO dispatch_history (batch_id, pet_count, status, created_at)
      VALUES (?, ?, 'queued', CURRENT_TIMESTAMP)
    `).bind(batchId, pets.length).run();
    
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
    
    // 画像がないペットを取得（自動実行時は20件）
    const pets = await fetchPetsWithoutImages(env.DB, 20);
    
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
    
    // ディスパッチ履歴を記録
    await env.DB.prepare(`
      INSERT INTO dispatch_history (batch_id, pet_count, status, created_at)
      VALUES (?, ?, 'scheduled_queued', CURRENT_TIMESTAMP)
    `).bind(batchId, pets.length).run();
    
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

// ディスパッチ履歴を取得
app.get('/history', async (c) => {
  try {
    const env = getEnv(c);
    
    const result = await env.DB.prepare(`
      SELECT * FROM dispatch_history
      ORDER BY created_at DESC
      LIMIT 50
    `).all();
    
    return c.json({
      success: true,
      history: result.results
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
      
      // GitHub Actionsをトリガー
      const response = await triggerGitHubWorkflow(env, pets as PetRecord[], batchId);
      
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
      await env.DB.prepare(`
        UPDATE dispatch_history 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
        WHERE batch_id = ?
      `).bind(batchId).run();
      
      message.ack();
      
    } catch (error) {
      console.error('Queue message processing failed:', error);
      const retryCount = message.body.retryCount || 0;
      
      if (retryCount >= 3) {
        // 最大リトライ回数に達した場合はDLQに送信
        await env.PAWMATCH_DISPATCH_DLQ.send({
          ...message.body,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString()
        } as any);
        
        await env.DB.prepare(`
          UPDATE dispatch_history 
          SET status = 'failed', error = ?, completed_at = CURRENT_TIMESTAMP 
          WHERE batch_id = ?
        `).bind(
          error instanceof Error ? error.message : 'Unknown error',
          message.body.batchId
        ).run();
        
        message.ack();
      } else {
        // リトライ
        message.retry();
      }
    }
  }
}

// Cloudflare Workers のエントリポイント
export default {
  fetch: app.fetch,
  
  async queue(batch: MessageBatch<DispatchMessage>, env: Env): Promise<void> {
    await handleQueueBatch(batch, env);
  },
  
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    try {
      // Cron実行時の処理
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