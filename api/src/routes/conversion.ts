/**
 * 画像変換処理のエンドポイント
 * Dispatcher経由で画像変換ワークフローをトリガー
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import type { Env } from '../types'
import { DispatcherServiceClient } from '../../../shared/services/dispatcher-client'
import { Result } from '../../../shared/types/result'

const conversionRequestSchema = z.object({
  pets: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['dog', 'cat']),
      screenshotKey: z.string().optional(),
    })
  ),
  limit: z.number().min(1).max(100).optional().default(50),
})

const app = new Hono<{ Bindings: Env }>()

/**
 * 手動で画像変換処理を開始
 * POST /api/conversion/manual-start
 */
app.post('/manual-start', async (c: Context<{ Bindings: Env }>) => {
  try {
    // リクエストデータの検証
    const body = await c.req.json()
    const validationResult = conversionRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return c.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.flatten(),
        },
        400
      )
    }

    const { pets, limit } = validationResult.data

    if (pets.length === 0) {
      return c.json(
        {
          success: false,
          error: 'No pets provided for conversion',
        },
        400
      )
    }

    // Service Binding経由でDispatcherを呼び出し
    const dispatcherClient = new DispatcherServiceClient(c.env.DISPATCHER)

    if (!dispatcherClient.isAvailable()) {
      return c.json(
        {
          success: false,
          error: 'Dispatcher service not configured',
        },
        500
      )
    }

    const result = await dispatcherClient.dispatchConversion({
      pets: pets.slice(0, limit),
      limit,
    })

    if (Result.isErr(result)) {
      return c.json(
        {
          success: false,
          error: 'Failed to trigger conversion',
          details: result.error.message,
        },
        500
      )
    }

    return c.json({
      success: result.data.success,
      batchId: result.data.batchId,
      count: result.data.count,
      message: result.data.message || 'Image conversion triggered successfully',
    })
  } catch (error) {
    console.error('Conversion trigger error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * スクリーンショット撮影完了後に画像変換を開始
 * POST /api/conversion/after-screenshot
 */
app.post('/after-screenshot', async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = (await c.req.json()) as {
      screenshotResults: Array<{
        pet_id: string
        pet_type: 'dog' | 'cat'
        success: boolean
        screenshotKey?: string
      }>
    }

    // 成功したスクリーンショットのみを抽出
    const successfulPets = body.screenshotResults
      .filter((r) => r.success && r.screenshotKey)
      .map((r) => ({
        id: r.pet_id,
        type: r.pet_type,
        screenshotKey: r.screenshotKey,
      }))

    if (successfulPets.length === 0) {
      return c.json({
        success: true,
        message: 'No successful screenshots to convert',
      })
    }

    // Dispatcher経由で変換をトリガー
    const dispatcherClient = new DispatcherServiceClient(c.env.DISPATCHER)

    if (!dispatcherClient.isAvailable()) {
      return c.json(
        {
          success: false,
          error: 'Dispatcher service not configured',
        },
        500
      )
    }

    const result = await dispatcherClient.dispatchConversion({
      pets: successfulPets,
    })

    if (Result.isErr(result)) {
      return c.json(
        {
          success: false,
          error: 'Failed to trigger auto-conversion',
          details: result.error.message,
        },
        500
      )
    }

    return c.json({
      success: result.data.success,
      batchId: result.data.batchId,
      count: result.data.count,
      message: result.data.message || 'Auto-conversion triggered successfully',
    })
  } catch (error) {
    console.error('Auto-conversion trigger error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

export default app
