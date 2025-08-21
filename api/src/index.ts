import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { generateCats, generateDogs } from './sample-data/generate-data';
import { SimpleSyncService } from './services/simple-sync-service';

// サンプルデータを生成
const sampleCats = generateCats(100);
const sampleDogs = generateDogs(100);

interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  IMAGE_WORKER: Fetcher;  // 画像変換Worker
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

// 画像配信エンドポイント - 画像変換Workerへプロキシ
app.get('/images/:type/:filename',
  cache({
    cacheName: 'pawmatch-images',
    cacheControl: 'public, max-age=86400', // 24時間キャッシュ
  }),
  async (c) => {
    const petType = c.req.param('type');
    const filename = c.req.param('filename');
    const format = c.req.query('format') || 'auto';

    // パラメータ検証
    if (petType !== 'dogs' && petType !== 'cats') {
      return c.json({ error: 'Invalid pet type' }, 400);
    }

    // ファイル名からペットIDを抽出
    const fileMatch = filename.match(/^(pethome_\d+|\d+)(?:\.(jpg|jpeg|png|webp))?$/);
    if (!fileMatch) {
      return c.json({ error: 'Invalid filename format' }, 400);
    }

    const petId = fileMatch[1].startsWith('pethome_') ? fileMatch[1] : `pethome_${fileMatch[1]}`;
    const requestedFormat = fileMatch[2] || format;

    try {
      // 画像変換Workerへリクエストをプロキシ
      const imageWorkerUrl = `https://image-worker.internal/convert/pets/${petType}/${petId}/${requestedFormat}`;
      
      // Service Bindingを使用して内部通信
      const imageResponse = await c.env.IMAGE_WORKER.fetch(
        new Request(imageWorkerUrl, {
          headers: {
            'Accept': c.req.header('Accept') || '',
            'X-Forwarded-For': c.req.header('X-Forwarded-For') || c.req.header('CF-Connecting-IP') || '',
          }
        })
      );

      // レスポンスをそのまま返す
      return new Response(imageResponse.body, {
        status: imageResponse.status,
        headers: imageResponse.headers
      });

    } catch (error) {
      console.error('Image proxy error:', error);
      return c.json({ error: 'Image service unavailable' }, 503);
    }
  }
);

// 画像配信はNext.jsの静的ファイル配信を使用（/api/images/ は削除）

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
    
    // JSONフィールドをパース（エラーハンドリング付き）
    const pets = (result.results || []).map((pet: any) => {
      let personality = [];
      let care_requirements = [];
      
      try {
        personality = pet.personality ? JSON.parse(pet.personality) : [];
      } catch (e) {
        // JSONパースに失敗した場合はデフォルト値を使用
        personality = ['friendly', 'energetic'];
      }
      
      try {
        care_requirements = pet.care_requirements ? JSON.parse(pet.care_requirements) : [];
      } catch (e) {
        // JSONパースに失敗した場合はデフォルト値を使用
        care_requirements = ['indoor', 'love'];
      }
      
      return {
        ...pet,
        personality,
        care_requirements,
      };
    });

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

    // JSONフィールドをパース（エラーハンドリング付き）
    let personality = [];
    let care_requirements = [];
    let metadata = {};
    
    try {
      personality = result.personality ? JSON.parse(result.personality as string) : [];
    } catch (e) {
      personality = ['friendly', 'energetic'];
    }
    
    try {
      care_requirements = result.care_requirements ? JSON.parse(result.care_requirements as string) : [];
    } catch (e) {
      care_requirements = ['indoor', 'love'];
    }
    
    try {
      metadata = result.metadata ? JSON.parse(result.metadata as string) : {};
    } catch (e) {
      metadata = {};
    }
    
    const pet = {
      ...result,
      personality,
      care_requirements,
      metadata,
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

// データ準備状態確認エンドポイント
app.get('/data-status', async (c) => {
  try {
    const syncService = new SimpleSyncService(c.env.DB, c.env.IMAGES_BUCKET);
    const status = await syncService.getDataReadiness();
    
    return c.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    return c.json({ error: 'Status check failed' }, 500);
  }
});

// 詳細統計情報取得
app.get('/data-status/detailed', async (c) => {
  try {
    const syncService = new SimpleSyncService(c.env.DB, c.env.IMAGES_BUCKET);
    const stats = await syncService.getDetailedStats();
    
    return c.json(stats);
  } catch (error) {
    console.error('Detailed stats error:', error);
    return c.json({ error: 'Failed to get detailed stats' }, 500);
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

// R2バケット画像アップロードエンドポイント（開発環境専用）
app.post('/dev/upload-image', async (c) => {
  try {
    const body = await c.req.json();
    const { petType, filename, data, contentType } = body;
    
    if (!petType || !filename || !data) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }
    
    // バイト配列をBufferに変換
    const buffer = new Uint8Array(data);
    const key = `${petType}/${filename}`;
    
    // R2バケットにアップロード
    await c.env.IMAGES_BUCKET.put(key, buffer, {
      httpMetadata: {
        contentType: contentType || 'image/jpeg',
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        uploadType: 'sample',
      },
    });
    
    return c.json({
      success: true,
      message: `Uploaded ${filename} to ${key}`,
      key,
      size: buffer.length,
      contentType,
    });
    
  } catch (error) {
    console.error('Image upload error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
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
  const syncService = new SimpleSyncService(c.env.DB, c.env.IMAGES_BUCKET);
  
  try {
    const body = await c.req.json();
    const { pets } = body;
    
    if (!Array.isArray(pets)) {
      return c.json({ error: 'pets must be an array' }, 400);
    }
    
    let insertedCount = 0;
    let updatedCount = 0;
    const imageStats = { total: 0, withJpeg: 0, withWebp: 0, missing: 0 };
    
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
      
      // 画像の存在確認と状態更新
      const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`;
      const webpKey = `pets/${pet.type}s/${pet.id}/optimized.webp`;
      
      const [jpegExists, webpExists] = await Promise.all([
        c.env.IMAGES_BUCKET.head(jpegKey),
        c.env.IMAGES_BUCKET.head(webpKey)
      ]);
      
      imageStats.total++;
      if (jpegExists) imageStats.withJpeg++;
      if (webpExists) imageStats.withWebp++;
      if (!jpegExists) imageStats.missing++;
      
      await syncService.updatePetImageStatus(
        pet.id,
        !!jpegExists,
        !!webpExists
      );
    }
    
    // 全体統計を更新して準備状態を確認
    const { isReady } = await syncService.updateSyncMetadata();
    const readiness = await syncService.getDataReadiness();
    
    return c.json({
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      total: pets.length,
      dataReady: isReady,
      readinessMessage: readiness.message,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Data seeding error:', error);
    // エラー情報をログに記録
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ペット画像ステータス更新エンドポイント（GitHub Actions用）
app.post('/dev/update-image-status', async (c) => {
  try {
    const body = await c.req.json();
    const { petId, hasJpeg, hasWebp } = body;
    
    if (!petId) {
      return c.json({ error: 'petId is required' }, 400);
    }
    
    const syncService = new SimpleSyncService(c.env.DB, c.env.IMAGES_BUCKET);
    await syncService.updatePetImageStatus(petId, !!hasJpeg, !!hasWebp);
    
    // スクリーンショット完了も記録
    if (hasJpeg) {
      await c.env.DB.prepare(`
        UPDATE pets SET 
          screenshot_completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(petId).run();
    }
    
    return c.json({
      success: true,
      petId,
      hasJpeg: !!hasJpeg,
      hasWebp: !!hasWebp,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Image status update error:', error);
    return c.json({ error: 'Failed to update image status' }, 500);
  }
});

// データ整合性チェックエンドポイント（開発環境専用）
app.post('/dev/integrity-check', async (c) => {
  try {
    const syncService = new SimpleSyncService(c.env.DB, c.env.IMAGES_BUCKET);
    const result = await syncService.runIntegrityCheck();
    
    return c.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Integrity check error:', error);
    return c.json({ error: 'Integrity check failed' }, 500);
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