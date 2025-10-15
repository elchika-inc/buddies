/**
 * ヘルスチェック API ルート
 */

import { Hono } from 'hono'
import type { Env } from '../types/env'
import { HealthService } from '../services/HealthService'

export const healthRoute = new Hono<{ Bindings: Env }>()

/**
 * 全サービスのヘルスチェック
 * GET /api/health/check
 */
healthRoute.get('/check', async (c) => {
  try {
    const healthService = new HealthService(c.env)
    const result = await healthService.checkAllServices()

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Health check error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to check service health',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})
