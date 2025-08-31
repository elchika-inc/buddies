import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { PetController, ImageController, HealthController } from './controllers';
import { CONFIG } from './utils';
import { withEnv } from './middleware/env-middleware';
import { errorHandlerMiddleware, notFoundHandler } from './middleware/error-handler-middleware';
import crawlerRoutes from './routes/crawler';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// グローバルエラーハンドリング
app.use('*', errorHandlerMiddleware);

// CORS設定
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
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });
  return corsMiddleware(c, next);
});

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

// Admin endpoint - Update image flags after screenshot processing
app.post('/api/admin/update-images', withEnv(async (c) => {
  try {
    console.log('[update-images] Request received');
    
    // 簡易認証: AuthorizationヘッダーまたはAPI_ADMIN_KEYの環境変数をチェック
    const authHeader = c.req.header('Authorization');
    const adminKey = c.env.API_ADMIN_KEY;
    
    // 環境変数が設定されている場合のみ認証をチェック（設定されてない場合はスキップ）
    if (adminKey) {
      console.log('[update-images] API key is configured, checking authorization');
      if (authHeader !== `Bearer ${adminKey}`) {
        console.log('[update-images] Authorization failed');
        return c.json({
          success: false,
          error: 'Unauthorized'
        }, 401);
      }
    } else {
      console.log('[update-images] No API key configured, skipping authentication');
    }
    
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