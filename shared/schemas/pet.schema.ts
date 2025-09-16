/**
 * ペットデータのZodスキーマ定義
 *
 * 入力検証とデータ型の統一管理
 */

import { z } from 'zod'

/**
 * ペットタイプ
 */
export const PetTypeSchema = z.enum(['dog', 'cat'])

/**
 * 性別
 */
export const GenderSchema = z.enum(['male', 'female', 'unknown'])

/**
 * ペットスキーマ（完全版）
 */
export const PetSchema = z.object({
  id: z.string().min(1),
  type: PetTypeSchema,
  name: z.string().min(1),
  breed: z.string().nullable(),
  age: z.string().nullable(),
  gender: GenderSchema,
  size: z.string().nullable(),
  weight: z.number().nullable(),
  color: z.string().nullable(),
  description: z.string().nullable(),
  personality: z.string().nullable(),
  location: z.string().nullable(),
  prefecture: z.string().nullable(),
  city: z.string().nullable(),
  medicalInfo: z.string().nullable(),
  careRequirements: z.string().nullable(),
  vaccinationStatus: z.string().nullable(),
  isNeutered: z.number().min(0).max(1),
  isVaccinated: z.number().min(0).max(1),
  isFivFelvTested: z.number().min(0).max(1),
  goodWithKids: z.number().min(0).max(1),
  goodWithDogs: z.number().min(0).max(1),
  goodWithCats: z.number().min(0).max(1),
  apartmentFriendly: z.number().min(0).max(1),
  needsYard: z.number().min(0).max(1),
  imageUrl: z.string().url().nullable(),
  hasJpeg: z.number().min(0).max(1),
  hasWebp: z.number().min(0).max(1),
  shelterName: z.string().nullable(),
  shelterContact: z.string().nullable(),
  sourceUrl: z.string().url().nullable(),
  sourceId: z.string(),
  adoptionFee: z.number().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

/**
 * ペット作成スキーマ（新規作成用）
 */
export const CreatePetSchema = PetSchema.omit({
  createdAt: true,
  updatedAt: true,
})

/**
 * ペット更新スキーマ（部分更新用）
 */
export const UpdatePetSchema = PetSchema.partial().omit({
  id: true,
  createdAt: true,
})

/**
 * ペット検索条件スキーマ
 */
export const PetSearchSchema = z.object({
  type: PetTypeSchema.optional(),
  prefecture: z.string().optional(),
  city: z.string().optional(),
  gender: GenderSchema.optional(),
  minAge: z.number().min(0).optional(),
  maxAge: z.number().min(0).optional(),
  goodWithKids: z.boolean().optional(),
  goodWithDogs: z.boolean().optional(),
  goodWithCats: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

/**
 * 型エクスポート
 */
export type Pet = z.infer<typeof PetSchema>
export type CreatePetInput = z.infer<typeof CreatePetSchema>
export type UpdatePetInput = z.infer<typeof UpdatePetSchema>
export type PetSearchInput = z.infer<typeof PetSearchSchema>
export type PetType = z.infer<typeof PetTypeSchema>
export type Gender = z.infer<typeof GenderSchema>
