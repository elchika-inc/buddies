/**
 * データ変換ユーティリティ
 *
 * @description データベース（snake_case）とAPI（camelCase）間の変換を提供
 */

import { isRecord } from './typeGuards'

/**
 * snake_caseをcamelCaseに変換
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * camelCaseをsnake_caseに変換
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * オブジェクトのキーをsnake_caseからcamelCaseに変換
 */
export function transformToCamelCase<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformToCamelCase(item)) as T
  }

  if (!isRecord(obj)) {
    return obj as T
  }

  const transformed: Record<string, unknown> = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key)
      transformed[camelKey] = transformToCamelCase(obj[key])
    }
  }

  return transformed as T
}

/**
 * オブジェクトのキーをcamelCaseからsnake_caseに変換
 */
export function transformToSnakeCase<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformToSnakeCase(item)) as T
  }

  if (!isRecord(obj)) {
    return obj as T
  }

  const transformed: Record<string, unknown> = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key)
      transformed[snakeKey] = transformToSnakeCase(obj[key])
    }
  }

  return transformed as T
}

/**
 * データベースレコードからAPIレスポンスへの変換
 *
 * @description snake_caseのDBレコードをcamelCaseのAPIレスポンスに変換
 */
export function dbToApi<T = unknown>(record: unknown): T {
  if (!record) return record as T

  const transformed = transformToCamelCase<T>(record)

  // boolean型への変換（DB: 0/1 → API: boolean）
  if (isRecord(transformed)) {
    type MutableTransformed = { -readonly [K in keyof T]: T[K] }
    const mutableTransformed = { ...transformed } as MutableTransformed
    // has_jpeg/has_webp のような boolean フィールドを変換
    if (
      'hasJpeg' in mutableTransformed &&
      typeof mutableTransformed['hasJpeg' as keyof MutableTransformed] === 'number'
    ) {
      ;(mutableTransformed as Record<string, unknown>)['hasJpeg'] =
        mutableTransformed['hasJpeg' as keyof MutableTransformed] === 1
    }
    if (
      'hasWebp' in mutableTransformed &&
      typeof mutableTransformed['hasWebp' as keyof MutableTransformed] === 'number'
    ) {
      ;(mutableTransformed as Record<string, unknown>)['hasWebp'] =
        mutableTransformed['hasWebp' as keyof MutableTransformed] === 1
    }
    if (
      'isReady' in mutableTransformed &&
      typeof mutableTransformed['isReady' as keyof MutableTransformed] === 'number'
    ) {
      ;(mutableTransformed as Record<string, unknown>)['isReady'] =
        mutableTransformed['isReady' as keyof MutableTransformed] === 1
    }
    return mutableTransformed as T
  }

  return transformed
}

/**
 * APIリクエストからデータベースレコードへの変換
 *
 * @description camelCaseのAPIリクエストをsnake_caseのDBレコードに変換
 */
export function apiToDb<T = unknown>(data: unknown): T {
  if (!data) return data as T

  const transformed = transformToSnakeCase<T>(data)

  // boolean型への変換（API: boolean → DB: 0/1）
  if (isRecord(transformed)) {
    const mutableTransformed = transformed as Record<string, unknown>
    // has_jpeg/has_webp のような boolean フィールドを変換
    if ('has_jpeg' in transformed && typeof transformed['has_jpeg'] === 'boolean') {
      mutableTransformed['has_jpeg'] = transformed['has_jpeg'] ? 1 : 0
    }
    if ('has_webp' in transformed && typeof transformed['has_webp'] === 'boolean') {
      mutableTransformed['has_webp'] = transformed['has_webp'] ? 1 : 0
    }
    if ('is_ready' in transformed && typeof transformed['is_ready'] === 'boolean') {
      mutableTransformed['is_ready'] = transformed['is_ready'] ? 1 : 0
    }
  }

  return transformed
}

/**
 * ペットレコードの変換（DB → API）
 * 統一型定義に合わせてsnake_caseを使用
 */
export interface ApiPetRecord {
  id: string
  type: 'dog' | 'cat'
  name: string
  breed?: string
  age?: number
  age_group?: string
  gender?: 'male' | 'female' | 'unknown'
  size?: string
  weight?: number
  color?: string
  description?: string
  location?: string
  prefecture: string
  city?: string
  status?: string
  medical_info?: string
  vaccination_status?: string
  spayed_neutered?: boolean
  special_needs?: string
  personality_traits?: string[]
  good_with_kids?: boolean
  good_with_dogs?: boolean
  good_with_cats?: boolean
  exercise_needs?: string
  training_level?: string
  grooming_needs?: string
  temperament?: string
  indoor_outdoor?: string
  is_fiv_felv_tested?: boolean
  coat_type?: string
  activity_level?: string
  vocalization_level?: string
  care_requirements?: string[]
  adoption_fee?: number
  shelter_name?: string
  shelter_contact?: string
  source_url: string
  source_id?: string
  image_url?: string
  has_jpeg: boolean
  has_webp: boolean
  needs_yard?: boolean
  apartment_friendly?: boolean
  created_at: string
  updated_at: string
}

/**
 * データベースのペットレコードをAPI用に変換
 * snake_caseをそのまま保持
 */
export function transformPetRecord(dbRecord: unknown): ApiPetRecord {
  // snake_caseのまま保持（変換しない）
  const pet = dbRecord as ApiPetRecord

  // JSON文字列フィールドのパース
  if (pet.personality_traits && typeof pet.personality_traits === 'string') {
    try {
      pet.personality_traits = JSON.parse(pet.personality_traits)
    } catch {
      pet.personality_traits = []
    }
  }

  if (pet.care_requirements && typeof pet.care_requirements === 'string') {
    try {
      pet.care_requirements = JSON.parse(pet.care_requirements)
    } catch {
      pet.care_requirements = []
    }
  }

  // boolean型の変換（DB: 0/1 → API: boolean）
  if (typeof pet.spayed_neutered === 'number') {
    pet.spayed_neutered = pet.spayed_neutered === 1
  }
  if (typeof pet.good_with_kids === 'number') {
    pet.good_with_kids = pet.good_with_kids === 1
  }
  if (typeof pet.good_with_dogs === 'number') {
    pet.good_with_dogs = pet.good_with_dogs === 1
  }
  if (typeof pet.good_with_cats === 'number') {
    pet.good_with_cats = pet.good_with_cats === 1
  }
  if (typeof pet.is_fiv_felv_tested === 'number') {
    pet.is_fiv_felv_tested = pet.is_fiv_felv_tested === 1
  }
  if (typeof pet.needs_yard === 'number') {
    pet.needs_yard = pet.needs_yard === 1
  }
  if (typeof pet.apartment_friendly === 'number') {
    pet.apartment_friendly = pet.apartment_friendly === 1
  }
  if (typeof pet.has_jpeg === 'number') {
    pet.has_jpeg = pet.has_jpeg === 1
  }
  if (typeof pet.has_webp === 'number') {
    pet.has_webp = pet.has_webp === 1
  }

  // R2の画像URLを設定（画像がある場合）
  // もしR2に画像がある場合は、APIエンドポイントを通して配信
  if (pet.has_jpeg || pet.has_webp) {
    // R2の画像を配信するAPIエンドポイント（カスタムドメイン使用）
    pet.image_url = `https://pawmatch-api.elchika.app/api/images/${pet.type}/${pet.id}.jpg`
  } else {
    // R2に画像がない場合は、フロントエンドでフォールバック画像を使用するためundefinedを返す
    pet.image_url = undefined
  }

  // locationフィールドの設定
  if (pet.prefecture && pet.city) {
    pet.location = `${pet.prefecture}${pet.city}`
  } else if (pet.prefecture) {
    pet.location = pet.prefecture
  }

  return pet
}
