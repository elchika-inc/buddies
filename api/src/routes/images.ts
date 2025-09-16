import { Hono } from 'hono'
import { cache } from 'hono/cache'
import { withEnv } from '../middleware/EnvMiddleware'
import { ImageController } from '../controllers'
import { ImageStatusController } from '../controllers/ImageStatusController'
import { CONFIG } from '../utils'
import type { Env } from '../types'

const images = new Hono<{ Bindings: Env }>()

// 画像取得（ファイル名のみ）
images.get(
  '/:filename',
  cache({
    cacheName: CONFIG.CACHE_NAME,
    cacheControl: CONFIG.CACHE_CONTROL,
  }),
  withEnv(async (c) => {
    const imageController = new ImageController(c.env.IMAGES_BUCKET, c.env.DB)
    return imageController.getImage(c)
  })
)

// 画像取得（タイプ指定）
images.get(
  '/:type/:filename',
  cache({
    cacheName: CONFIG.CACHE_NAME,
    cacheControl: CONFIG.CACHE_CONTROL,
  }),
  withEnv(async (c) => {
    const imageController = new ImageController(c.env.IMAGES_BUCKET, c.env.DB)
    return imageController.getImageByType(c)
  })
)

// 画像アップロード（単一）
images.post(
  '/upload/:petId',
  // apiAuth, // 一時的に認証を無効化
  withEnv(async (c) => {
    const imageController = new ImageController(c.env.IMAGES_BUCKET, c.env.DB)
    return imageController.uploadImage(c)
  })
)

// 画像一括アップロード
images.post(
  '/upload/batch',
  // apiAuth, // 一時的に認証を無効化
  withEnv(async (c) => {
    const imageController = new ImageController(c.env.IMAGES_BUCKET, c.env.DB)
    return imageController.uploadBatch(c)
  })
)

// 画像存在チェックとフラグ更新
images.post(
  '/sync-flags',
  // apiAuth, // 一時的に認証を無効化
  withEnv(async (c) => {
    const imageController = new ImageController(c.env.IMAGES_BUCKET, c.env.DB)
    return imageController.syncImageFlags(c)
  })
)

// ステータス更新エンドポイント
images.post(
  '/status/update',
  // apiAuth, // 一時的に認証を無効化
  withEnv(async (c) => {
    const statusController = new ImageStatusController(c.env.DB)
    return statusController.updateStatus(c)
  })
)

export default images
