/**
 * ディスパッチコントローラー
 * HTTPリクエストの処理とレスポンス生成を担当
 */

import { Context } from 'hono'
import { DispatchService } from '../services/DispatchService'
import { CrawlerService } from '../services/CrawlerService'
import { ConversionService } from '../services/ConversionService'
import {
  createSuccessResponse,
  createErrorResponse,
  handleValidationError,
} from '../utils/responseHelpers'
import { HTTP_STATUS } from '../constants'
import {
  DispatchRequestSchema,
  CrawlerTriggerRequestSchema,
  ConversionRequestSchema,
  formatZodError,
} from '../schemas/validation'
import type { Env } from '../types'

/**
 * ディスパッチコントローラークラス
 */
export class DispatchController {
  private dispatchService: DispatchService
  private crawlerService: CrawlerService
  private conversionService: ConversionService

  constructor(env: Env) {
    this.dispatchService = new DispatchService(env)
    this.crawlerService = new CrawlerService(env)
    this.conversionService = new ConversionService(env)
  }

  /**
   * ヘルスチェックエンドポイント
   */
  async healthCheck(c: Context): Promise<Response> {
    return c.json(createSuccessResponse({ status: 'healthy' }, 'PawMatch Dispatcher is running'))
  }

  /**
   * ディスパッチエンドポイント
   * 画像なしペットのバッチ処理を開始
   */
  async handleDispatch(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      const rawData = await c.req.json().catch(() => ({}))
      const validationResult = DispatchRequestSchema.safeParse(rawData)

      if (!validationResult.success) {
        return handleValidationError(formatZodError(validationResult.error), c)
      }

      const result = await this.dispatchService.createAndSendBatch(
        validationResult.data.limit,
        'dispatch'
      )

      if (!result.success) {
        return c.json(result, HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return c.json(result, HTTP_STATUS.OK)
    } catch (error) {
      // エラーはレスポンスヘルパーで処理
      return c.json(createErrorResponse(error as Error), HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * スケジュール実行エンドポイント
   * Cron実行用のバッチ処理
   */
  async handleScheduled(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      const result = await this.dispatchService.createAndSendBatch(
        30, // DEFAULT_SCHEDULED
        'cron'
      )

      if (!result.success) {
        return c.json(result, HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return c.json(result, HTTP_STATUS.OK)
    } catch (error) {
      // エラーはレスポンスヘルパーで処理
      return c.json(createErrorResponse(error as Error), HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * クローラートリガーエンドポイント
   * GitHub Actionsのクローラーワークフローをトリガー
   */
  async handleCrawlerTrigger(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      const rawData = await c.req.json().catch(() => ({}))
      const validationResult = CrawlerTriggerRequestSchema.safeParse(rawData)

      if (!validationResult.success) {
        return handleValidationError(formatZodError(validationResult.error), c)
      }

      const result = await this.crawlerService.triggerCrawler(
        validationResult.data.type,
        validationResult.data.limit
      )

      if (!result.success) {
        return c.json(result, HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return c.json(result, HTTP_STATUS.OK)
    } catch (error) {
      // エラーはレスポンスヘルパーで処理
      return c.json(createErrorResponse(error as Error), HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * 画像変換ディスパッチエンドポイント
   * JPEG画像をWebP形式に変換
   */
  async handleDispatchConversion(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      const rawData = await c.req.json().catch(() => ({}))
      const validationResult = ConversionRequestSchema.safeParse(rawData)

      if (!validationResult.success) {
        return handleValidationError(formatZodError(validationResult.error), c)
      }

      const result = await this.conversionService.dispatchConversion(
        validationResult.data.pets,
        validationResult.data.limit
      )

      if (!result.success) {
        return c.json(result, HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return c.json(result, HTTP_STATUS.OK)
    } catch (error) {
      // エラーはレスポンスヘルパーで処理
      return c.json(createErrorResponse(error as Error), HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }
}
