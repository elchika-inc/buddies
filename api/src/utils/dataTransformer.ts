/**
 * データ変換ユーティリティ
 *
 * @description データベースとAPI間のデータ変換を提供（現在はキャメルケースのみ使用）
 */

// isRecord は削除してもコンパイルエラーにならないはずだが、念のため残す

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
export function transformPetRecord(dbRecord: unknown): ApiPetRecord {
  const pet = dbRecord as ApiPetRecord

  // JSON文字列フィールドのパース
  if (pet.personalityTraits && typeof pet.personalityTraits === 'string') {
    try {
      pet.personalityTraits = JSON.parse(pet.personalityTraits)
    } catch {
      pet.personalityTraits = []
    }
  }

  if (pet.careRequirements && typeof pet.careRequirements === 'string') {
    try {
      pet.careRequirements = JSON.parse(pet.careRequirements)
    } catch {
      pet.careRequirements = []
    }
  }

  // boolean型の変換（DB: 0/1 → API: boolean）
  if (typeof pet.spayedNeutered === 'number') {
    pet.spayedNeutered = pet.spayedNeutered === 1
  }
  if (typeof pet.goodWithKids === 'number') {
    pet.goodWithKids = pet.goodWithKids === 1
  }
  if (typeof pet.goodWithDogs === 'number') {
    pet.goodWithDogs = pet.goodWithDogs === 1
  }
  if (typeof pet.goodWithCats === 'number') {
    pet.goodWithCats = pet.goodWithCats === 1
  }
  if (typeof pet.isFivFelvTested === 'number') {
    pet.isFivFelvTested = pet.isFivFelvTested === 1
  }
  if (typeof pet.needsYard === 'number') {
    pet.needsYard = pet.needsYard === 1
  }
  if (typeof pet.apartmentFriendly === 'number') {
    pet.apartmentFriendly = pet.apartmentFriendly === 1
  }
  if (typeof pet.hasJpeg === 'number') {
    pet.hasJpeg = pet.hasJpeg === 1
  }
  if (typeof pet.hasWebp === 'number') {
    pet.hasWebp = pet.hasWebp === 1
  }

  // R2の画像URLを設定（画像がある場合）
  if (pet.hasJpeg || pet.hasWebp) {
    // R2の画像を配信するAPIエンドポイント（カスタムドメイン使用）
    pet.imageUrl = `https://pawmatch-api.elchika.app/api/images/${pet.type}/${pet.id}.jpg`
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

/**
 * データベースレコードからAPIレスポンスへの変換
 * @deprecated キャメルケース統一により不要
 */
export function dbToApi<T = unknown>(record: unknown): T {
  return record as T
}

/**
 * APIリクエストからデータベースレコードへの変換
 * @deprecated キャメルケース統一により不要
 */
export function apiToDb<T = unknown>(data: unknown): T {
  return data as T
}
