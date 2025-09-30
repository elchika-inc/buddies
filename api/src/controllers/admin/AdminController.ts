import type { Context } from 'hono'
import type { Env } from '../../types'

// リクエスト/レスポンスの型定義
interface UpdateFlagsRequest {
  petType: string
  petIds: string[]
  flags: {
    hasWebp?: boolean
    hasJpeg?: boolean
  }
}

interface UpdateImagesRequest {
  results: Array<{
    success: boolean
    petId?: string
    jpegUrl?: string
    webpUrl?: string
  }>
}

interface UpdateResult {
  success: boolean
  updated?: number
  requested?: number
  petType?: string
  message?: string
  updatedCount?: number
  errors?: Array<{
    petId: string
    error: string
  }>
  error?: string
}

/**
 * 管理機能用コントローラー
 * ペットフラグの更新、画像処理結果の反映などの管理タスクを担当
 */
export class AdminController {
  constructor(private db: D1Database) {}

  /**
   * ペットフラグを一括更新
   * @param c Honoコンテキスト
   * @returns 更新結果
   */
  async updatePetFlags(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      console.warn('[update-flags] Processing request')

      const body = await c.req.json<UpdateFlagsRequest>()

      // リクエストボディの検証
      if (!this.validateUpdateFlagsRequest(body)) {
        return c.json<UpdateResult>(
          {
            success: false,
            error: 'Invalid request body',
          },
          400
        )
      }

      const { petType, petIds, flags } = body
      console.warn(`[update-flags] Updating ${petIds.length} ${petType} records`)

      // フラグの更新フィールドを構築
      const updateFields = this.buildUpdateFields(flags)

      if (updateFields.length === 0) {
        return c.json<UpdateResult>(
          {
            success: false,
            error: 'No flags to update',
          },
          400
        )
      }

      // バッチ更新の実行
      const totalUpdated = await this.batchUpdatePets(petIds, petType, updateFields)

      console.warn(`[update-flags] Total updated: ${totalUpdated}/${petIds.length}`)

      return c.json<UpdateResult>({
        success: true,
        updated: totalUpdated,
        requested: petIds.length,
        petType,
      })
    } catch (error) {
      console.error('[update-flags] Error:', error)
      return c.json<UpdateResult>(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update flags',
        },
        500
      )
    }
  }

  /**
   * スクリーンショット処理後の画像フラグを更新
   * @param c Honoコンテキスト
   * @returns 更新結果
   */
  async updateImages(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      console.warn('[update-images] Request received')

      const body = await c.req.json<UpdateImagesRequest>()

      // リクエストボディの検証
      if (!this.validateUpdateImagesRequest(body)) {
        return c.json<UpdateResult>(
          {
            success: false,
            error: 'Invalid request body',
          },
          400
        )
      }

      console.warn(`[update-images] Processing ${body.results.length} results`)

      const { updatedCount, errors } = await this.processImageUpdates(body.results)

      console.warn(
        `[update-images] Update complete - updated: ${updatedCount}, errors: ${errors.length}`
      )

      const result: UpdateResult = {
        success: true,
        message: `Updated ${updatedCount} pets`,
        updatedCount,
      }

      if (errors.length > 0) {
        result.errors = errors
      }

      return c.json<UpdateResult>(result)
    } catch (error) {
      console.error('Update images error:', error)
      return c.json<UpdateResult>(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update images',
        },
        500
      )
    }
  }

  /**
   * UpdateFlagsRequestの検証
   */
  private validateUpdateFlagsRequest(body: unknown): body is UpdateFlagsRequest {
    const b = body as Record<string, unknown>
    return !!(
      b?.['petType'] &&
      b?.['petIds'] &&
      Array.isArray(b['petIds']) &&
      b?.['flags'] &&
      typeof b['flags'] === 'object'
    )
  }

  /**
   * UpdateImagesRequestの検証
   */
  private validateUpdateImagesRequest(body: unknown): body is UpdateImagesRequest {
    const b = body as Record<string, unknown>
    return !!(b?.['results'] && Array.isArray(b['results']))
  }

  /**
   * 更新フィールドの構築
   */
  private buildUpdateFields(flags: UpdateFlagsRequest['flags']): string[] {
    const updateFields: string[] = []

    if (flags.hasWebp !== undefined) {
      updateFields.push(`hasWebp = ${flags.hasWebp ? 1 : 0}`)
    }
    if (flags.hasJpeg !== undefined) {
      updateFields.push(`hasJpeg = ${flags.hasJpeg ? 1 : 0}`)
    }

    return updateFields
  }

  /**
   * ペットのバッチ更新
   */
  private async batchUpdatePets(
    petIds: string[],
    petType: string,
    updateFields: string[]
  ): Promise<number> {
    const BATCH_SIZE = 50
    let totalUpdated = 0

    for (let i = 0; i < petIds.length; i += BATCH_SIZE) {
      const batch = petIds.slice(i, i + BATCH_SIZE)
      const placeholders = batch.map(() => '?').join(',')

      const sql = `
        UPDATE pets 
        SET ${updateFields.join(', ')}, 
            updatedAt = datetime('now')
        WHERE id IN (${placeholders}) 
          AND type = ?
      `

      const result = await this.db
        .prepare(sql)
        .bind(...batch, petType)
        .run()

      totalUpdated += result.meta.changes || 0
      console.warn(
        `[update-flags] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.meta.changes} updated`
      )
    }

    return totalUpdated
  }

  /**
   * 画像更新処理
   */
  private async processImageUpdates(
    results: UpdateImagesRequest['results']
  ): Promise<{ updatedCount: number; errors: Array<{ petId: string; error: string }> }> {
    let updatedCount = 0
    const errors: Array<{ petId: string; error: string }> = []

    for (const result of results) {
      if (result.success && result.petId) {
        try {
          const hasJpeg = result.jpegUrl ? 1 : 0
          const hasWebp = result.webpUrl ? 1 : 0

          console.warn(
            `[update-images] Updating pet ${result.petId}: hasJpeg=${hasJpeg}, hasWebp=${hasWebp}`
          )

          const updateResult = await this.db
            .prepare(
              `
            UPDATE pets 
            SET hasJpeg = ?, 
                hasWebp = ?,
                screenshotCompletedAt = CURRENT_TIMESTAMP,
                imageCheckedAt = CURRENT_TIMESTAMP
            WHERE id = ?
          `
            )
            .bind(hasJpeg, hasWebp, result.petId)
            .run()

          if (updateResult.meta.changes > 0) {
            updatedCount++
            console.warn(`[update-images] Successfully updated pet ${result.petId}`)
          } else {
            console.warn(
              `[update-images] No rows updated for pet ${result.petId} - pet may not exist`
            )
            errors.push({
              petId: result.petId,
              error: 'Pet not found in database',
            })
          }
        } catch (error) {
          console.error(`[update-images] Error updating pet ${result.petId}:`, error)
          errors.push({
            petId: result.petId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      } else {
        console.warn(
          `[update-images] Skipping result - success: ${result.success}, petId: ${result.petId}`
        )
      }
    }

    return { updatedCount, errors }
  }
}
