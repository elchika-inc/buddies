/**
 * Zodバリデーションスキーマ定義
 */

import { z } from 'zod'

/**
 * ディスパッチリクエストのスキーマ
 * APIからペットデータと設定が渡される
 */
export const DispatchRequestSchema = z.object({
  pets: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        type: z.enum(['dog', 'cat']),
        sourceUrl: z.string(),
      })
    )
    .optional()
    .default([]),
  source: z.string().optional().default('api'),
  config: z
    .object({
      limits: z
        .object({
          DEFAULT_DISPATCH: z.number(),
          DEFAULT_SCHEDULED: z.number(),
          DEFAULT_CONVERSION: z.number(),
          MAX_ALLOWED: z.number(),
          MIN_ALLOWED: z.number(),
        })
        .optional(),
      queue: z
        .object({
          MAX_RETRIES: z.number(),
          MAX_BATCH_SIZE: z.number(),
          MAX_BATCH_TIMEOUT: z.number(),
          RETRY_DELAY_SECONDS: z.number(),
        })
        .optional(),
    })
    .optional(),
})

export type DispatchRequest = z.infer<typeof DispatchRequestSchema>

/**
 * クローラートリガーリクエストのスキーマ
 * 注: Crawlerの設定はAPI側から渡される
 */
export const CrawlerTriggerRequestSchema = z.object({
  type: z.enum(['dog', 'cat', 'both']).optional().default('both'),
  limit: z.number().optional(),
  config: z
    .object({
      // Crawlerの動作設定（API側で決定済み）
      petsPerPage: z.number().optional(),
      maxPages: z.number().optional(),
      maxBatchSize: z.number().optional(),
      requestsPerSecond: z.number().optional(),
      // sourceもconfigの一部として含める（API側で決定）
      source: z.string().optional(),
    })
    .optional(),
})

export type CrawlerTriggerRequest = z.infer<typeof CrawlerTriggerRequestSchema>

/**
 * 画像変換リクエストのスキーマ
 */
export const ConversionRequestSchema = z.object({
  pets: z
    .array(
      z.object({
        id: z.string().min(1, 'Pet ID is required'),
        type: z.enum(['dog', 'cat']),
        screenshotKey: z.string().optional(),
        hasJpeg: z.number().min(0).max(1).optional(), // 後方互換性のため optional に
      })
    )
    .optional()
    .default([]),
  limit: z.number().optional(),
  config: z
    .object({
      limits: z
        .object({
          DEFAULT_DISPATCH: z.number(),
          DEFAULT_SCHEDULED: z.number(),
          DEFAULT_CONVERSION: z.number(),
          MAX_ALLOWED: z.number(),
          MIN_ALLOWED: z.number(),
        })
        .optional(),
      queue: z
        .object({
          MAX_RETRIES: z.number(),
          MAX_BATCH_SIZE: z.number(),
          MAX_BATCH_TIMEOUT: z.number(),
          RETRY_DELAY_SECONDS: z.number(),
        })
        .optional(),
    })
    .optional(),
})

export type ConversionRequest = z.infer<typeof ConversionRequestSchema>

/**
 * ペットディスパッチデータのスキーマ
 */
export const PetDispatchDataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['dog', 'cat']),
  sourceUrl: z.string().url().or(z.string().length(0)),
})

export type ValidatedPetDispatchData = z.infer<typeof PetDispatchDataSchema>

/**
 * ディスパッチメッセージのスキーマ
 */
export const DispatchMessageSchema = z.object({
  type: z.enum(['screenshot', 'conversion', 'crawler']),
  pets: z.array(PetDispatchDataSchema).optional(),
  batchId: z.string().min(1),
  retryCount: z.number().min(0).default(0),
  timestamp: z.string().datetime(),
})

export type ValidatedDispatchMessage = z.infer<typeof DispatchMessageSchema>

/**
 * APIレスポンスのスキーマ
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  data: z
    .union([
      z.record(z.string(), z.unknown()),
      z.array(z.unknown()),
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
    ])
    .optional(),
  message: z.string().optional(),
})

export type ApiResponse = z.infer<typeof ApiResponseSchema>

/**
 * バリデーションエラーをフォーマット
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')
}
