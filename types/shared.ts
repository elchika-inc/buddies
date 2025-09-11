/**
 * 共通型定義
 * プロジェクト全体で使用する基本的な型を定義
 */

/**
 * ペットの基本型
 */
export interface PetBase {
  readonly id: string
  readonly type: 'dog' | 'cat'
  readonly name: string
  readonly breed?: string | null
  readonly age?: string | null
  readonly gender?: 'male' | 'female' | 'unknown' | null
  readonly location?: string | null
  readonly description?: string | null
}

/**
 * ペットの詳細情報
 */
export interface PetDetails extends PetBase {
  readonly personality?: string[] | string | null
  readonly careRequirements?: string[] | string | null
  readonly adoptionFee?: number | null
  readonly isNeutered?: boolean | null
  readonly isVaccinated?: boolean | null
  readonly healthStatus?: string | null
  readonly size?: string | null
  readonly weight?: number | null
  readonly color?: string | null
}

/**
 * ペットの画像情報
 */
export interface PetImageInfo {
  readonly imageUrl?: string | null
  readonly hasJpeg?: boolean
  readonly hasWebp?: boolean
  readonly screenshotCompletedAt?: string | null
  readonly imageCheckedAt?: string | null
}

/**
 * ペットのメタデータ
 */
export interface PetMetadata {
  readonly sourceId?: string | null
  readonly sourceUrl?: string | null
  readonly createdAt?: string | null
  readonly updatedAt?: string | null
  readonly crawledAt?: string | null
}

/**
 * 完全なペット情報
 */
export interface Pet extends PetDetails, PetImageInfo, PetMetadata {}

/**
 * データベース用のペットレコード（キャメルケース）
 */
export interface PetRecord {
  id: string
  type: 'dog' | 'cat'
  name: string
  breed: string | null
  age: string | null
  gender: 'male' | 'female' | 'unknown' | null
  location: string | null
  description: string | null
  imageUrl: string | null
  personality: string | null
  careRequirements: string | null
  adoptionFee: number | null
  isNeutered: number | null // 0 or 1
  isVaccinated: number | null // 0 or 1
  healthStatus: string | null
  size: string | null
  weight: number | null
  color: string | null
  hasJpeg: number | null // 0 or 1
  hasWebp: number | null // 0 or 1
  screenshotCompletedAt: string | null
  imageCheckedAt: string | null
  sourceId: string | null
  sourceUrl: string | null
  createdAt: string | null
  updatedAt: string | null
  crawledAt: string | null
}

/**
 * API レスポンス用の共通型
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

/**
 * ページネーション情報
 */
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

/**
 * ページネーション付きレスポンス
 */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationInfo
}

/**
 * 検索フィルター
 */
export interface PetSearchFilters {
  type?: 'dog' | 'cat'
  gender?: 'male' | 'female' | 'unknown'
  ageRange?: {
    min?: number
    max?: number
  }
  location?: string
  breed?: string
  isNeutered?: boolean
  isVaccinated?: boolean
  size?: string
  hasImage?: boolean
}

/**
 * ソート条件
 */
export interface SortOptions {
  field: 'createdAt' | 'updatedAt' | 'name' | 'age' | 'adoptionFee'
  order: 'asc' | 'desc'
}

/**
 * 型ガード関数
 */
export const TypeGuards = {
  isPetType(value: unknown): value is 'dog' | 'cat' {
    return value === 'dog' || value === 'cat'
  },

  isGender(value: unknown): value is 'male' | 'female' | 'unknown' {
    return value === 'male' || value === 'female' || value === 'unknown'
  },

  isPet(obj: unknown): obj is Pet {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      'type' in obj &&
      'name' in obj &&
      typeof (obj as Pet).id === 'string' &&
      this.isPetType((obj as Pet).type) &&
      typeof (obj as Pet).name === 'string'
    )
  },

  isPetRecord(obj: unknown): obj is PetRecord {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      'type' in obj &&
      'name' in obj &&
      typeof (obj as PetRecord).id === 'string' &&
      this.isPetType((obj as PetRecord).type) &&
      typeof (obj as PetRecord).name === 'string'
    )
  },
}

/**
 * 型変換ヘルパー
 */
export const TypeConverters = {
  /**
   * PetRecordをPetに変換
   */
  recordToPet(record: PetRecord): Pet {
    const pet: Pet = {
      id: record.id,
      type: record.type,
      name: record.name,
      breed: record.breed,
      age: record.age,
      gender: record.gender,
      location: record.location,
      description: record.description,
      imageUrl: record.imageUrl,
      personality: this.parseJsonField(record.personality),
      careRequirements: this.parseJsonField(record.careRequirements),
      adoptionFee: record.adoptionFee,
      isNeutered: record.isNeutered === 1,
      isVaccinated: record.isVaccinated === 1,
      healthStatus: record.healthStatus,
      size: record.size,
      weight: record.weight,
      color: record.color,
      hasJpeg: record.hasJpeg === 1,
      hasWebp: record.hasWebp === 1,
      screenshotCompletedAt: record.screenshotCompletedAt,
      imageCheckedAt: record.imageCheckedAt,
      sourceId: record.sourceId,
      sourceUrl: record.sourceUrl,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      crawledAt: record.crawledAt,
    }

    // null値を除去
    return Object.fromEntries(Object.entries(pet).filter(([_, v]) => v != null)) as Pet
  },

  /**
   * JSON文字列または配列をパース
   */
  parseJsonField(value: string | null): string[] | string | null {
    if (!value) return null

    try {
      if (value.startsWith('[')) {
        return JSON.parse(value)
      }
      return value
    } catch {
      return value
    }
  },

  /**
   * 配列を確実に配列として返す
   */
  ensureArray(value: unknown): string[] {
    if (Array.isArray(value)) return value
    if (typeof value === 'string' && value) return [value]
    return []
  },
}
