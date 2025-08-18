import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';

interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
  ALLOWED_ORIGIN: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use('*', (c, next) => {
  const corsMiddleware = cors({
    origin: [c.env.ALLOWED_ORIGIN, 'http://localhost:3004'],
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });
  return corsMiddleware(c, next);
});

// ヘルスチェック
app.get('/', (c) => {
  return c.json({
    service: 'PawMatch API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// 画像配信エンドポイント（キャッシュ有効）
app.get('/images/:type/:filename',
  cache({
    cacheName: 'pawmatch-images',
    cacheControl: 'public, max-age=86400', // 24時間キャッシュ
  }),
  async (c) => {
    const petType = c.req.param('type');
    const filename = c.req.param('filename');

    // パラメータ検証
    if (petType !== 'dogs' && petType !== 'cats') {
      return c.json({ error: 'Invalid pet type' }, 400);
    }

    if (!filename.match(/^(dog|cat)-\d+\.jpg$/)) {
      return c.json({ error: 'Invalid filename format' }, 400);
    }

    try {
      const key = `${petType}/${filename}`;
      const object = await c.env.IMAGES_BUCKET.get(key);

      if (!object) {
        return c.json({ error: 'Image not found' }, 404);
      }

      // セキュリティヘッダー設定
      const headers = new Headers();
      headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
      headers.set('Cache-Control', 'public, max-age=31536000'); // 1年キャッシュ
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'DENY');
      
      // リファラーチェック（セキュリティ）
      const referer = c.req.header('Referer');
      const allowedDomains = [c.env.ALLOWED_ORIGIN, 'http://localhost:3004'];
      
      if (referer && !allowedDomains.some(domain => referer.startsWith(domain))) {
        return c.json({ error: 'Access denied' }, 403);
      }

      return new Response(object.body, { headers });

    } catch (error) {
      console.error('Image fetch error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
);

// ペット一覧API
app.get('/pets/:type?', async (c) => {
  const petType = c.req.param('type');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const prefecture = c.req.query('prefecture');

  let query = 'SELECT id, type, name, breed, age, gender, prefecture, city, location, description, personality, medical_info, care_requirements, image_url, shelter_name, created_at FROM pets';
  const params: any[] = [];
  const conditions: string[] = [];

  if (petType === 'dog' || petType === 'cat') {
    conditions.push('type = ?');
    params.push(petType);
  }

  if (prefecture) {
    conditions.push('prefecture = ?');
    params.push(prefecture);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  try {
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    // JSONフィールドをパース
    const pets = (result.results || []).map((pet: any) => ({
      ...pet,
      personality: pet.personality ? JSON.parse(pet.personality) : [],
      care_requirements: pet.care_requirements ? JSON.parse(pet.care_requirements) : [],
    }));

    return c.json({
      pets,
      pagination: {
        limit,
        offset,
        total: pets.length,
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Database query failed' }, 500);
  }
});

// 特定のペット情報取得
app.get('/pets/:type/:id', async (c) => {
  const petType = c.req.param('type');
  const petId = c.req.param('id');

  if (petType !== 'dog' && petType !== 'cat') {
    return c.json({ error: 'Invalid pet type' }, 400);
  }

  try {
    const result = await c.env.DB
      .prepare('SELECT * FROM pets WHERE type = ? AND id = ?')
      .bind(petType, petId)
      .first();

    if (!result) {
      return c.json({ error: 'Pet not found' }, 404);
    }

    // JSONフィールドをパース
    const pet = {
      ...result,
      personality: result.personality ? JSON.parse(result.personality as string) : [],
      care_requirements: result.care_requirements ? JSON.parse(result.care_requirements as string) : [],
      metadata: result.metadata ? JSON.parse(result.metadata as string) : {},
    };

    return c.json({ pet });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Database query failed' }, 500);
  }
});

// 都道府県一覧取得
app.get('/prefectures', async (c) => {
  try {
    const result = await c.env.DB
      .prepare('SELECT DISTINCT prefecture FROM pets WHERE prefecture IS NOT NULL ORDER BY prefecture')
      .all();

    const prefectures = (result.results || []).map((row: any) => row.prefecture);
    return c.json({ prefectures });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Database query failed' }, 500);
  }
});

// 統計情報取得
app.get('/stats', async (c) => {
  try {
    const [totalResult, dogResult, catResult] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as total FROM pets').first(),
      c.env.DB.prepare('SELECT COUNT(*) as total FROM pets WHERE type = ?').bind('dog').first(),
      c.env.DB.prepare('SELECT COUNT(*) as total FROM pets WHERE type = ?').bind('cat').first(),
    ]);

    return c.json({
      total: totalResult?.total || 0,
      dogs: dogResult?.total || 0,
      cats: catResult?.total || 0,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Database query failed' }, 500);
  }
});

// 404ハンドリング
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// エラーハンドリング
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;