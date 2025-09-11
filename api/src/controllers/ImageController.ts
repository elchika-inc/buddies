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
