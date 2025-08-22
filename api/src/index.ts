import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { PetController } from './controllers/pet-controller';
import { ImageController } from './controllers/image-controller';
import { HealthController } from './controllers/health-controller';
import { CONFIG } from './utils/constants';
import { withEnv } from './middleware/env-middleware';
import type { Env } from './types/env';

type HonoApp = Hono<{ Bindings: Env }>;

const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use('*', async (c, next) => {
  const origin = c.env?.ALLOWED_ORIGIN || '*';
  const corsMiddleware = cors({
    origin: [origin, 'http://localhost:3004', 'http://localhost:3005'] as string[],
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });
  return corsMiddleware(c, next);
});

// APIバージョンごとのルーター
const v1 = new Hono<{ Bindings: Env }>();

// ========================================
// Health & Status Endpoints (No versioning)
// ========================================
app.get('/', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const healthController = new HealthController(c.env!.DB, c.env!.IMAGES_BUCKET);
  return healthController.getHealthStatus(c);
}));

app.get('/health', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const healthController = new HealthController(c.env!.DB, c.env!.IMAGES_BUCKET);
  return healthController.getHealthStatus(c);
}));

app.get('/health/ready', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const healthController = new HealthController(c.env!.DB, c.env!.IMAGES_BUCKET);
  return healthController.getReadinessStatus(c);
}));

// ========================================
// API v1 Endpoints
// ========================================

// Statistics endpoint
v1.get('/stats', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const healthController = new HealthController(c.env!.DB, c.env!.IMAGES_BUCKET);
  return healthController.getStats(c);
}));

// Pet endpoints
v1.get('/pets', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const petController = new PetController(c.env!.DB);
  return petController.getPets(c);
}));

v1.get('/pets/:type', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const petController = new PetController(c.env!.DB);
  return petController.getPets(c);
}));

v1.get('/pets/:type/random', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const petController = new PetController(c.env!.DB);
  return petController.getRandomPets(c);
}));

v1.get('/pets/:type/:id', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const petController = new PetController(c.env!.DB);
  return petController.getPetById(c);
}));

// Image endpoints
v1.get('/images/:type/:filename',
  cache({
    cacheName: CONFIG.CACHE_NAME,
    cacheControl: CONFIG.CACHE_CONTROL,
  }),
  withEnv(async (c: Context<{ Bindings: Env }>) => {
    const imageController = new ImageController();
    return imageController.proxyToImageWorker(c);
  })
);

// Mount v1 routes
app.route('/api/v1', v1);

// Legacy support (deprecated - will be removed in future versions)
app.get('/ready', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const healthController = new HealthController(c.env!.DB, c.env!.IMAGES_BUCKET);
  return healthController.getReadinessStatus(c);
}));

app.get('/stats', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const healthController = new HealthController(c.env!.DB, c.env!.IMAGES_BUCKET);
  return healthController.getStats(c);
}));

app.get('/pets/:type?', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const petController = new PetController(c.env!.DB);
  return petController.getPets(c);
}));

app.get('/pets/:type/random', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const petController = new PetController(c.env!.DB);
  return petController.getRandomPets(c);
}));

app.get('/pets/:type/:id', withEnv(async (c: Context<{ Bindings: Env }>) => {
  const petController = new PetController(c.env!.DB);
  return petController.getPetById(c);
}));

app.get('/images/:type/:filename',
  cache({
    cacheName: CONFIG.CACHE_NAME,
    cacheControl: CONFIG.CACHE_CONTROL,
  }),
  withEnv(async (c: Context<{ Bindings: Env }>) => {
    const imageController = new ImageController();
    return imageController.proxyToImageWorker(c);
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