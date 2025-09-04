import { Hono } from 'hono';
import { withEnv } from '../middleware/env-middleware';
import { HealthController } from '../controllers';
import type { Env } from '../types';

const stats = new Hono<{ Bindings: Env }>();

stats.get('/', withEnv(async (c) => {
  const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET);
  return healthController.getStats(c);
}));

export default stats;