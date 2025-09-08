import { Hono } from 'hono'
import { withEnv } from '../middleware/envMiddleware'
import { adminAuth } from '../middleware/adminAuth'
import { AdminController } from '../controllers/admin/AdminController'
import { ImageUploadController } from '../controllers/admin/ImageUploadController'
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

export default admin
