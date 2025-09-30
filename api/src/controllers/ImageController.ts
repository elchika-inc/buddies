import type { Context } from 'hono'
import {
  handleError,
  ServiceUnavailableError,
  NotFoundError,
  ValidationError,
} from '../utils/ErrorHandler'
import { R2PathBuilder } from '../utils/UrlBuilder'
import { isFile } from '../utils/TypeGuards'
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

      // Content-Typeのチェックとフォールバック処理
      const contentType = c.req.header('content-type') || ''
      let formData: FormData

      // multipart/form-dataまたはapplication/x-www-form-urlencodedの場合のみFormDataを使用
      if (
        contentType.includes('multipart/form-data') ||
        contentType.includes('application/x-www-form-urlencoded')
      ) {
        formData = await c.req.formData()
      } else {
        // その他の場合はJSONとして処理
        const body = (await c.req.json()) as {
          image?: string
          mimeType?: string
          filename?: string
          type?: string
        }
        formData = new FormData()

        if (body.image) {
          // base64データの場合
          const imageData = body.image.replace(/^data:image\/\w+;base64,/, '')
          const buffer = Uint8Array.from(atob(imageData), (c) => c.charCodeAt(0))
          const blob = new Blob([buffer], { type: body.mimeType || 'image/png' })
          formData.append('image', blob, body.filename || 'screenshot.png')
        }

        if (body.type) {
          formData.append('type', body.type)
        }
      }

      const fileValue = formData.get('image')
      const imageType = (formData.get('type') as string) || 'screenshot'

      if (!isFile(fileValue)) {
        return c.json({ success: false, error: 'No image provided or invalid file format' }, 400)
      }
      const file = fileValue

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
    // リクエスト開始時刻を記録
    const requestStart = Date.now()

    try {
      // リクエストのメタ情報を取得して詳細ログ出力
      const contentType = c.req.header('content-type') || ''
      const userAgent = c.req.header('user-agent') || ''
      const requestId = crypto.randomUUID().substring(0, 8)

      console.warn(`[${requestId}] uploadBatch started`, {
        method: c.req.method,
        contentType,
        userAgent,
        url: c.req.url,
        timestamp: new Date().toISOString(),
      })

      // リクエストボディの解析を試行 - 詳細なエラーハンドリング付き
      let rawBody = ''
      let parsedBody: unknown

      try {
        // まず生のテキストとして読み取り
        rawBody = await c.req.text()
        console.warn(`[${requestId}] Raw request body size: ${rawBody.length} bytes`)

        if (!rawBody || rawBody.length === 0) {
          throw new ValidationError('Empty request body')
        }

        // JSONとして解析を試行
        parsedBody = JSON.parse(rawBody)
        console.warn(`[${requestId}] JSON parsing successful`)
      } catch (parseError) {
        console.error(`[${requestId}] JSON parsing failed:`, {
          error: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
          bodyLength: rawBody.length,
          bodyPreview: rawBody.substring(0, 200) || 'No body',
          contentType,
        })

        return c.json(
          {
            success: false,
            error: 'Invalid JSON in request body',
            details: {
              parseError:
                parseError instanceof Error ? parseError.message : 'Unknown parsing error',
              contentType,
              bodyLength: rawBody.length,
            },
          },
          400
        )
      }

      // uploadsBatchの構造を検証
      const body = parsedBody as {
        uploads?: Array<{
          petId?: string
          imageData?: string
          mimeType?: string
        }>
      }

      console.warn(`[${requestId}] Request body structure:`, {
        hasUploads: !!body.uploads,
        uploadsType: typeof body.uploads,
        uploadsLength: Array.isArray(body.uploads) ? body.uploads.length : 'not array',
        bodyKeys: Object.keys(body),
        firstUploadKeys: body.uploads?.[0] ? Object.keys(body.uploads[0]) : 'no uploads',
      })

      // バリデーション: uploadsが存在し、配列であることを確認
      if (!body.uploads) {
        console.error(`[${requestId}] Missing uploads field`)
        return c.json(
          {
            success: false,
            error: 'Missing uploads field in request body',
            details: {
              receivedKeys: Object.keys(body),
              expectedField: 'uploads',
            },
          },
          400
        )
      }

      if (!Array.isArray(body.uploads)) {
        console.error(`[${requestId}] uploads field is not an array:`, typeof body.uploads)
        return c.json(
          {
            success: false,
            error: 'uploads field must be an array',
            details: {
              receivedType: typeof body.uploads,
              expectedType: 'array',
            },
          },
          400
        )
      }

      if (body.uploads.length === 0) {
        console.error(`[${requestId}] Empty uploads array`)
        return c.json(
          {
            success: false,
            error: 'Empty uploads array',
            details: {
              uploadsLength: 0,
            },
          },
          400
        )
      }

      // 各uploadアイテムの検証
      for (let i = 0; i < body.uploads.length; i++) {
        const upload = body.uploads[i]

        // uploadが存在するかチェック
        if (!upload) {
          console.error(`[${requestId}] Upload item ${i} is undefined`)
          return c.json(
            {
              success: false,
              error: `Upload item ${i} is undefined`,
              details: {
                uploadIndex: i,
              },
            },
            400
          )
        }

        console.warn(`[${requestId}] Validating upload ${i}:`, {
          hasPetId: !!upload.petId,
          hasImageData: !!upload.imageData,
          hasMimeType: !!upload.mimeType,
          petId: upload.petId,
          mimeType: upload.mimeType,
          imageDataLength: upload.imageData?.length || 0,
          keys: Object.keys(upload),
        })

        if (!upload.petId) {
          console.error(`[${requestId}] Missing petId in upload ${i}`)
          return c.json(
            {
              success: false,
              error: `Missing petId in upload ${i}`,
              details: {
                uploadIndex: i,
                uploadKeys: Object.keys(upload),
              },
            },
            400
          )
        }

        if (!upload.imageData) {
          console.error(`[${requestId}] Missing imageData in upload ${i}`)
          return c.json(
            {
              success: false,
              error: `Missing imageData in upload ${i}`,
              details: {
                uploadIndex: i,
                petId: upload.petId,
                uploadKeys: Object.keys(upload),
              },
            },
            400
          )
        }

        if (!upload.mimeType) {
          console.error(`[${requestId}] Missing mimeType in upload ${i}`)
          return c.json(
            {
              success: false,
              error: `Missing mimeType in upload ${i}`,
              details: {
                uploadIndex: i,
                petId: upload.petId,
                uploadKeys: Object.keys(upload),
              },
            },
            400
          )
        }

        // base64データの有効性を確認
        try {
          const decoded = atob(upload.imageData)
          if (decoded.length === 0) {
            throw new Error('Decoded data is empty')
          }
          console.warn(
            `[${requestId}] Upload ${i} base64 data valid, decoded size: ${decoded.length}`
          )
        } catch (decodeError) {
          console.error(`[${requestId}] Invalid base64 data in upload ${i}:`, decodeError)
          return c.json(
            {
              success: false,
              error: `Invalid base64 imageData in upload ${i}`,
              details: {
                uploadIndex: i,
                petId: upload.petId,
                decodeError:
                  decodeError instanceof Error ? decodeError.message : 'Unknown decode error',
              },
            },
            400
          )
        }
      }

      // サービス依存性の確認
      if (!this.bucket || !this.db) {
        console.error(`[${requestId}] Missing services:`, {
          hasBucket: !!this.bucket,
          hasDb: !!this.db,
        })
        throw new ServiceUnavailableError('Storage or database not available')
      }

      // アップロード処理の実行
      console.warn(`[${requestId}] Starting upload process for ${body.uploads.length} items`)
      const results = []

      for (let i = 0; i < body.uploads.length; i++) {
        const upload = body.uploads[i]

        // uploadが正しく検証されていることを確認（上記のバリデーションで検証済み）
        if (!upload || !upload.petId || !upload.imageData || !upload.mimeType) {
          // これは起こり得ないが、TypeScriptのためにチェック
          continue
        }

        const uploadStart = Date.now()

        try {
          console.warn(`[${requestId}] Processing upload ${i} for pet ${upload.petId}`)

          // ペット情報を取得
          const pet = await this.db
            .prepare('SELECT id, type FROM pets WHERE id = ?')
            .bind(upload.petId)
            .first()

          if (!pet) {
            console.warn(`[${requestId}] Pet not found: ${upload.petId}`)
            results.push({
              petId: upload.petId,
              success: false,
              error: 'Pet not found',
              uploadIndex: i,
            })
            continue
          }

          const petType = pet['type'] as string
          console.warn(`[${requestId}] Pet found: ${upload.petId} (${petType})`)

          // Base64データをデコード
          const imageBuffer = Uint8Array.from(atob(upload.imageData!), (c) => c.charCodeAt(0))
          const isWebp = upload.mimeType === 'image/webp'
          const isPng = upload.mimeType === 'image/png'

          const filename = isPng ? 'screenshot.png' : isWebp ? 'optimized.webp' : 'original.jpg'
          const key = `pets/${petType}s/${upload.petId}/${filename}`

          console.warn(`[${requestId}] Uploading to R2: ${key} (${imageBuffer.length} bytes)`)

          // R2にアップロード
          await this.bucket.put(key, imageBuffer, {
            httpMetadata: {
              contentType: upload.mimeType!,
            },
            customMetadata: {
              petId: upload.petId!,
              petType,
              uploadedAt: new Date().toISOString(),
              requestId,
              uploadIndex: i.toString(),
            },
          })

          console.warn(`[${requestId}] R2 upload successful: ${key}`)

          // データベースのフラグを更新
          if (isWebp) {
            await this.db
              .prepare('UPDATE pets SET hasWebp = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
              .bind(upload.petId)
              .run()
            console.warn(`[${requestId}] Updated hasWebp flag for ${upload.petId}`)
          } else {
            const imageUrl = `https://pawmatch-api.elchika.app/api/images/${petType}/${upload.petId}.${isPng ? 'png' : 'jpg'}`
            await this.db
              .prepare(
                'UPDATE pets SET hasJpeg = 1, imageUrl = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?'
              )
              .bind(imageUrl, upload.petId)
              .run()
            console.warn(`[${requestId}] Updated hasJpeg flag and imageUrl for ${upload.petId}`)
          }

          const uploadDuration = Date.now() - uploadStart
          console.warn(`[${requestId}] Upload ${i} completed in ${uploadDuration}ms`)

          results.push({
            petId: upload.petId,
            success: true,
            key,
            uploadIndex: i,
            duration: uploadDuration,
            size: imageBuffer.length,
          })
        } catch (error) {
          const uploadDuration = Date.now() - uploadStart
          console.error(`[${requestId}] Upload ${i} failed:`, {
            petId: upload.petId,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: uploadDuration,
          })

          results.push({
            petId: upload.petId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            uploadIndex: i,
            duration: uploadDuration,
          })
        }
      }

      const totalDuration = Date.now() - requestStart
      const successful = results.filter((r) => r.success).length
      const failed = results.filter((r) => !r.success).length

      console.warn(`[${requestId}] uploadBatch completed:`, {
        total: body.uploads.length,
        successful,
        failed,
        duration: totalDuration,
      })

      return c.json({
        success: true,
        data: {
          requestId,
          total: body.uploads.length,
          successful,
          failed,
          results,
          duration: totalDuration,
        },
      })
    } catch (error) {
      const totalDuration = Date.now() - requestStart
      console.error(`uploadBatch error:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: totalDuration,
      })

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

      // ファイル名から拡張子を除去してpetIdとして使用
      // 例: pet-home_pethome_123456.jpg -> pet-home_pethome_123456
      const petId = filename.replace(/\.(jpg|jpeg|png|webp)$/, '')
      const fileMatch = filename.match(/\.(jpg|jpeg|png|webp)$/)
      const requestedFormat = fileMatch ? fileMatch[1] : format

      // R2から画像を取得
      if (!this.bucket) {
        throw new ServiceUnavailableError('Image storage not available')
      }

      // ファイル拡張子によって適切なファイルを取得
      const isWebP = requestedFormat === 'webp'
      let imageKey = R2PathBuilder.petImagePath(
        petType as 'dog' | 'cat',
        petId,
        isWebP ? 'optimized' : 'original'
      )

      let object = await this.bucket.get(imageKey)

      // JPEGが見つからない場合、PNGスクリーンショットを試す
      if (!object && !isWebP) {
        imageKey = R2PathBuilder.petImagePath(petType as 'dog' | 'cat', petId, 'screenshot')
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
