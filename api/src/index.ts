import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { generateCats, generateDogs } from './sample-data/generate-data';

// サンプルデータを生成
const sampleCats = generateCats(100);
const sampleDogs = generateDogs(100);

interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
  ALLOWED_ORIGIN: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use('*', (c, next) => {
  const corsMiddleware = cors({
    origin: [c.env.ALLOWED_ORIGIN, 'http://localhost:3004', 'http://localhost:3005'],
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

// サンプルデータエンドポイント（開発用）
app.get('/api/sample/cats', (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '10'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const prefecture = c.req.query('prefecture');
  
  let filteredCats = [...sampleCats];
  
  // 都道府県でフィルタリング
  if (prefecture) {
    filteredCats = filteredCats.filter(cat => cat.prefecture === prefecture);
  }
  
  // ページネーション
  const paginatedCats = filteredCats.slice(offset, offset + limit);
  
  return c.json({
    cats: paginatedCats,
    pagination: {
      limit,
      offset,
      total: filteredCats.length,
      hasMore: offset + limit < filteredCats.length
    }
  });
});

// 特定の猫のサンプルデータ取得（開発用）
app.get('/api/sample/cats/:id', (c) => {
  const catId = c.req.param('id');
  const cat = sampleCats.find(cat => cat.id === catId);
  
  if (!cat) {
    return c.json({ error: 'Cat not found' }, 404);
  }
  
  return c.json({ cat });
});

// サンプルデータの都道府県一覧（開発用）
app.get('/api/sample/prefectures', (c) => {
  const prefectures = [...new Set(sampleCats.map(cat => cat.prefecture))].sort();
  return c.json({ prefectures });
});

// 犬のサンプルデータエンドポイント（開発用）
app.get('/api/sample/dogs', (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '10'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const prefecture = c.req.query('prefecture');
  
  let filteredDogs = [...sampleDogs];
  
  // 都道府県でフィルタリング
  if (prefecture) {
    filteredDogs = filteredDogs.filter(dog => dog.prefecture === prefecture);
  }
  
  // ページネーション
  const paginatedDogs = filteredDogs.slice(offset, offset + limit);
  
  return c.json({
    dogs: paginatedDogs,
    pagination: {
      limit,
      offset,
      total: filteredDogs.length,
      hasMore: offset + limit < filteredDogs.length
    }
  });
});

// 特定の犬のサンプルデータ取得（開発用）
app.get('/api/sample/dogs/:id', (c) => {
  const dogId = c.req.param('id');
  const dog = sampleDogs.find(dog => dog.id === dogId);
  
  if (!dog) {
    return c.json({ error: 'Dog not found' }, 404);
  }
  
  return c.json({ dog });
});

// サンプルデータの統計情報（開発用）
app.get('/api/sample/stats', (c) => {
  return c.json({
    total: sampleCats.length + sampleDogs.length,
    cats: sampleCats.length,
    dogs: sampleDogs.length,
    last_updated: new Date().toISOString()
  });
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

// データベース初期化エンドポイント（開発環境専用）
app.post('/dev/init-db', async (c) => {
  try {
    // テーブル存在確認
    const tables = await c.env.DB
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();
    
    const tableNames = tables.results?.map((t: any) => t.name) || [];
    
    if (!tableNames.includes('pets')) {
      // petsテーブル作成
      await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS pets (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          breed TEXT,
          age TEXT,
          gender TEXT,
          prefecture TEXT,
          city TEXT,
          location TEXT,
          description TEXT,
          personality TEXT,
          medical_info TEXT,
          care_requirements TEXT,
          image_url TEXT,
          shelter_name TEXT,
          shelter_contact TEXT,
          source_url TEXT,
          adoption_fee INTEGER DEFAULT 0,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      console.log('Created pets table');
    }
    
    return c.json({
      success: true,
      message: 'API database initialized successfully',
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

// クローラーからのデータ受信エンドポイント（開発環境専用）
app.post('/dev/seed-data', async (c) => {
  try {
    const body = await c.req.json();
    const { pets } = body;
    
    if (!Array.isArray(pets)) {
      return c.json({ error: 'pets must be an array' }, 400);
    }
    
    let insertedCount = 0;
    let updatedCount = 0;
    
    for (const pet of pets) {
      // データ検証
      if (!pet.id || !pet.type || !pet.name) {
        continue;
      }
      
      // 既存データ確認
      const existing = await c.env.DB
        .prepare('SELECT id FROM pets WHERE id = ?')
        .bind(pet.id)
        .first();
      
      if (existing) {
        // 更新
        await c.env.DB.prepare(`
          UPDATE pets SET
            name = ?, breed = ?, age = ?, gender = ?, prefecture = ?,
            city = ?, location = ?, description = ?, personality = ?,
            medical_info = ?, care_requirements = ?, image_url = ?,
            shelter_name = ?, shelter_contact = ?, source_url = ?,
            adoption_fee = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          pet.name, pet.breed, pet.age, pet.gender, pet.prefecture,
          pet.city, pet.location, pet.description,
          JSON.stringify(pet.personality || []),
          pet.medical_info, JSON.stringify(pet.care_requirements || []),
          pet.image_url, pet.shelter_name, pet.shelter_contact,
          pet.source_url, pet.adoption_fee || 0,
          JSON.stringify(pet.metadata || {}), pet.id
        ).run();
        updatedCount++;
      } else {
        // 新規挿入
        await c.env.DB.prepare(`
          INSERT INTO pets (
            id, type, name, breed, age, gender, prefecture, city, location,
            description, personality, medical_info, care_requirements,
            image_url, shelter_name, shelter_contact, source_url,
            adoption_fee, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          pet.id, pet.type, pet.name, pet.breed, pet.age, pet.gender,
          pet.prefecture, pet.city, pet.location, pet.description,
          JSON.stringify(pet.personality || []), pet.medical_info,
          JSON.stringify(pet.care_requirements || []), pet.image_url,
          pet.shelter_name, pet.shelter_contact, pet.source_url,
          pet.adoption_fee || 0, JSON.stringify(pet.metadata || {})
        ).run();
        insertedCount++;
      }
    }
    
    return c.json({
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      total: pets.length,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Data seeding error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
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