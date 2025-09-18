/**
 * ペットファクトリー関数
 * ビルダーパターンを削除し、シンプルなファクトリー関数でペットオブジェクトを生成
 */

import type { Pet } from '@pawmatch/shared/types'

// DB レコード型
export interface DBPetRecord {
  id: string
  type: 'dog' | 'cat'
  name: string
  breed?: string | null
  age?: string | null
  gender?: string | null
  size?: string | null
  weight?: number | null
  color?: string | null
  description?: string | null
  location?: string | null
  prefecture?: string | null
  city?: string | null
  medicalInfo?: string | null
  vaccinationStatus?: string | null
  isNeutered?: number | null
  personality?: string | null
  goodWithKids?: number | null
  goodWithDogs?: number | null
  goodWithCats?: number | null
  shelterName?: string | null
  shelterContact?: string | null
  sourceUrl?: string | null
  sourceId?: string | null
  careRequirements?: string | null
  hasJpeg?: number | null
  hasWebp?: number | null
  createdAt?: string | null
  updatedAt?: string | null
  imageUrl?: string | null
  isVaccinated?: number | null
  isFivFelvTested?: number | null
  exerciseLevel?: string | null
  trainingLevel?: string | null
  socialLevel?: string | null
  indoorOutdoor?: string | null
  groomingRequirements?: string | null
  apartmentFriendly?: number | null
  needsYard?: number | null
  goodWith?: string | null
  healthNotes?: string | null
  coatLength?: string | null
  imageCheckedAt?: string | null
  screenshotRequestedAt?: string | null
  screenshotCompletedAt?: string | null
}

/**
 * ペットデータ作成関数（シンプル版）
 * null値をundefinedに変換し、デフォルト値を設定
 */
export function createPet(data: Partial<DBPetRecord>): Pet {
  const now = new Date().toISOString()

  return {
    // 必須フィールド
    id: data.id || '',
    type: data.type || 'dog',
    name: data.name || '名前未設定',

    // オプションフィールド（null -> undefined変換）
    breed: data.breed || undefined,
    age: data.age || undefined,
    gender: (data.gender as Pet['gender']) || undefined,
    size: (data.size as Pet['size']) || undefined,
    weight: data.weight ?? undefined,
    color: data.color || undefined,
    description: data.description || undefined,
    location: data.location || undefined,
    prefecture: data.prefecture || undefined,
    city: data.city || undefined,
    medicalInfo: data.medicalInfo || undefined,
    vaccinationStatus: data.vaccinationStatus || undefined,
    personality: data.personality || undefined,
    shelterName: data.shelterName || undefined,
    shelterContact: data.shelterContact || undefined,
    sourceUrl: data.sourceUrl || undefined,
    sourceId: data.sourceId || 'pet-home',
    careRequirements: data.careRequirements || undefined,
    imageUrl: data.imageUrl || undefined,
    exerciseLevel: data.exerciseLevel || undefined,
    trainingLevel: data.trainingLevel || undefined,
    socialLevel: data.socialLevel || undefined,
    indoorOutdoor: data.indoorOutdoor || undefined,
    groomingRequirements: data.groomingRequirements || undefined,
    goodWith: data.goodWith || undefined,
    healthNotes: data.healthNotes || undefined,
    coatLength: data.coatLength || undefined,

    // 数値フィールド（デフォルト値: 0）
    isNeutered: data.isNeutered ?? 0,
    isVaccinated: data.isVaccinated ?? 0,
    isFivFelvTested: data.isFivFelvTested ?? 0,
    goodWithKids: data.goodWithKids ?? 0,
    goodWithDogs: data.goodWithDogs ?? 0,
    goodWithCats: data.goodWithCats ?? 0,
    apartmentFriendly: data.apartmentFriendly ?? 0,
    needsYard: data.needsYard ?? 0,
    hasJpeg: data.hasJpeg ?? 0,
    hasWebp: data.hasWebp ?? 0,

    // 日時フィールド
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    imageCheckedAt: data.imageCheckedAt || undefined,
    screenshotRequestedAt: data.screenshotRequestedAt || undefined,
    screenshotCompletedAt: data.screenshotCompletedAt || undefined,
  } as Pet
}

/**
 * DBレコードからペットを作成
 * null値の処理とデフォルト値の設定を行う
 */
export function dbRecordToPet(record: DBPetRecord): Pet {
  return createPet(record)
}

/**
 * 複数のDBレコードから複数のペットを作成
 */
export function dbRecordsToPets(records: DBPetRecord[]): Pet[] {
  return records.map(dbRecordToPet)
}

/**
 * ペットの部分更新
 * 既存のペットデータに部分的な変更を適用
 */
export function updatePet(existing: Pet, updates: Partial<Pet>): Pet {
  return {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * デフォルト値でペットを作成
 * テスト用やモック用
 */
export function createDefaultPet(overrides?: Partial<Pet>): Pet {
  return createPet({
    id: 'default-id',
    type: 'dog',
    name: 'デフォルト名',
    ...overrides,
  })
}
