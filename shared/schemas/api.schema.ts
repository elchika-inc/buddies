/**
 * API関連のZodスキーマ定義
 *
 * APIリクエスト/レスポンスの検証
 */

import { z } from 'zod'
import { PetSchema, PetTypeSchema } from './pet.schema'

/**
 * Crawlerデータ送信スキーマ
 */
export const CrawlerSubmitSchema = z.object({
  source: z.string().min(1),
  petType: PetTypeSchema,
  pets: z.array(PetSchema),
  crawlStats: z.object({
    totalProcessed: z.number().min(0),
    successCount: z.number().min(0),
  }),
})

/**
 * 変換トリガースキーマ
 */
export const ConversionTriggerSchema = z.object({
  pets: z.array(
    z.object({
      id: z.string().min(1),
      type: PetTypeSchema,
      screenshotKey: z.string().optional(),
    })
  ),
  limit: z.number().min(1).max(100).optional().default(50),
})

/**
 * ディスパッチリクエストスキーマ
 */
export const DispatchRequestSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(30),
  petIds: z.array(z.string()).optional(),
  petType: PetTypeSchema.optional(),
})

/**
 * スクリーンショット結果スキーマ
 */
export const ScreenshotResultSchema = z.object({
  pet_id: z.string(),
  pet_type: PetTypeSchema,
  success: z.boolean(),
  screenshotKey: z.string().optional(),
  error: z.string().optional(),
})

/**
 * APIレスポンススキーマ
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  details: z.unknown().optional(),
})

/**
 * ページネーションスキーマ
 */
export const PaginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  total: z.number().min(0).optional(),
  hasNext: z.boolean().optional(),
  hasPrev: z.boolean().optional(),
})

/**
 * 型エクスポート
 */
export type CrawlerSubmitInput = z.infer<typeof CrawlerSubmitSchema>
export type ConversionTriggerInput = z.infer<typeof ConversionTriggerSchema>
export type DispatchRequestInput = z.infer<typeof DispatchRequestSchema>
export type ScreenshotResult = z.infer<typeof ScreenshotResultSchema>
export type ApiResponse = z.infer<typeof ApiResponseSchema>
export type Pagination = z.infer<typeof PaginationSchema>
