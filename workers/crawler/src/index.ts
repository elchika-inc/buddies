import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { PetHomeCrawler } from './crawler';

const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use('*', (c, next) => {
  const corsMiddleware = cors({
    origin: [c.env.ALLOWED_ORIGIN, 'http://localhost:3004'],
    allowMethods: ['GET', 'POST'],
    allowHeaders: ['Content-Type'],
  });
  return corsMiddleware(c, next);
});

// ヘルスチェック
app.get('/', (c) => {
  return c.json({
    service: 'PawMatch Crawler',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// 手動クロール実行エンドポイント
app.post('/crawl/:type?', async (c) => {
  const petType = (c.req.param('type') as 'dog' | 'cat') || 'cat';
  
  if (petType !== 'dog' && petType !== 'cat') {
    return c.json({ error: 'Invalid pet type. Use "dog" or "cat".' }, 400);
  }

  const crawler = new PetHomeCrawler(c.env);
  const result = await crawler.crawlPets(petType);

  return c.json({
    message: `${petType} crawling completed`,
    result,
    timestamp: new Date().toISOString(),
  });
});

// ペット一覧取得（API用）
app.get('/pets/:type?', async (c) => {
  const petType = c.req.param('type');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT * FROM pets';
  const params: any[] = [];

  if (petType === 'dog' || petType === 'cat') {
    query += ' WHERE type = ?';
    params.push(petType);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  try {
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      pets: result.results,
      pagination: {
        limit,
        offset,
        total: result.results?.length || 0,
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Database query failed' }, 500);
  }
});

// Cron Trigger処理
export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log('Scheduled crawl started at:', new Date().toISOString());
    
    const crawler = new PetHomeCrawler(env);
    
    // 猫と犬を順番にクロール
    const catResult = await crawler.crawlPets('cat');
    console.log('Cat crawl result:', catResult);
    
    const dogResult = await crawler.crawlPets('dog');
    console.log('Dog crawl result:', dogResult);
    
    console.log('Scheduled crawl completed');
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};