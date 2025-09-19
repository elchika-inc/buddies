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
import { getDispatcherConfig } from '../config/dispatcher'

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
 * 画像変換処理を開始（手動またはスクリーンショット後）
 * POST /api/conversion/screenshot
 */
app.post('/screenshot', async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.json()

    // スクリーンショット結果またはペット情報のどちらかを受け入れる
    let pets: Array<{ id: string; type: 'dog' | 'cat'; screenshotKey?: string }>

    if ('screenshotResults' in body) {
      // スクリーンショット完了後の自動変換
      const results = body.screenshotResults as Array<{
        pet_id: string
        pet_type: 'dog' | 'cat'
        success: boolean
        screenshotKey?: string
      }>

      // 成功したスクリーンショットのみを抽出
      pets = results
        .filter((r) => r.success && r.screenshotKey)
        .map((r) => ({
          id: r.pet_id,
          type: r.pet_type,
          screenshotKey: r.screenshotKey,
        }))
    } else if ('pets' in body) {
      // 手動実行
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

      pets = validationResult.data.pets.slice(0, validationResult.data.limit)
    } else {
      return c.json(
        {
          success: false,
          error: 'Invalid request: must provide either screenshotResults or pets',
        },
        400
      )
    }

    if (pets.length === 0) {
      return c.json({
        success: true,
        message: 'No pets to convert',
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

    // Dispatcher設定を取得
    const dispatcherConfig = getDispatcherConfig()

    const result = await dispatcherClient.dispatchConversion({
      pets,
      limit: pets.length,
      config: {
        limits: dispatcherConfig.defaults,
        queue: dispatcherConfig.queue,
      },
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

export default app
