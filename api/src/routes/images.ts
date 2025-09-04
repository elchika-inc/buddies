import { Hono } from 'hono';
import { cache } from 'hono/cache';
import { withEnv } from '../middleware/env-middleware';
import { ImageController } from '../controllers';
import { CONFIG } from '../utils';
import type { Env } from '../types';

const images = new Hono<{ Bindings: Env }>();

// 画像取得（ファイル名のみ）
images.get('/:filename',
  cache({
    cacheName: CONFIG.CACHE_NAME,
    cacheControl: CONFIG.CACHE_CONTROL,
  }),
  withEnv(async (c) => {
    const imageController = new ImageController(c.env.IMAGES_BUCKET, c.env.DB);
    return imageController.getImage(c);
  })
);

// 画像取得（タイプ指定）
images.get('/:type/:filename',
  cache({
    cacheName: CONFIG.CACHE_NAME,
    cacheControl: CONFIG.CACHE_CONTROL,
  }),
  withEnv(async (c) => {
    const imageController = new ImageController(c.env.IMAGES_BUCKET, c.env.DB);
    return imageController.getImageByType(c);
  })
);

export default images;