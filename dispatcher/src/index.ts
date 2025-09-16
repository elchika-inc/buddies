/**
 * PawMatch Dispatcher - Cloudflare Workers Entry Point
 *
 * このモジュールは、画像処理が必要なペットを検出し、
 * GitHub Actionsワークフローをトリガーして画像変換を実行します。
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Context } from 'hono'
import type { MessageBatch, ScheduledEvent } from '@cloudflare/workers-types'
import { Result } from '../../shared/types/result'

// types/indexから型定義をインポート（ローカル定義を削除）
import { ApiService } from './services/ApiService'
import { QueueService } from './services/QueueService'
import { QueueHandler } from './handlers/QueueHandler'
import type { Env, DispatchMessage, Pet } from './types'
import type {
  ErrorResponse,
  HealthCheckResponse,
  DispatchResponse,
  CrawlerTriggerResponse,
  ConversionDispatchResponse,
  HistoryResponse,
} from './types/responses'

const app = new Hono<{ Bindings: Env }>()

// CORS設定
app.use('*', cors())

/**
 * ヘルスチェックエンドポイント
 */
app.get('/', (c) => {
  const response: HealthCheckResponse = {
    service: 'PawMatch Dispatcher',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    success: true,
  }
  return c.json(response)
})

/**
 * ペット処理バッチを作成・送信する共通処理
 */
async function createAndSendBatch(
  env: Env,
  limit: number,
  prefix: 'dispatch' | 'cron'
): Promise<DispatchResponse | ErrorResponse> {
  try {
    const apiService = new ApiService(env)
    const queueService = new QueueService(env)

    // 画像がないペットを取得
    const result = await apiService.fetchPetsWithoutImages(limit)

    if (Result.isErr(result)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: result.error.message,
      }
      return errorResponse
    }

    const pets = Result.isOk(result) ? result.data : []

    if (pets.length === 0) {
      const response: DispatchResponse = {
        success: true,
        message: 'No pets without images found',
        count: 0,
        batchId: '',
      }
      return response
    }

    // バッチIDを生成
    const batchId = QueueService.generateBatchId(prefix)

    // PetをPetDispatchDataに変換
    const petDispatchData = pets.map(QueueService.convertPetToDispatchData)

    // Queueにメッセージを送信
    const sendResult = await queueService.sendDispatchMessage(petDispatchData, batchId)

    if (Result.isErr(sendResult)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: sendResult.error.message,
      }
      return errorResponse
    }

    const response: DispatchResponse = {
      success: true,
      batchId,
      count: pets.length,
      message: 'Batch queued for processing',
      pets: pets.map((p: Pet) => ({ id: p.id, name: p.name })),
    }
    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorResponse: ErrorResponse = {
      success: false,
      error: errorMessage,
    }
    return errorResponse
  }
}

/**
 * 手動ディスパッチエンドポイント
 */
interface DispatchRequest {
  limit?: number
}

app.post('/dispatch', async (c: Context<{ Bindings: Env }>) => {
  let requestData: DispatchRequest = {}

  try {
    const rawData = await c.req.json()
    if (rawData && typeof rawData === 'object' && 'limit' in rawData) {
      const limit = (rawData as Record<string, unknown>)['limit']
      if (typeof limit === 'number' && limit > 0 && limit <= 100) {
        requestData.limit = limit
      }
    }
  } catch {
    // JSONパースエラーは無視してデフォルト値を使用
  }

  const { limit = 30 } = requestData
  const result = await createAndSendBatch(c.env, limit, 'dispatch')

  if (result.success) {
    return c.json(result)
  } else {
    console.error('Dispatch error:', result.error)
    return c.json(result, 500)
  }
})

/**
 * 定期実行エンドポイント（Cron用）
 */
app.post('/scheduled', async (c: Context<{ Bindings: Env }>) => {
  const result = await createAndSendBatch(c.env, 30, 'cron')

  if (result.success) {
    return c.json(result)
  } else {
    console.error('Scheduled dispatch error:', result.error)
    return c.json(result, 500)
  }
})

interface CrawlerTriggerRequest {
  type?: 'dog' | 'cat' | 'both'
  limit?: number
}

/**
 * Crawler起動エンドポイント（API経由で呼ばれる）
 */
app.post('/trigger-crawler', async (c: Context<{ Bindings: Env }>) => {
  try {
    const requestData = (await c.req.json()) as CrawlerTriggerRequest

    const { type = 'both', limit = 10 } = requestData

    // Queueにクロール要求を送信
    const messages: DispatchMessage[] = []

    if (type === 'dog' || type === 'both') {
      messages.push({
        type: 'crawler',
        batchId: QueueService.generateBatchId('crawler'),
        timestamp: new Date().toISOString(),
        crawlerData: {
          petType: 'dog',
          limit,
        },
      })
    }

    if (type === 'cat' || type === 'both') {
      messages.push({
        type: 'crawler',
        batchId: QueueService.generateBatchId('crawler'),
        timestamp: new Date().toISOString(),
        crawlerData: {
          petType: 'cat',
          limit,
        },
      })
    }

    // メッセージをQueueに送信
    for (const message of messages) {
      await c.env.PAWMATCH_DISPATCH_QUEUE.send(message)
    }

    const response: CrawlerTriggerResponse = {
      success: true,
      message: `Crawler triggered for ${type}`,
      batches: messages.map((m) => ({
        batchId: m.batchId,
        petType: m.crawlerData?.petType ?? 'unknown',
      })),
    }
    return c.json(response)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Crawler trigger error:', errorMessage)
    const errorResponse: ErrorResponse = {
      success: false,
      error: errorMessage,
    }
    return c.json(errorResponse, 500)
  }
})

interface ConversionDispatchRequest {
  pets?: Array<{ id: string; type: 'dog' | 'cat'; screenshotKey?: string }>
  limit?: number
}

/**
 * 画像変換ディスパッチエンドポイント
 */
app.post('/dispatch-conversion', async (c: Context<{ Bindings: Env }>) => {
  try {
    const requestData = (await c.req.json()) as ConversionDispatchRequest

    const { pets = [], limit = 50 } = requestData

    if (pets.length === 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'No pets provided for conversion',
      }
      return c.json(errorResponse, 400)
    }

    // バッチIDを生成
    const batchId = QueueService.generateBatchId('conversion')

    // ConversionDataを作成
    const conversionData = pets.slice(0, limit).map((pet) => ({
      id: pet.id,
      type: pet.type,
      screenshotKey: pet.screenshotKey,
    }))

    // Queueにメッセージを送信
    const message: DispatchMessage = {
      type: 'conversion',
      batchId,
      timestamp: new Date().toISOString(),
      conversionData,
      workflowFile: 'image-conversion.yml',
    }

    await c.env.PAWMATCH_DISPATCH_QUEUE.send(message)

    const response: ConversionDispatchResponse = {
      success: true,
      batchId,
      count: conversionData.length,
      message: 'Image conversion batch queued for processing',
    }
    return c.json(response)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Conversion dispatch error:', errorMessage)
    const errorResponse: ErrorResponse = {
      success: false,
      error: errorMessage,
    }
    return c.json(errorResponse, 500)
  }
})

/**
 * ディスパッチ履歴エンドポイント（将来の実装用）
 */
app.get('/history', async (c: Context<{ Bindings: Env }>) => {
  const response: HistoryResponse = {
    success: true,
    message: 'History endpoint not yet implemented',
    history: [],
  }
  return c.json(response)
})

/**
 * Cloudflare Workers エクスポート
 */
export default {
  /**
   * HTTPリクエストハンドラー
   */
  fetch: app.fetch,

  /**
   * Queueコンシューマー
   */
  async queue(batch: MessageBatch<DispatchMessage>, env: Env): Promise<void> {
    const handler = new QueueHandler(env)
    await handler.handleBatch(batch)
  },

  /**
   * Cronジョブハンドラー
   */
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    try {
      // Scheduled execution triggered

      // /scheduledエンドポイントを呼び出し
      const response = await app.fetch(
        new Request('http://dispatcher/scheduled', {
          method: 'POST',
        }),
        env
      )

      await response.json()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Scheduled execution error:', errorMessage)
    }
  },
}
