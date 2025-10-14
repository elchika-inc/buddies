/**
 * シンプルなAPIレスポンス変換（Result型を使用しない）
 */
import { FrontendPet, Dog, Cat } from '@/types/pet'
import {
  UnifiedApiResponse,
  LegacyPetListResponse,
  LegacySinglePetResponse,
  LegacyPrefecturesResponse,
  LegacyStatsResponse,
  LegacyResponse,
  ApiMeta,
} from '@/types/api'
import {
  // isDog,
  // isCat,
  isPetListData,
  isSinglePetData,
  isPrefecturesData,
  isStatsData,
} from '@/utils/guards/typeGuards'

/**
 * 統一形式からレガシー形式への変換
 */
export function transformToLegacyFormat<T>(unifiedResponse: UnifiedApiResponse<T>): LegacyResponse {
  // APIレスポンスのチェック
  if (!unifiedResponse.success) {
    throw new Error(unifiedResponse.error?.message || 'API request failed')
  }

  const { data, meta } = unifiedResponse

  // データの存在チェック
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid API response data format')
  }

  const dataObj = data as Record<string, unknown>

  // データタイプの判定と変換
  const dataType = identifyDataType(dataObj)

  // データタイプに応じた変換
  switch (dataType) {
    case 'petList':
      return transformPetListResponse(dataObj['pets'] as FrontendPet[], meta)
    case 'singlePet':
      // 型ガードで確認済み、unknownを経由してキャスト
      return transformSinglePetResponse(dataObj as unknown as FrontendPet)
    case 'prefectures':
      return transformPrefecturesResponse(dataObj['prefectures'] as string[])
    case 'stats':
      return transformStatsResponse(dataObj)
    default:
      throw new Error('Unknown data type in unified response')
  }
}

/**
 * データタイプの識別
 */
function identifyDataType(
  dataObj: Record<string, unknown>
): 'petList' | 'singlePet' | 'prefectures' | 'stats' {
  if (isPetListData(dataObj)) {
    return 'petList'
  }

  if (isSinglePetData(dataObj)) {
    return 'singlePet'
  }

  if (isPrefecturesData(dataObj)) {
    return 'prefectures'
  }

  if (isStatsData(dataObj)) {
    return 'stats'
  }

  throw new Error('Could not identify data type')
}

/**
 * ペットリストレスポンスの変換
 */
export function transformPetListResponse(
  pets: FrontendPet[],
  meta?: ApiMeta
): LegacyPetListResponse {
  return {
    pets,
    pagination: meta
      ? {
          limit: meta.limit || 20,
          offset: ((meta.page || 1) - 1) * (meta.limit || 20),
          total: meta.total || 0,
          hasMore: meta.hasMore || false,
        }
      : {
          limit: 20,
          offset: 0,
          total: pets.length,
          hasMore: false,
        },
  }
}

/**
 * 単一ペットレスポンスの変換
 */
export function transformSinglePetResponse(pet: FrontendPet): LegacySinglePetResponse {
  // ペットの型に応じて適切なフォーマットで返す
  if ('type' in pet && pet.type === 'cat') {
    return { cat: pet as Cat }
  } else {
    return { dog: pet as Dog }
  }
}

/**
 * 都道府県リストレスポンスの変換
 */
export function transformPrefecturesResponse(prefectures: string[]): LegacyPrefecturesResponse {
  return { prefectures }
}

/**
 * 統計情報レスポンスの変換
 */
export function transformStatsResponse(data: Record<string, unknown>): LegacyStatsResponse {
  // 統計データの構造を保証
  return {
    total: (data['total'] as number) || 0,
    cats: (data['cats'] as number) || 0,
    dogs: (data['dogs'] as number) || 0,
    last_updated: (data['last_updated'] as string) || new Date().toISOString(),
  }
}

/**
 * レガシーレスポンスの検証
 */
export function validateLegacyResponse(response: unknown): response is LegacyResponse {
  if (!response || typeof response !== 'object') {
    return false
  }

  const res = response as Record<string, unknown>

  // ペットリスト、都道府県、統計のいずれかの形式であることを確認
  return (
    'pets' in res ||
    'dogs' in res ||
    'cats' in res ||
    ('prefectures' in res && Array.isArray(res['prefectures'])) ||
    ('total' in res && 'cats' in res && 'dogs' in res) ||
    'cat' in res ||
    'dog' in res
  )
}

/**
 * APIエラーハンドリング
 */
export function handleApiError(error: unknown): never {
  if (error instanceof Error) {
    throw error
  }
  throw new Error('Unknown error occurred')
}
