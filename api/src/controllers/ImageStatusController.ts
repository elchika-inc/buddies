import { Context } from 'hono'
import { z } from 'zod'
import { ImageDatabaseService } from '../services/image/ImageDatabaseService'
import { ValidationError } from '../utils/ErrorHandler'
import { generateRequestId } from '../utils/RequestId'

const updateStatusSchema = z.object({
  petId: z.string().min(1),
  petType: z.enum(['dog', 'cat']),
  screenshotKey: z.string().min(1),
  hasScreenshot: z.boolean(),
})

export class ImageStatusController {
  constructor(private db: D1Database) {}

  /**
   * 画像アップロード後のステータス更新
   */
  async updateStatus(c: Context) {
    const requestId = generateRequestId()

    try {
      console.log(`[${requestId}] updateStatus started`, {
        method: c.req.method,
        url: c.req.url,
        timestamp: new Date().toISOString(),
      })

      // リクエストボディの取得と検証
      const body = await c.req.json()
      console.log(`[${requestId}] Request body received`, {
        bodyKeys: Object.keys(body),
        petId: body.petId,
        petType: body.petType,
        hasScreenshot: body.hasScreenshot,
      })

      const parsed = updateStatusSchema.safeParse(body)
      if (!parsed.success) {
        console.error(`[${requestId}] Validation failed`, {
          errors: parsed.error.errors,
          body: body,
        })
        throw new ValidationError('Invalid request body', parsed.error.errors)
      }

      const { petId, petType, screenshotKey, hasScreenshot } = parsed.data
      console.log(`[${requestId}] Updating screenshot status`, {
        petId,
        petType,
        screenshotKey,
        hasScreenshot,
      })

      // データベースサービスを使用してステータス更新
      const dbService = new ImageDatabaseService(this.db)
      const result = await dbService.updateScreenshotStatus(petId, petType)

      if (!result.success) {
        console.error(`[${requestId}] Database update failed`, {
          error: result.error,
          petId,
          petType,
        })
        return c.json(
          {
            success: false,
            error: result.error || 'Failed to update screenshot status',
          },
          500
        )
      }

      console.log(`[${requestId}] Screenshot status updated successfully`, {
        petId,
        petType,
        screenshotKey,
      })

      return c.json({
        success: true,
        data: {
          petId,
          petType,
          screenshotKey,
          hasScreenshot,
          updatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error(`[${requestId}] updateStatus error:`, error)

      if (error instanceof ValidationError) {
        return c.json(
          {
            success: false,
            error: error.message,
            details: error.details,
          },
          400
        )
      }

      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        },
        500
      )
    }
  }
}
