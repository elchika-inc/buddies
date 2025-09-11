/**
 * 統一されたPet型定義
 * このファイルが唯一の信頼できるPet型のソースです
 * DBスキーマと完全に一致する型定義（camelCase版）
 */

import { z } from 'zod'

// ペットのタイプ
export const PetTypeSchema = z.enum(['dog', 'cat'])
export type PetType = z.infer<typeof PetTypeSchema>

// ペットの性別
export const PetGenderSchema = z.enum(['male', 'female', 'unknown'])
export type PetGender = z.infer<typeof PetGenderSchema>

// ペットのサイズ
export const PetSizeSchema = z.enum(['small', 'medium', 'large', 'extra_large'])
export type PetSize = z.infer<typeof PetSizeSchema>

// 運動レベル
export const ExerciseLevelSchema = z.enum(['low', 'medium', 'high', 'very_high'])
export type ExerciseLevel = z.infer<typeof ExerciseLevelSchema>

// トレーニングレベル
export const TrainingLevelSchema = z.enum(['none', 'basic', 'intermediate', 'advanced'])
export type TrainingLevel = z.infer<typeof TrainingLevelSchema>

// 社交性レベル
export const SocialLevelSchema = z.enum(['low', 'medium', 'high'])
export type SocialLevel = z.infer<typeof SocialLevelSchema>

// 室内外の好み
export const IndoorOutdoorSchema = z.enum(['indoor', 'outdoor', 'both'])
export type IndoorOutdoor = z.infer<typeof IndoorOutdoorSchema>

// 基本的なPetスキーマ（DBスキーマに完全準拠 - camelCase版）
export const PetSchema = z.object({
  // Core fields
  id: z.string(),
  type: PetTypeSchema,
  name: z.string(),
  breed: z.string().nullable().optional(),
  age: z.string().nullable().optional(), // DBはtext型
  gender: PetGenderSchema.nullable().optional(),

  // Location fields
  prefecture: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  location: z.string().nullable().optional(),

  // Description fields
  description: z.string().nullable().optional(),
  personality: z.string().nullable().optional(),
  medicalInfo: z.string().nullable().optional(),
  careRequirements: z.string().nullable().optional(),
  goodWith: z.string().nullable().optional(),
  healthNotes: z.string().nullable().optional(),

  // Physical characteristics
  color: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  size: PetSizeSchema.nullable().optional(),
  coatLength: z.string().nullable().optional(),

  // Medical status
  isNeutered: z.number().default(0),
  isVaccinated: z.number().default(0),
  vaccinationStatus: z.string().nullable().optional(),
  isFivFelvTested: z.number().default(0),

  // Behavior and requirements
  exerciseLevel: z.string().nullable().optional(),
  trainingLevel: z.string().nullable().optional(),
  socialLevel: z.string().nullable().optional(),
  indoorOutdoor: z.string().nullable().optional(),
  groomingRequirements: z.string().nullable().optional(),

  // Compatibility flags
  goodWithKids: z.number().default(0),
  goodWithDogs: z.number().default(0),
  goodWithCats: z.number().default(0),
  apartmentFriendly: z.number().default(0),
  needsYard: z.number().default(0),

  // Image status
  imageUrl: z.string().nullable().optional(),
  hasJpeg: z.number().default(0),
  hasWebp: z.number().default(0),
  imageCheckedAt: z.string().nullable().optional(),
  screenshotRequestedAt: z.string().nullable().optional(),
  screenshotCompletedAt: z.string().nullable().optional(),

  // Shelter information
  shelterName: z.string().nullable().optional(),
  shelterContact: z.string().nullable().optional(),

  // Source information
  sourceUrl: z.string().nullable().optional(),
  sourceId: z.string().default('pet-home'),
  adoptionFee: z.number().default(0),

  // Timestamps
  createdAt: z.string(),
  updatedAt: z.string(),
})

// TypeScript型の導出
export type Pet = z.infer<typeof PetSchema>

// 犬専用のスキーマ（Frontendで使用）
export const DogSchema = PetSchema.extend({
  type: z.literal('dog'),
  size: PetSizeSchema.default('medium'),
  exerciseLevel: ExerciseLevelSchema.default('medium'),
  trainingLevel: TrainingLevelSchema.default('basic'),
  walkFrequency: z.string().nullable().optional(),
})

export type Dog = z.infer<typeof DogSchema>

// 猫専用のスキーマ（Frontendで使用）
export const CatSchema = PetSchema.extend({
  type: z.literal('cat'),
  coatLength: z.string().default('short'),
  socialLevel: SocialLevelSchema.default('medium'),
  indoorOutdoor: IndoorOutdoorSchema.default('indoor'),
  groomingRequirements: z.string().default('low'),
  vocalizationLevel: z.string().nullable().optional(),
  activityTime: z.string().nullable().optional(),
  playfulness: z.string().nullable().optional(),
})

export type Cat = z.infer<typeof CatSchema>

// Frontend用のペット型（Dog | Cat）
export type FrontendPet = Dog | Cat

// 画像情報の型定義
export const ImageSchema = z.object({
  id: z.string(),
  petId: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().nullable().optional(),
  altText: z.string().nullable().optional(),
  isPrimary: z.boolean().default(false),
  displayOrder: z.number().default(0),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  size: z.number().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  status: z.enum(['pending', 'processed', 'failed', 'deleted']).default('pending'),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Image = z.infer<typeof ImageSchema>

// ペットと画像を含む完全な型
export const PetWithImagesSchema = PetSchema.extend({
  imagesData: z.array(ImageSchema).default([]),
  localImagePath: z.string().nullable().optional(), // ローカル開発用
})

export type PetWithImages = z.infer<typeof PetWithImagesSchema>

// APIレスポンス用の型
export const PetResponseSchema = z.object({
  success: z.boolean(),
  data: PetSchema.nullable().optional(),
  error: z.string().nullable().optional(),
})

export type PetResponse = z.infer<typeof PetResponseSchema>

export const PetsListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(PetSchema).default([]),
  total: z.number().default(0),
  page: z.number().default(1),
  limit: z.number().default(20),
  error: z.string().nullable().optional(),
})

export type PetsListResponse = z.infer<typeof PetsListResponseSchema>

// フィルター用の型
export const PetFilterSchema = z.object({
  type: PetTypeSchema.optional(),
  gender: PetGenderSchema.optional(),
  size: PetSizeSchema.optional(),
  prefecture: z.string().optional(),
  city: z.string().optional(),
  goodWithKids: z.boolean().optional(),
  goodWithDogs: z.boolean().optional(),
  goodWithCats: z.boolean().optional(),
  apartmentFriendly: z.boolean().optional(),
  needsYard: z.boolean().optional(),
  search: z.string().optional(),
})

export type PetFilter = z.infer<typeof PetFilterSchema>

// ソート用の型
export const PetSortSchema = z.enum([
  'createdAt_desc',
  'createdAt_asc',
  'updatedAt_desc',
  'updatedAt_asc',
  'name_asc',
  'name_desc',
])

export type PetSort = z.infer<typeof PetSortSchema>

// 型ガード関数
export const isPet = (value: unknown): value is Pet => {
  return PetSchema.safeParse(value).success
}

export const isDog = (pet: Pet | FrontendPet): pet is Dog => {
  return pet.type === 'dog'
}

export const isCat = (pet: Pet | FrontendPet): pet is Cat => {
  return pet.type === 'cat'
}

export const isPetWithImages = (value: unknown): value is PetWithImages => {
  return PetWithImagesSchema.safeParse(value).success
}

export const isImage = (value: unknown): value is Image => {
  return ImageSchema.safeParse(value).success
}

// ヘルパー関数
export const validatePet = (data: unknown): Pet => {
  return PetSchema.parse(data)
}

export const validateDog = (data: unknown): Dog => {
  return DogSchema.parse(data)
}

export const validateCat = (data: unknown): Cat => {
  return CatSchema.parse(data)
}

// 変換ヘルパー（DBの数値フラグをbooleanに変換）
export const toBooleanFlag = (value: number | undefined | null): boolean => {
  return value === 1
}

export const toNumberFlag = (value: boolean | undefined | null): number => {
  return value ? 1 : 0
}

// デフォルト値の生成関数
export const createDefaultPet = (type: PetType = 'dog', overrides?: Partial<Pet>): Pet => {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
    type,
    name: 'Unknown',
    breed: null,
    age: null,
    gender: 'unknown',
    prefecture: null,
    city: null,
    location: null,
    description: null,
    personality: null,
    medicalInfo: null,
    careRequirements: null,
    goodWith: null,
    healthNotes: null,
    color: null,
    weight: null,
    size: null,
    coatLength: null,
    isNeutered: 0,
    isVaccinated: 0,
    vaccinationStatus: null,
    isFivFelvTested: 0,
    exerciseLevel: null,
    trainingLevel: null,
    socialLevel: null,
    indoorOutdoor: null,
    groomingRequirements: null,
    goodWithKids: 0,
    goodWithDogs: 0,
    goodWithCats: 0,
    apartmentFriendly: 0,
    needsYard: 0,
    imageUrl: null,
    hasJpeg: 0,
    hasWebp: 0,
    imageCheckedAt: null,
    screenshotRequestedAt: null,
    screenshotCompletedAt: null,
    shelterName: null,
    shelterContact: null,
    sourceUrl: null,
    sourceId: 'pet-home',
    adoptionFee: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}
