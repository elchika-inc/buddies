/**
 * 統一されたPet型定義 - 単一の真実の情報源
 *
 * このファイルがプロジェクト全体で唯一のPet型定義ソースです。
 * DBスキーマと完全に一致し、全ワークスペースで共有されます。
 */

// ============================================
// 基本型定義（Enum相当）
// ============================================

export type PetType = 'dog' | 'cat'
export type PetGender = 'male' | 'female' | 'unknown'
export type PetSize = 'small' | 'medium' | 'large' | 'extra_large'
export type ExerciseLevel = 'low' | 'medium' | 'high' | 'very_high'
export type TrainingLevel = 'none' | 'basic' | 'intermediate' | 'advanced'
export type SocialLevel = 'low' | 'medium' | 'high'
export type IndoorOutdoor = 'indoor' | 'outdoor' | 'both'

// ============================================
// コアPet型定義（DBスキーマと完全一致）
// ============================================

/**
 * ペットの基本情報型
 *
 * DBスキーマと完全に一致したフィールド定義。
 * 数値フラグ（0/1）はDB仕様に準拠し、boolean変換は使用箇所で実施。
 */
export interface Pet {
  // ============ Core fields ============
  id: string
  type: PetType
  name: string
  breed?: string | null
  age?: string | null
  gender?: PetGender | null

  // ============ Location fields ============
  prefecture?: string | null
  city?: string | null
  location?: string | null

  // ============ Description fields ============
  description?: string | null
  personality?: string | null
  medicalInfo?: string | null
  careRequirements?: string | null
  goodWith?: string | null
  healthNotes?: string | null

  // ============ Physical characteristics ============
  color?: string | null
  weight?: number | null
  size?: PetSize | null
  coatLength?: string | null

  // ============ Medical status ============
  isNeutered: number // 0 or 1
  isVaccinated: number // 0 or 1
  vaccinationStatus?: string | null
  isFivFelvTested: number // 0 or 1

  // ============ Behavior and requirements ============
  exerciseLevel?: string | null
  trainingLevel?: string | null
  socialLevel?: string | null
  indoorOutdoor?: string | null
  groomingRequirements?: string | null

  // ============ Compatibility flags ============
  goodWithKids: number // 0 or 1
  goodWithDogs: number // 0 or 1
  goodWithCats: number // 0 or 1
  apartmentFriendly: number // 0 or 1
  needsYard: number // 0 or 1

  // ============ Image status ============
  imageUrl?: string | null
  hasJpeg: number // 0 or 1
  hasWebp: number // 0 or 1
  imageCheckedAt?: string | null
  screenshotRequestedAt?: string | null
  screenshotCompletedAt?: string | null

  // ============ Shelter information ============
  shelterName?: string | null
  shelterContact?: string | null

  // ============ Source information ============
  sourceUrl?: string | null
  sourceId: string
  adoptionFee: number

  // ============ Timestamps ============
  createdAt: string
  updatedAt: string
}

// ============================================
// 拡張型定義
// ============================================

/**
 * 犬専用の型（Frontend用）
 */
export interface Dog extends Pet {
  type: 'dog'
  walkFrequency?: string | null
}

/**
 * 猫専用の型（Frontend用）
 */
export interface Cat extends Pet {
  type: 'cat'
  vocalizationLevel?: string | null
  activityTime?: string | null
  playfulness?: string | null
}

/**
 * Frontend用のペット型（Dog | Cat の Discriminated Union）
 */
export type FrontendPet = Dog | Cat

/**
 * 画像情報の型定義
 */
export interface Image {
  id: string
  petId: string
  url: string
  thumbnailUrl?: string | null
  altText?: string | null
  isPrimary: boolean
  displayOrder: number
  width?: number | null
  height?: number | null
  size?: number | null
  mimeType?: string | null
  status: 'pending' | 'processed' | 'failed' | 'deleted'
  createdAt: string
  updatedAt: string
}

/**
 * ペットと画像を含む完全な型
 */
export interface PetWithImages extends Pet {
  imagesData: Image[]
  localImagePath?: string | null
}

// ============================================
// 検索・フィルター型定義
// ============================================

/**
 * ペット検索フィルター
 */
export interface PetFilter {
  type?: PetType
  gender?: PetGender
  size?: PetSize
  prefecture?: string
  city?: string
  goodWithKids?: boolean
  goodWithDogs?: boolean
  goodWithCats?: boolean
  apartmentFriendly?: boolean
  needsYard?: boolean
  search?: string
}

/**
 * ソート条件
 */
export type PetSort =
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'updatedAt_desc'
  | 'updatedAt_asc'
  | 'name_asc'
  | 'name_desc'

// ============================================
// APIレスポンス型
// ============================================

export interface PetResponse {
  success: boolean
  data?: Pet | null
  error?: string | null
}

export interface PetsListResponse {
  success: boolean
  data: Pet[]
  total: number
  page: number
  limit: number
  error?: string | null
}

// ============================================
// 型ガード関数
// ============================================

/**
 * Pet型のチェック
 */
export function isPet(value: unknown): value is Pet {
  if (!value || typeof value !== 'object') return false
  const pet = value as Record<string, unknown>
  return (
    typeof pet['id'] === 'string' &&
    (pet['type'] === 'dog' || pet['type'] === 'cat') &&
    typeof pet['name'] === 'string'
  )
}

/**
 * Dog型のチェック
 */
export function isDog(pet: Pet | FrontendPet): pet is Dog {
  return pet.type === 'dog'
}

/**
 * Cat型のチェック
 */
export function isCat(pet: Pet | FrontendPet): pet is Cat {
  return pet.type === 'cat'
}

/**
 * PetWithImages型のチェック
 */
export function isPetWithImages(value: unknown): value is PetWithImages {
  if (!isPet(value)) return false
  const pet = value as unknown as PetWithImages
  return Array.isArray(pet.imagesData)
}

/**
 * Image型のチェック
 */
export function isImage(value: unknown): value is Image {
  if (!value || typeof value !== 'object') return false
  const img = value as Record<string, unknown>
  return typeof img['id'] === 'string' && typeof img['petId'] === 'string' && typeof img['url'] === 'string'
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * DBの数値フラグ（0/1）をbooleanに変換
 */
export function toBool(value: number | undefined | null): boolean {
  return value === 1
}

/**
 * booleanをDBの数値フラグ（0/1）に変換
 */
export function toFlag(value: boolean | undefined | null): number {
  return value ? 1 : 0
}

/**
 * ペットオブジェクトの作成
 *
 * 必須フィールドのみを受け取り、他はデフォルト値で初期化
 */
export function createPet(data: {
  id: string
  type: PetType
  name: string
  [key: string]: unknown
}): Pet {
  const now = new Date().toISOString()

  return {
    // Core fields
    id: data['id'] as string,
    type: data['type'] as PetType,
    name: data['name'] as string,
    breed: (data['breed'] as string | null | undefined) ?? null,
    age: (data['age'] as string | null | undefined) ?? null,
    gender: (data['gender'] as PetGender | null | undefined) ?? 'unknown',

    // Location fields
    prefecture: (data['prefecture'] as string | null | undefined) ?? null,
    city: (data['city'] as string | null | undefined) ?? null,
    location: (data['location'] as string | null | undefined) ?? null,

    // Description fields
    description: (data['description'] as string | null | undefined) ?? null,
    personality: (data['personality'] as string | null | undefined) ?? null,
    medicalInfo: (data['medicalInfo'] as string | null | undefined) ?? null,
    careRequirements: (data['careRequirements'] as string | null | undefined) ?? null,
    goodWith: (data['goodWith'] as string | null | undefined) ?? null,
    healthNotes: (data['healthNotes'] as string | null | undefined) ?? null,

    // Physical characteristics
    color: (data['color'] as string | null | undefined) ?? null,
    weight: (data['weight'] as number | null | undefined) ?? null,
    size: (data['size'] as PetSize | null | undefined) ?? null,
    coatLength: (data['coatLength'] as string | null | undefined) ?? null,

    // Medical status (数値フラグ)
    isNeutered: toFlag(data['isNeutered'] as boolean | undefined),
    isVaccinated: toFlag(data['isVaccinated'] as boolean | undefined),
    vaccinationStatus: (data['vaccinationStatus'] as string | null | undefined) ?? null,
    isFivFelvTested: toFlag(data['isFivFelvTested'] as boolean | undefined),

    // Behavior and requirements
    exerciseLevel: (data['exerciseLevel'] as string | null | undefined) ?? null,
    trainingLevel: (data['trainingLevel'] as string | null | undefined) ?? null,
    socialLevel: (data['socialLevel'] as string | null | undefined) ?? null,
    indoorOutdoor: (data['indoorOutdoor'] as string | null | undefined) ?? null,
    groomingRequirements: (data['groomingRequirements'] as string | null | undefined) ?? null,

    // Compatibility flags (数値フラグ)
    goodWithKids: toFlag(data['goodWithKids'] as boolean | undefined),
    goodWithDogs: toFlag(data['goodWithDogs'] as boolean | undefined),
    goodWithCats: toFlag(data['goodWithCats'] as boolean | undefined),
    apartmentFriendly: toFlag(data['apartmentFriendly'] as boolean | undefined),
    needsYard: toFlag(data['needsYard'] as boolean | undefined),

    // Image status
    imageUrl: (data['imageUrl'] as string | null | undefined) ?? null,
    hasJpeg: toFlag(data['hasJpeg'] as boolean | undefined),
    hasWebp: toFlag(data['hasWebp'] as boolean | undefined),
    imageCheckedAt: (data['imageCheckedAt'] as string | null | undefined) ?? null,
    screenshotRequestedAt: (data['screenshotRequestedAt'] as string | null | undefined) ?? null,
    screenshotCompletedAt: (data['screenshotCompletedAt'] as string | null | undefined) ?? null,

    // Shelter information
    shelterName: (data['shelterName'] as string | null | undefined) ?? null,
    shelterContact: (data['shelterContact'] as string | null | undefined) ?? null,

    // Source information
    sourceUrl: (data['sourceUrl'] as string | null | undefined) ?? null,
    sourceId: (data['sourceId'] as string | undefined) ?? 'pet-home',
    adoptionFee: (data['adoptionFee'] as number | undefined) ?? 0,

    // Timestamps
    createdAt: (data['createdAt'] as string | undefined) ?? now,
    updatedAt: (data['updatedAt'] as string | undefined) ?? now,
  }
}

/**
 * DBレコードからPet型への変換
 *
 * DBから取得した生データをPet型に変換
 */
export function fromDBRecord(record: Record<string, unknown>): Pet {
  return createPet({
    id: record['id'] as string,
    type: record['type'] as PetType,
    name: record['name'] as string,
    ...record,
  })
}
