import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { CrawlerFactory } from './CrawlerFactory';
import { CrawlOptions } from './interfaces/ICrawler';
import { DatabaseInitializer } from './utils/DatabaseInitializer';

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

// データベース初期化エンドポイント（開発環境専用）
app.post('/dev/init-db', async (c) => {
  try {
    const dbInit = new DatabaseInitializer(c.env);
    await dbInit.ensureTablesExist();
    
    return c.json({
      success: true,
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// 手動クロール実行エンドポイント
app.post('/crawl/:source/:type?', async (c) => {
  const sourceId = c.req.param('source') || 'pet-home';
  const petType = (c.req.param('type') as 'dog' | 'cat') || 'cat';
  const limit = parseInt(c.req.query('limit') || '10');
  const differential = c.req.query('differential') !== 'false';
  
  // ソースIDの検証
  if (!CrawlerFactory.isValidSource(sourceId)) {
    return c.json({ 
      error: `Invalid source. Available sources: ${CrawlerFactory.getAvailableSources().join(', ')}` 
    }, 400);
  }
  
  if (petType !== 'dog' && petType !== 'cat') {
    return c.json({ error: 'Invalid pet type. Use "dog" or "cat".' }, 400);
  }

  if (limit < 1 || limit > 100) {
    return c.json({ error: 'Limit must be between 1 and 100.' }, 400);
  }

  try {
    const crawler = CrawlerFactory.createCrawler(sourceId, c.env);
    const options: CrawlOptions = {
      limit,
      useDifferential: differential
    };
    
    const result = await crawler.crawl(petType, options);

    return c.json({
      source: sourceId,
      petType,
      message: `Crawling completed from ${sourceId}`,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Crawl error:', error);
    return c.json({ error: 'Crawl failed', details: String(error) }, 500);
  }
});

// クロール状態取得エンドポイント
app.get('/crawl/status/:source?/:type?', async (c) => {
  const sourceId = c.req.param('source');
  const petType = c.req.param('type');
  
  try {
    let query = 'SELECT source_id, pet_type, checkpoint, total_processed, updated_at FROM crawler_states';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (sourceId && CrawlerFactory.isValidSource(sourceId)) {
      conditions.push('source_id = ?');
      params.push(sourceId);
    }
    
    if (petType === 'dog' || petType === 'cat') {
      conditions.push('pet_type = ?');
      params.push(petType);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    // チェックポイントをパース
    const statuses = result.results?.map((row: any) => ({
      ...row,
      checkpoint: row.checkpoint ? JSON.parse(row.checkpoint) : null
    }));
    
    return c.json({
      availableSources: CrawlerFactory.getAvailableSources(),
      statuses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Failed to get crawl status' }, 500);
  }
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
    
    // 全ての利用可能なクローラーを実行
    const crawlers = CrawlerFactory.createAllCrawlers(env);
    const options: CrawlOptions = {
      limit: 20,
      useDifferential: true
    };
    
    for (const crawler of crawlers) {
      console.log(`Running crawler: ${crawler.sourceName}`);
      
      // 猫と犬を順番にクロール
      const catResult = await crawler.crawl('cat', options);
      console.log(`${crawler.sourceId} cat crawl result:`, catResult);
      
      const dogResult = await crawler.crawl('dog', options);
      console.log(`${crawler.sourceId} dog crawl result:`, dogResult);
    }
    
    console.log('Scheduled crawl completed');
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};