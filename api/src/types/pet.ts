/**
 * API用ペット型定義
 *
 * shared/types/pet.tsから型をインポートし、
 * API固有のリクエスト/レスポンス型を定義
 */

// 共通の型定義から再エクスポート
export type {
  Pet,
  Dog,
  Cat,
  FrontendPet,
  PetType,
  PetGender,
  PetSize,
  PetWithImages,
  Image,
  PetFilter,
  PetSort,
  PetResponse,
  PetsListResponse,
} from '../../../shared/types/pet'

// ユーティリティ関数も再エクスポート
export {
  isPet,
  isDog,
  isCat,
  isPetWithImages,
  isImage,
  toBool,
  toFlag,
  createPet,
  fromDBRecord,
} from '../../../shared/types/pet'

/**
 * APIリクエスト型
 */
export interface CreatePetRequest {
  type: 'dog' | 'cat'
  name: string
  breed?: string
  age?: string
  gender?: 'male' | 'female' | 'unknown'
  prefecture?: string
  city?: string
  location?: string
  description?: string
  imageUrl?: string
  personality?: string
  careRequirements?: string
  adoptionFee?: number
  isNeutered?: boolean
  isVaccinated?: boolean
  size?: string
  weight?: number
  color?: string
  sourceId?: string
  sourceUrl?: string
}

export type UpdatePetRequest = Partial<CreatePetRequest>

/**
 * API用検索パラメータ
 */
export interface SearchPetsParams {
  type?: 'dog' | 'cat'
  gender?: 'male' | 'female' | 'unknown'
  prefecture?: string
  city?: string
  page?: number
  limit?: number
  sort?:
    | 'createdAt_desc'
    | 'createdAt_asc'
    | 'updatedAt_desc'
    | 'updatedAt_asc'
    | 'name_asc'
    | 'name_desc'
}

/**
 * 統計情報型
 */
export interface PetStatistics {
  totalPets: number
  dogCount: number
  catCount: number
  withImages: number
  withoutImages: number
  neuteredCount: number
  vaccinatedCount: number
  lastUpdated: string
}
