import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { PetController, ImageController, HealthController } from './controllers';
import { CONFIG } from './utils';
import { withEnv } from './middleware/env-middleware';
import { adminAuth } from './middleware/admin-auth';
import { apiAuth } from './middleware/api-auth';
import { validateApiKey } from './middleware/api-key-validator';
import { errorHandlerMiddleware, notFoundHandler } from './middleware/error-handler-middleware';
import crawlerRoutes from './routes/crawler';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// グローバルエラーハンドリング
app.use('*', errorHandlerMiddleware);

// CORS設定（認証より先に実行する必要がある）
app.use('*', async (c, next) => {
  const origin = c.env?.['ALLOWED_ORIGIN'] || '*';
  const corsMiddleware = cors({
    origin: [
      origin, 
      'https://pawmatch.pages.dev',
      'https://*.pawmatch.pages.dev',
      'https://pawmatch-dogs.elchika.app',
      'https://pawmatch-cats.elchika.app',
      'https://*.dogmatch-16r.pages.dev',
      'https://*.catmatch.pages.dev',
      'http://localhost:3004', 
      'http://localhost:3005', 
      'http://localhost:3006'
    ] as string[],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: false,
  });
  return corsMiddleware(c, next);
});

// グローバル認証（CORS設定の後に実行）
// 新しいAPIキー管理サービスを使用、フォールバックとして旧認証も利用
app.use('*', validateApiKey);

// ========================================
// Health & Status Endpoints
// ========================================
app.get('/', withEnv(async (c) => {
  const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET);
  return healthController.getHealthStatus(c);
}));

app.get('/health', withEnv(async (c) => {
  const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET);
  return healthController.getHealthStatus(c);
}));

app.get('/health/ready', withEnv(async (c) => {
  const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET);
  return healthController.getReadinessStatus(c);
}));

// ========================================
// API Endpoints
// ========================================

// Statistics endpoint
app.get('/api/stats', withEnv(async (c) => {
  const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET);
  return healthController.getStats(c);
}));

// Pet endpoints
app.get('/api/pets', withEnv(async (c) => {
  const petController = new PetController(c.env.DB);
  return petController.getPets(c);
}));

app.get('/api/pets/:type', withEnv(async (c) => {
  const petController = new PetController(c.env.DB);
  return petController.getPets(c);
}));

app.get('/api/pets/:type/random', withEnv(async (c) => {
  const petController = new PetController(c.env.DB);
  return petController.getRandomPets(c);
}));

app.get('/api/pets/:type/:id', withEnv(async (c) => {
  const petController = new PetController(c.env.DB);
  return petController.getPetById(c);
}));

// Image endpoints
app.get('/api/images/:filename',
  cache({
    cacheName: CONFIG.CACHE_NAME,
    cacheControl: CONFIG.CACHE_CONTROL,
  }),
  withEnv(async (c) => {
    const imageController = new ImageController(c.env.IMAGES_BUCKET, c.env.DB);
    return imageController.getImage(c);
  })
);

app.get('/api/images/:type/:filename',
  cache({
    cacheName: CONFIG.CACHE_NAME,
    cacheControl: CONFIG.CACHE_CONTROL,
  }),
  withEnv(async (c) => {
    const imageController = new ImageController(c.env.IMAGES_BUCKET, c.env.DB);
    return imageController.getImageByType(c);
  })
);

// Crawler routes (内部API)
app.route('/crawler', crawlerRoutes);

// Admin endpoint - Update pet flags (has_webp, has_jpeg)
// 認証ミドルウェアを使用
app.post('/api/admin/pets/update-flags', adminAuth, withEnv(async (c) => {
  try {
    console.log('[update-flags] Processing request');
    
    const body = await c.req.json();
    
    // リクエストボディの検証
    if (!body.petType || !body.petIds || !Array.isArray(body.petIds) || !body.flags) {
      return c.json({
        success: false,
        error: 'Invalid request body'
      }, 400);
    }
    
    const { petType, petIds, flags } = body;
    console.log(`[update-flags] Updating ${petIds.length} ${petType} records`);
    
    // フラグの更新フィールドを構築
    const updateFields = [];
    if (flags.has_webp !== undefined) {
      updateFields.push(`has_webp = ${flags.has_webp ? 1 : 0}`);
    }
    if (flags.has_jpeg !== undefined) {
      updateFields.push(`has_jpeg = ${flags.has_jpeg ? 1 : 0}`);
    }
    
    if (updateFields.length === 0) {
      return c.json({
        success: false,
        error: 'No flags to update'
      }, 400);
    }
    
    // バッチサイズごとに更新（SQLiteの制限を考慮）
    const BATCH_SIZE = 50;
    let totalUpdated = 0;
    
    for (let i = 0; i < petIds.length; i += BATCH_SIZE) {
      const batch = petIds.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '?').join(',');
      
      const sql = `
        UPDATE pets 
        SET ${updateFields.join(', ')}, 
            updated_at = datetime('now')
        WHERE id IN (${placeholders}) 
          AND type = ?
      `;
      
      const result = await c.env.DB.prepare(sql)
        .bind(...batch, petType)
        .run();
      
      totalUpdated += result.meta.changes || 0;
      console.log(`[update-flags] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.meta.changes} updated`);
    }
    
    console.log(`[update-flags] Total updated: ${totalUpdated}/${petIds.length}`);
    
    return c.json({
      success: true,
      updated: totalUpdated,
      requested: petIds.length,
      petType
    });
    
  } catch (error) {
    console.error('[update-flags] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update flags'
    }, 500);
  }
}));

// Admin endpoint - Update image flags after screenshot processing
// adminAuth追加で二重認証（API全体 + Admin権限）
app.post('/api/admin/update-images', adminAuth, withEnv(async (c) => {
  try {
    console.log('[update-images] Request received');
    
    const body = await c.req.json();
    
    // Validate request body
    if (!body.results || !Array.isArray(body.results)) {
      return c.json({
        success: false,
        error: 'Invalid request body'
      }, 400);
    }

    console.log(`[update-images] Processing ${body.results.length} results`);
    
    let updatedCount = 0;
    const errors: any[] = [];

    // Process each result
    for (const result of body.results) {
      if (result.success && result.pet_id) {
        try {
          // Update has_jpeg and has_webp flags based on upload results
          const hasJpeg = result.jpegUrl ? 1 : 0;
          const hasWebp = result.webpUrl ? 1 : 0;
          
          console.log(`[update-images] Updating pet ${result.pet_id}: has_jpeg=${hasJpeg}, has_webp=${hasWebp}`);
          
          const updateResult = await c.env.DB.prepare(`
            UPDATE pets 
            SET has_jpeg = ?, 
                has_webp = ?,
                screenshot_completed_at = CURRENT_TIMESTAMP,
                image_checked_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(hasJpeg, hasWebp, result.pet_id).run();
          
          if (updateResult.meta.changes > 0) {
            updatedCount++;
            console.log(`[update-images] Successfully updated pet ${result.pet_id}`);
          } else {
            console.log(`[update-images] No rows updated for pet ${result.pet_id} - pet may not exist`);
            errors.push({
              petId: result.pet_id,
              error: 'Pet not found in database'
            });
          }
        } catch (error) {
          console.error(`[update-images] Error updating pet ${result.pet_id}:`, error);
          errors.push({
            petId: result.pet_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        console.log(`[update-images] Skipping result - success: ${result.success}, pet_id: ${result.pet_id}`);
      }
    }
    
    console.log(`[update-images] Update complete - updated: ${updatedCount}, errors: ${errors.length}`);

    return c.json({
      success: true,
      message: `Updated ${updatedCount} pets`,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Update images error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update images'
    }, 500);
  }
}));

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      message: 'Not Found',
      code: 'ROUTE_NOT_FOUND',
      path: c.req.path
    },
    timestamp: new Date().toISOString()
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Application error:', err);
  return c.json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    },
    timestamp: new Date().toISOString()
  }, 500);
});

export default app;