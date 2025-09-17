/**
 * Zodバリデーションスキーマ定義
 */

import { z } from 'zod'
import { BATCH_LIMITS } from '../constants'

/**
 * ディスパッチリクエストのスキーマ
 */
export const DispatchRequestSchema = z.object({
  limit: z
    .number()
    .min(BATCH_LIMITS.MIN_ALLOWED, `Limit must be at least ${BATCH_LIMITS.MIN_ALLOWED}`)
    .max(BATCH_LIMITS.MAX_ALLOWED, `Limit must not exceed ${BATCH_LIMITS.MAX_ALLOWED}`)
    .optional()
    .default(BATCH_LIMITS.DEFAULT_DISPATCH),
})

export type DispatchRequest = z.infer<typeof DispatchRequestSchema>

/**
 * クローラートリガーリクエストのスキーマ
 */
export const CrawlerTriggerRequestSchema = z.object({
  type: z.enum(['dog', 'cat', 'both']).optional().default('both'),
  limit: z
    .number()
    .min(BATCH_LIMITS.MIN_ALLOWED)
    .max(BATCH_LIMITS.MAX_ALLOWED)
    .optional()
    .default(BATCH_LIMITS.DEFAULT_CRAWLER),
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
        hasJpeg: z.number().min(0).max(1),
      })
    )
    .optional()
    .default([]),
  limit: z
    .number()
    .min(BATCH_LIMITS.MIN_ALLOWED)
    .max(BATCH_LIMITS.MAX_ALLOWED)
    .optional()
    .default(BATCH_LIMITS.DEFAULT_CONVERSION),
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
