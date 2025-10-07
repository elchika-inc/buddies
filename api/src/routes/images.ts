import { Hono } from 'hono'
import { cache } from 'hono/cache'
import { withEnv } from '../middleware/EnvMiddleware'
import { withImageController } from '../factories/ControllerFactory'
import { ImageStatusController } from '../controllers/ImageStatusController'
import { CONFIG } from '../utils'
import type { Env } from '../types'

const images = new Hono<{ Bindings: Env }>()

// 画像取得（タイプ指定） - より具体的なルートを先に定義
images.get(
  '/:type/:filename',
  cache({
    cacheName: CONFIG.CACHE_NAME,
    cacheControl: CONFIG.CACHE_CONTROL,
  }),
  withEnv(withImageController(async (controller, c) => controller.getImageByType(c)))
)

// 画像取得（ファイル名のみ）
images.get(
  '/:filename',
  cache({
    cacheName: CONFIG.CACHE_NAME,
    cacheControl: CONFIG.CACHE_CONTROL,
  }),
  withEnv(withImageController(async (controller, c) => controller.getImage(c)))
)

// 画像アップロード（単一）
images.post(
  '/upload/:petId',
  // apiAuth, // 一時的に認証を無効化
  withEnv(withImageController(async (controller, c) => controller.uploadImage(c)))
)

// 画像一括アップロード
images.post(
  '/upload/batch',
  // apiAuth, // 一時的に認証を無効化
  withEnv(withImageController(async (controller, c) => controller.uploadBatch(c)))
)

// 画像存在チェックとフラグ更新
images.post(
  '/sync-flags',
  // apiAuth, // 一時的に認証を無効化
  withEnv(withImageController(async (controller, c) => controller.syncImageFlags(c)))
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
