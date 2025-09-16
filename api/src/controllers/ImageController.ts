import { Context } from 'hono'
import { extractPetIdFromFilename } from '../utils/validation'
import { handleError, ServiceUnavailableError, NotFoundError } from '../utils/errorHandler'
import type { Env } from '../types/env'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

export class ImageController {
  constructor(
    private bucket?: R2Bucket,
    private db?: D1Database
  ) {}

  async uploadImage(c: Context<{ Bindings: Env }>) {
    try {
      const petId = c.req.param('petId')
      const formData = await c.req.formData()
      const file = formData.get('image') as File
      const imageType = (formData.get('type') as string) || 'screenshot'

      if (!file) {
        return c.json({ success: false, error: 'No image provided' }, 400)
      }

      if (!this.bucket || !this.db) {
        throw new ServiceUnavailableError('Storage or database not available')
      }

      // ペット情報を取得
      const pet = await this.db
        .prepare('SELECT id, type FROM pets WHERE id = ?')
        .bind(petId)
        .first()

      if (!pet) {
        throw new NotFoundError('Pet not found')
      }

      const petType = pet['type'] as string
      const arrayBuffer = await file.arrayBuffer()
      const isPng = file.type === 'image/png' || file.name.endsWith('.png')
      const isWebp = file.type === 'image/webp' || file.name.endsWith('.webp')

      // R2にアップロード
      const extension = isWebp ? 'webp' : isPng ? 'png' : 'jpg'
      const filename =
        imageType === 'screenshot' ? 'screenshot.png' : isWebp ? 'optimized.webp' : 'original.jpg'
      const key = `pets/${petType}s/${petId}/${filename}`

      await this.bucket.put(key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type || 'image/jpeg',
        },
        customMetadata: {
          petId,
          petType,
          uploadedAt: new Date().toISOString(),
        },
      })

      // データベースのフラグを更新
      const updateQuery = isWebp
        ? 'UPDATE pets SET hasWebp = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?'
        : 'UPDATE pets SET hasJpeg = 1, imageUrl = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?'

      if (isWebp) {
        await this.db.prepare(updateQuery).bind(petId).run()
      } else {
        const imageUrl = `https://pawmatch-api.elchika.app/api/images/${petType}/${petId}.${extension}`
        await this.db.prepare(updateQuery).bind(imageUrl, petId).run()
      }

      return c.json({
        success: true,
        data: {
          petId,
          key,
          type: file.type,
          size: arrayBuffer.byteLength,
        },
      })
    } catch (error) {
      return handleError(c, error)
    }
  }

  async uploadBatch(c: Context<{ Bindings: Env }>) {
    try {
      const body = (await c.req.json()) as {
        uploads: Array<{
          petId: string
          imageData: string // base64
          mimeType: string
        }>
      }

      if (!this.bucket || !this.db) {
        throw new ServiceUnavailableError('Storage or database not available')
      }

      const results = []

      for (const upload of body.uploads) {
        try {
          // ペット情報を取得
          const pet = await this.db
            .prepare('SELECT id, type FROM pets WHERE id = ?')
            .bind(upload.petId)
            .first()

          if (!pet) {
            results.push({ petId: upload.petId, success: false, error: 'Pet not found' })
            continue
          }

          const petType = pet['type'] as string
          const imageBuffer = Uint8Array.from(atob(upload.imageData), (c) => c.charCodeAt(0))
          const isWebp = upload.mimeType === 'image/webp'
          const isPng = upload.mimeType === 'image/png'

          const filename = isPng ? 'screenshot.png' : isWebp ? 'optimized.webp' : 'original.jpg'
          const key = `pets/${petType}s/${upload.petId}/${filename}`

          // R2にアップロード
          await this.bucket.put(key, imageBuffer, {
            httpMetadata: {
              contentType: upload.mimeType,
            },
            customMetadata: {
              petId: upload.petId,
              petType,
              uploadedAt: new Date().toISOString(),
            },
          })

          // データベースのフラグを更新
          if (isWebp) {
            await this.db
              .prepare('UPDATE pets SET hasWebp = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
              .bind(upload.petId)
              .run()
          } else {
            const imageUrl = `https://pawmatch-api.elchika.app/api/images/${petType}/${upload.petId}.${isPng ? 'png' : 'jpg'}`
            await this.db
              .prepare(
                'UPDATE pets SET hasJpeg = 1, imageUrl = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?'
              )
              .bind(imageUrl, upload.petId)
              .run()
          }

          results.push({ petId: upload.petId, success: true, key })
        } catch (error) {
          results.push({
            petId: upload.petId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return c.json({
        success: true,
        data: {
          total: body.uploads.length,
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          results,
        },
      })
    } catch (error) {
      return handleError(c, error)
    }
  }

  async syncImageFlags(c: Context<{ Bindings: Env }>) {
    try {
      if (!this.bucket || !this.db) {
        throw new ServiceUnavailableError('Storage or database not available')
      }

      // 全ペットを取得
      const pets = await this.db.prepare('SELECT id, type FROM pets').all()

      let updatedCount = 0
      const errors = []

      for (const pet of pets.results || []) {
        try {
          const petId = pet['id'] as string
          const petType = pet['type'] as string

          // R2で画像の存在をチェック
          const jpegKey = `pets/${petType}s/${petId}/original.jpg`
          const pngKey = `pets/${petType}s/${petId}/screenshot.png`
          const webpKey = `pets/${petType}s/${petId}/optimized.webp`

          const [jpegExists, pngExists, webpExists] = await Promise.all([
            this.bucket
              .head(jpegKey)
              .then(() => true)
              .catch(() => false),
            this.bucket
              .head(pngKey)
              .then(() => true)
              .catch(() => false),
            this.bucket
              .head(webpKey)
              .then(() => true)
              .catch(() => false),
          ])

          const hasJpeg = jpegExists || pngExists
          const hasWebp = webpExists

          // データベースを更新
          if (hasJpeg || hasWebp) {
            const imageUrl = hasJpeg
              ? `https://pawmatch-api.elchika.app/api/images/${petType}/${petId}.${jpegExists ? 'jpg' : 'png'}`
              : null

            await this.db
              .prepare(
                'UPDATE pets SET hasJpeg = ?, hasWebp = ?, imageUrl = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?'
              )
              .bind(hasJpeg ? 1 : 0, hasWebp ? 1 : 0, imageUrl, petId)
              .run()

            updatedCount++
          }
        } catch (error) {
          errors.push({
            petId: pet['id'],
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return c.json({
        success: true,
        data: {
          totalPets: pets.results?.length || 0,
          updatedPets: updatedCount,
          errors: errors.length,
          errorDetails: errors,
        },
      })
    } catch (error) {
      return handleError(c, error)
    }
  }
  async getImage(c: Context<{ Bindings: Env }>) {
    try {
      const filename = c.req.param('filename')

      // ファイル名からpetIdを抽出（例: pet-home_pethome_524619.jpg -> pet-home_pethome_524619）
      const petIdMatch = filename.match(/^([\w-]+_[\w-]+_[\d]+)/)
      if (!petIdMatch) {
        throw new NotFoundError('Invalid filename format')
      }
      const petId = petIdMatch[1]

      // データベースでペット情報を確認
      if (!this.db) {
        throw new ServiceUnavailableError('Database not available')
      }

      const pet = await this.db
        .prepare('SELECT id, type, hasJpeg, hasWebp FROM pets WHERE id = ?')
        .bind(petId)
        .first()

      if (!pet) {
        throw new NotFoundError('Pet not found')
      }

      // R2から画像を取得
      if (!this.bucket) {
        throw new ServiceUnavailableError('Image storage not available')
      }

      // ファイル拡張子によって適切なファイルを取得
      const isWebP = filename.endsWith('.webp')
      let imageKey = `pets/${pet['type']}s/${petId}/${isWebP ? 'optimized.webp' : 'original.jpg'}`

      let object = await this.bucket.get(imageKey)

      // JPEGが見つからない場合、PNGスクリーンショットを試す
      if (!object && !isWebP) {
        imageKey = `pets/${pet['type']}s/${petId}/screenshot.png`
        object = await this.bucket.get(imageKey)
      }

      if (!object) {
        throw new NotFoundError('Image not found')
      }

      // 適切なContent-Typeを設定
      const contentType = isWebP
        ? 'image/webp'
        : imageKey.endsWith('.png')
          ? 'image/png'
          : 'image/jpeg'

      return new Response(object.body as ReadableStream<Uint8Array>, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=604800', // 7日間キャッシュ
          ETag: object.etag || '',
          'Last-Modified': object.uploaded?.toISOString() || new Date().toISOString(),
        },
      })
    } catch (error) {
      return handleError(c, error)
    }
  }

  async getImageByType(c: Context<{ Bindings: Env }>) {
    try {
      const petType = c.req.param('type')
      const filename = c.req.param('filename')
      const format = c.req.query('format') || 'auto'

      // バリデーション
      if (petType !== 'dog' && petType !== 'cat') {
        throw new Error('Invalid pet type')
      }

      const petId = extractPetIdFromFilename(filename)
      const fileMatch = filename.match(/\.(jpg|jpeg|png|webp)$/)
      const requestedFormat = fileMatch ? fileMatch[1] : format

      // 画像変換Workerへリクエストをプロキシ（将来の実装用）
      // const imageWorkerUrl = `https://image-worker.internal/convert/pets/${petType}s/${petId}/${requestedFormat}`;

      // R2から画像を取得
      if (!this.bucket) {
        throw new ServiceUnavailableError('Image storage not available')
      }

      // ファイル拡張子によって適切なファイルを取得
      const isWebP = requestedFormat === 'webp'
      let imageKey = `pets/${petType}s/${petId}/${isWebP ? 'optimized.webp' : 'original.jpg'}`

      let object = await this.bucket.get(imageKey)

      // JPEGが見つからない場合、PNGスクリーンショットを試す
      if (!object && !isWebP) {
        imageKey = `pets/${petType}s/${petId}/screenshot.png`
        object = await this.bucket.get(imageKey)
      }

      if (!object) {
        return c.notFound()
      }

      // 適切なContent-Typeを設定
      const contentType = isWebP
        ? 'image/webp'
        : imageKey.endsWith('.png')
          ? 'image/png'
          : 'image/jpeg'

      return new Response(object.body as ReadableStream<Uint8Array>, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=604800', // 7日間キャッシュ
          ETag: object.etag || '',
          'Last-Modified': object.uploaded?.toISOString() || new Date().toISOString(),
          'X-Served-By': 'PawMatch-API',
        },
      })
    } catch (error) {
      return handleError(c, error)
    }
  }
}
