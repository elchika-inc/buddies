/**
 * PawMatch Dispatcher - Cloudflare Workers Entry Point
 *
 * このモジュールは、画像処理が必要なペットを検出し、
 * GitHub Actionsワークフローをトリガーして画像変換を実行します。
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { MessageBatch, ScheduledEvent } from '@cloudflare/workers-types'

// Controllers
import { DispatchController } from './controllers/DispatchController'

// Handlers
import { QueueHandler } from './handlers/QueueHandler'

// Types
import type { Env, DispatchMessage } from './types'

const app = new Hono<{ Bindings: Env }>()

// CORS設定
app.use('*', cors())

// コントローラーのセットアップ
const setupRoutes = (app: Hono<{ Bindings: Env }>) => {
  // ヘルスチェック
  app.get('/', async (c) => {
    const controller = new DispatchController(c.env)
    return controller.healthCheck(c)
  })

  // ディスパッチエンドポイント
  app.post('/dispatch', async (c) => {
    const controller = new DispatchController(c.env)
    return controller.handleDispatch(c)
  })

  // スケジュール実行エンドポイント
  app.post('/scheduled', async (c) => {
    const controller = new DispatchController(c.env)
    return controller.handleScheduled(c)
  })

  // クローラートリガーエンドポイント
  app.post('/trigger-crawler', async (c) => {
    const controller = new DispatchController(c.env)
    return controller.handleCrawlerTrigger(c)
  })

  // 画像変換ディスパッチエンドポイント
  app.post('/dispatch-conversion', async (c) => {
    const controller = new DispatchController(c.env)
    return controller.handleDispatchConversion(c)
  })
}

// ルートをセットアップ
setupRoutes(app)

/**
 * Cloudflare Workers標準エクスポート
 */
export default {
  /**
   * HTTPリクエストハンドラ
   */
  fetch: app.fetch,

  /**
   * Queueハンドラ
   * GitHub Actionsからの処理完了通知を受信
   */
  async queue(batch: MessageBatch<DispatchMessage>, env: Env): Promise<void> {
    const handler = new QueueHandler(env)
    await handler.handleBatch(batch)
  },

  /**
   * Cronハンドラ
   * 定期的な画像処理バッチを実行
   */
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    // Cronベースのスケジューリングは現在無効化
    // 必要に応じて /scheduled エンドポイント経由で手動実行
    const { getLogger } = await import('./utils/logger')
    const logger = getLogger(env)
    logger.warn('Dispatcher scheduled handler called but should be disabled', {
      cron: event.cron,
      timestamp: new Date().toISOString(),
    })
  },
}
