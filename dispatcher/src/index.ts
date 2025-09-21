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
   * Cronハンドラ（削除済み）
   * DispatcherはAPI経由でのみ起動されます
   */
  async scheduled(_event: ScheduledEvent, _env: Env): Promise<void> {
    // Cronトリガーは削除されました
    // この関数は呼ばれることはありません
    console.warn('Unexpected: Dispatcher scheduled handler called but Cron is removed')
  },
}
