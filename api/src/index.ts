import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { PetController, ImageController, HealthController } from './controllers';
import { CONFIG } from './utils';
import { withEnv } from './middleware/env-middleware';
import { errorHandlerMiddleware, notFoundHandler } from './middleware/error-handler-middleware';
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
    allowMethods: ['GET', 'OPTIONS'],
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