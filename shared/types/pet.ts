/**
 * 統一ペット型定義
 * このファイルがすべてのサービスで使用される基本型定義
 */

/**
 * ペットタイプ
 */
export type PetType = 'dog' | 'cat'

/**
 * 性別
 */
export type Gender = 'male' | 'female' | 'unknown'

/**
 * 基本ペット情報（必須フィールドのみ）
 */
export interface Pet {
  // 基本情報（必須）
  id: string
  type: PetType
  name: string

  // 基本情報（オプション）
  breed?: string
  age?: string
  gender?: Gender

  // 位置情報
  location?: string
  prefecture?: string
  city?: string

  // 説明
  description?: string
  personality?: string[]

  // 画像
  imageUrl?: string
  images?: string[]

  // メタデータ
  createdAt?: string
  updatedAt?: string
}

/**
 * データベース用ペット型（SQLite固有フィールド）
 */
export interface PetRecord extends Pet {
  // SQLite固有フィールド（0/1として保存）
  has_jpeg?: number
  has_webp?: number
  is_available?: number
  is_adult?: number
  is_castrated?: number
  is_vaccinated?: number

  // JSON文字列として保存されるフィールド
  personality_json?: string
  images_json?: string
}

/**
 * 犬固有のプロパティ
 */
export interface DogSpecific {
  size?: 'small' | 'medium' | 'large'
  exerciseLevel?: 'low' | 'moderate' | 'high'
  goodWithKids?: boolean
  barkingLevel?: 'quiet' | 'moderate' | 'vocal'
  sheddingLevel?: 'minimal' | 'moderate' | 'heavy'
}

/**
 * 猫固有のプロパティ
 */
export interface CatSpecific {
  indoorOutdoor?: 'indoor' | 'outdoor' | 'both'
  playfulness?: 'low' | 'moderate' | 'high'
  independenceLevel?: 'dependent' | 'balanced' | 'independent'
  goodWithOtherCats?: boolean
  activityLevel?: 'lazy' | 'moderate' | 'active'
}

/**
 * 犬型
 */
export interface Dog extends Pet, DogSpecific {
  type: 'dog'
}

/**
 * 猫型
 */
export interface Cat extends Pet, CatSpecific {
  type: 'cat'
}

/**
 * 統合ペット型
 */
export type UnifiedPet = Dog | Cat

/**
 * 型ガード関数
 */
export const isPetType = (value: unknown): value is PetType => {
  return value === 'dog' || value === 'cat'
}

export const isGender = (value: unknown): value is Gender => {
  return value === 'male' || value === 'female' || value === 'unknown'
}

export const isPet = (obj: unknown): obj is Pet => {
  if (!obj || typeof obj !== 'object') return false
  const pet = obj as Record<string, unknown>
  return typeof pet['id'] === 'string' && isPetType(pet['type']) && typeof pet['name'] === 'string'
}

export const isDog = (pet: Pet): pet is Dog => {
  return pet.type === 'dog'
}

export const isCat = (pet: Pet): pet is Cat => {
  return pet.type === 'cat'
}

/**
 * 変換ヘルパー関数
 */
export const toPet = (record: PetRecord): Pet => {
  const pet: Pet = {
    id: record.id,
    type: record.type,
    name: record.name,
    breed: record.breed || undefined,
    age: record.age || undefined,
    gender: record.gender || undefined,
    location: record.location || undefined,
    prefecture: record.prefecture || undefined,
    city: record.city || undefined,
    description: record.description || undefined,
    imageUrl: record.imageUrl || undefined,
    createdAt: record.createdAt || undefined,
    updatedAt: record.updatedAt || undefined,
  }

  // JSON文字列をパース
  if (record.personality_json) {
    try {
      pet.personality = JSON.parse(record.personality_json)
    } catch {
      // パース失敗時は無視
    }
  }

  if (record.images_json) {
    try {
      pet.images = JSON.parse(record.images_json)
    } catch {
      // パース失敗時は無視
    }
  }

  return pet
}

export const toPetRecord = (pet: Pet): PetRecord => {
  const record: PetRecord = {
    ...pet,
    is_available: 1,
  }

  // 配列をJSON文字列に変換
  if (pet.personality) {
    record.personality_json = JSON.stringify(pet.personality)
  }

  if (pet.images) {
    record.images_json = JSON.stringify(pet.images)
  }

  return record
}
