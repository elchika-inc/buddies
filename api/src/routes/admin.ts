import { Hono } from 'hono'
import { withEnv } from '../middleware/EnvMiddleware'
import { adminAuth } from '../middleware/AdminAuth'
import { AdminController } from '../controllers/admin/AdminController'
import { ImageUploadController } from '../controllers/admin/ImageUploadController'
import { CrawlerController } from '../controllers/admin/CrawlerController'
import { DispatchController } from '../controllers/admin/DispatchController'
import prefectureComplement from './admin/prefectureComplement'
import type { Env } from '../types'

const admin = new Hono<{ Bindings: Env }>()

// ペットフラグ更新エンドポイント
admin.post(
  '/pets/update-flags',
  adminAuth,
  withEnv(async (c) => {
    const adminController = new AdminController(c.env.DB)
    return adminController.updatePetFlags(c)
  })
)

// 画像処理結果の反映エンドポイント（既存、互換性のため残す）
admin.post(
  '/update-images',
  adminAuth,
  withEnv(async (c) => {
    const adminController = new AdminController(c.env.DB)
    return adminController.updateImages(c)
  })
)

// 新規: スクリーンショットアップロード（GitHub Actions用）
admin.post(
  '/upload-screenshot',
  adminAuth,
  withEnv(async (c) => {
    const uploadController = new ImageUploadController(
      c.env.DB,
      c.env.R2_BUCKET || c.env.IMAGES_BUCKET
    )
    return uploadController.uploadScreenshot(c)
  })
)

// 新規: 画像変換とアップロード（GitHub Actions用）
admin.post(
  '/convert-image',
  adminAuth,
  withEnv(async (c) => {
    const uploadController = new ImageUploadController(
      c.env.DB,
      c.env.R2_BUCKET || c.env.IMAGES_BUCKET
    )
    return uploadController.convertAndUploadImage(c)
  })
)

// 新規: バッチアップロード（複数画像の一括処理）
admin.post(
  '/batch-upload',
  adminAuth,
  withEnv(async (c) => {
    const uploadController = new ImageUploadController(
      c.env.DB,
      c.env.R2_BUCKET || c.env.IMAGES_BUCKET
    )
    return uploadController.batchUpload(c)
  })
)

// Crawler制御エンドポイント
admin.post(
  '/trigger-crawler',
  adminAuth,
  withEnv(async (c) => {
    const crawlerController = new CrawlerController(c.env)
    return crawlerController.triggerCrawl(c)
  })
)

admin.get(
  '/crawler-status',
  adminAuth,
  withEnv(async (c) => {
    const crawlerController = new CrawlerController(c.env)
    return crawlerController.getCrawlerStatus(c)
  })
)

// Dispatch制御エンドポイント（スクリーンショット処理）
admin.post(
  '/trigger-screenshot',
  adminAuth,
  withEnv(async (c) => {
    const dispatchController = new DispatchController(c.env)
    return dispatchController.triggerScreenshot(c)
  })
)

// スケジュールディスパッチ用エンドポイント
admin.post(
  '/trigger-scheduled',
  adminAuth,
  withEnv(async (c) => {
    const dispatchController = new DispatchController(c.env)
    return dispatchController.triggerScheduled(c)
  })
)

// 都道府県補完エンドポイント
admin.route('/prefecture-complement', prefectureComplement)

export default admin
