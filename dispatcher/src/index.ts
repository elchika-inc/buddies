import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';

interface Env {
  DB: D1Database;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  WORKFLOW_FILE: string;
  API_URL: string;
  [key: string]: unknown;
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

// 手動トリガー
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
    
    // GitHub Actionsをトリガー
    const response = await triggerGitHubWorkflow(env, pets, batchId);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    // ディスパッチ履歴を記録
    await env.DB.prepare(`
      INSERT INTO dispatch_history (batch_id, pet_count, status, created_at)
      VALUES (?, ?, 'dispatched', CURRENT_TIMESTAMP)
    `).bind(batchId, pets.length).run();
    
    return c.json({
      success: true,
      message: 'Workflow dispatched successfully',
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

// Cron実行（scheduled）
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
    
    // GitHub Actionsをトリガー
    const response = await triggerGitHubWorkflow(env, pets, batchId);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    // ディスパッチ履歴を記録
    await env.DB.prepare(`
      INSERT INTO dispatch_history (batch_id, pet_count, status, created_at)
      VALUES (?, ?, 'scheduled', CURRENT_TIMESTAMP)
    `).bind(batchId, pets.length).run();
    
    console.log(`Scheduled dispatch completed: ${pets.length} pets`);
    
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

// Cloudflare Workers のスケジュール実行
export default {
  fetch: app.fetch,
  
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