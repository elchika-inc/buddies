/**
 * データ変換ユーティリティ
 *
 * @description データベースとAPI間のデータ変換を提供（現在はキャメルケースのみ使用）
 */

import { UrlBuilder } from './UrlBuilder'
import { isRawPetRecord, parseJsonArraySafely, toBoolean } from './TypeGuards'

/**
 * ペットレコードの変換（DB → API）
 * キャメルケースで統一
 */
export interface ApiPetRecord {
  id: string
  type: 'dog' | 'cat'
  name: string
  breed?: string
  age?: number
  ageGroup?: string
  gender?: 'male' | 'female' | 'unknown'
  size?: string
  weight?: number
  color?: string
  description?: string
  location?: string
  prefecture: string
  city?: string
  status?: string
  medicalInfo?: string
  vaccinationStatus?: string
  spayedNeutered?: boolean
  specialNeeds?: string
  personalityTraits?: string[]
  goodWithKids?: boolean
  goodWithDogs?: boolean
  goodWithCats?: boolean
  exerciseNeeds?: string
  trainingLevel?: string
  groomingNeeds?: string
  temperament?: string
  indoorOutdoor?: string
  isFivFelvTested?: boolean
  coatType?: string
  activityLevel?: string
  vocalizationLevel?: string
  careRequirements?: string[]
  adoptionFee?: number
  shelterName?: string
  shelterContact?: string
  sourceUrl: string
  sourceId?: string
  imageUrl?: string
  hasJpeg: boolean
  hasWebp: boolean
  needsYard?: boolean
  apartmentFriendly?: boolean
  createdAt: string
  updatedAt: string
}

/**
 * データベースのペットレコードをAPI用に変換
 * キャメルケースで統一されているため、最小限の変換のみ実施
 */
export function transformPetRecord(dbRecord: unknown, apiBaseUrl?: string): ApiPetRecord {
  // 型ガードで検証
  if (!isRawPetRecord(dbRecord)) {
    throw new Error('Invalid pet record format')
  }

  const pet = dbRecord as unknown as ApiPetRecord

  // JSON文字列フィールドの安全なパース
  pet.personalityTraits = parseJsonArraySafely(pet.personalityTraits, [])
  pet.careRequirements = parseJsonArraySafely(pet.careRequirements, [])

  // boolean型の安全な変換（DB: 0/1 → API: boolean）
  pet.spayedNeutered = toBoolean(pet.spayedNeutered)
  pet.goodWithKids = toBoolean(pet.goodWithKids)
  pet.goodWithDogs = toBoolean(pet.goodWithDogs)
  pet.goodWithCats = toBoolean(pet.goodWithCats)
  pet.isFivFelvTested = toBoolean(pet.isFivFelvTested)
  pet.needsYard = toBoolean(pet.needsYard)
  pet.apartmentFriendly = toBoolean(pet.apartmentFriendly)
  pet.hasJpeg = toBoolean(pet.hasJpeg) ?? false
  pet.hasWebp = toBoolean(pet.hasWebp) ?? false

  // R2の画像URLを設定（画像がある場合）
  if (pet.hasJpeg || pet.hasWebp) {
    // UrlBuilderを使用して統一的にURLを生成
    const urlBuilder = new UrlBuilder(apiBaseUrl)
    pet.imageUrl = urlBuilder.imageUrl(pet.type, pet.id, 'jpg')
  } else {
    // R2に画像がない場合は、フロントエンドでフォールバック画像を使用するためundefinedを返す
    pet.imageUrl = undefined
  }

  // locationフィールドの設定
  if (pet.prefecture && pet.city) {
    pet.location = `${pet.prefecture}${pet.city}`
  } else if (pet.prefecture) {
    pet.location = pet.prefecture
  }

  return pet
}
