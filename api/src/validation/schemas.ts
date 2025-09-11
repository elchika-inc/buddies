import { z } from 'zod'

/**
 * Zodスキーマ定義
 * APIリクエスト/レスポンスの検証用
 */

// ============================================
// 基本型定義
// ============================================

export const PetTypeSchema = z.enum(['dog', 'cat'])
export type PetType = z.infer<typeof PetTypeSchema>

export const PetIdSchema = z.string().min(1).max(100)

// ============================================
// ペット関連スキーマ
// ============================================

export const PetSchema = z.object({
  id: PetIdSchema,
  type: PetTypeSchema,
  name: z.string().min(1).max(100),
  age: z.string().optional(),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  breed: z.string().optional(),
  prefecture: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  organization: z.string().optional(),
  hasJpeg: z.boolean(),
  hasWebp: z.boolean(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export type Pet = z.infer<typeof PetSchema>

// ============================================
// リクエストスキーマ
// ============================================

export const GetPetsQuerySchema = z.object({
  type: PetTypeSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  prefecture: z.string().optional(),
})

export type GetPetsQuery = z.infer<typeof GetPetsQuerySchema>

export const UpdatePetFlagsSchema = z.object({
  petType: PetTypeSchema,
  petIds: z.array(PetIdSchema).min(1).max(1000),
  flags: z
    .object({
      has_webp: z.boolean().optional(),
      has_jpeg: z.boolean().optional(),
    })
    .refine((flags) => flags.has_webp !== undefined || flags.has_jpeg !== undefined, {
      message: 'At least one flag must be provided',
    }),
})

export type UpdatePetFlagsRequest = z.infer<typeof UpdatePetFlagsSchema>

export const UpdateImagesSchema = z.object({
  results: z
    .array(
      z.object({
        success: z.boolean(),
        pet_id: z.string().optional(),
        jpegUrl: z.string().url().optional(),
        webpUrl: z.string().url().optional(),
        error: z.string().optional(),
      })
    )
    .min(1)
    .max(1000),
})

export type UpdateImagesRequest = z.infer<typeof UpdateImagesSchema>

// ============================================
// レスポンススキーマ
// ============================================

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        message: z.string(),
        code: z.string(),
        details: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
    timestamp: z.string().datetime(),
  })

export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  hasMore: z.boolean(),
})

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>

// ============================================
// バリデーションヘルパー
// ============================================

/**
 * スキーマバリデーション関数
 */
export function validateSchema<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errors: Record<string, string[]> = {}

    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.')
      if (!errors[path]) {
        errors[path] = []
      }
      errors[path].push(issue.message)
    })

    throw new ValidationError('Validation failed', errors)
  }

  return result.data
}

/**
 * バリデーションエラークラス
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * 部分的なスキーマバリデーション
 */
export function partialValidate<T extends Record<string, unknown>>(
  schema: z.ZodObject<z.ZodRawShape>,
  data: unknown
): Partial<T> | null {
  const partialSchema = schema.partial()
  const result = partialSchema.safeParse(data)

  if (!result.success) {
    console.warn('Partial validation failed:', result.error)
    return null
  }

  return result.data as Partial<T>
}
