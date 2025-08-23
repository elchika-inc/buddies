// APIレスポンスの変換を担当する関数群
import { Pet } from '@/types/pet';
import {
  UnifiedApiResponse,
  LegacyPetListResponse,
  LegacySinglePetResponse,
  LegacyPrefecturesResponse,
  LegacyStatsResponse,
  StatsData,
  LegacyResponse,
  ApiMeta
} from '@/types/api';
import {
  isDog,
  isCat,
  isPetListData,
  isSinglePetData,
  isPrefecturesData,
  isStatsData
} from '@/utils/guards/typeGuards';

/**
 * 統一形式からレガシー形式への変換
 */
export function transformToLegacyFormat<T>(
  unifiedResponse: UnifiedApiResponse<T>
): LegacyResponse {
  if (!unifiedResponse.success) {
    throw new Error(unifiedResponse.error?.message || 'API request failed');
  }

  const { data, meta } = unifiedResponse;
  
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid API response data format');
  }
  
  const dataObj = data as Record<string, unknown>;
  
  // ペットリストデータの場合
  if (isPetListData(dataObj)) {
    return transformPetListResponse(dataObj.pets, meta);
  }
  
  // 単一ペットデータの場合
  if (isSinglePetData(dataObj)) {
    return transformSinglePetResponse(dataObj as Pet);
  }
  
  // 都道府県データの場合
  if (isPrefecturesData(dataObj)) {
    return transformPrefecturesResponse(dataObj.prefectures);
  }
  
  // 統計データの場合
  if (isStatsData(dataObj)) {
    return transformStatsResponse(dataObj);
  }
  
  throw new Error('Unknown data type in unified response');
}

/**
 * ペットリストレスポンスの変換
 */
export function transformPetListResponse(
  pets: Pet[], 
  meta?: ApiMeta
): LegacyPetListResponse {
  return {
    pets,
    pagination: meta ? {
      limit: meta.limit || 20,
      offset: ((meta.page || 1) - 1) * (meta.limit || 20),
      total: meta.total || 0,
      hasMore: meta.hasMore || false
    } : undefined
  };
}

/**
 * 単一ペットレスポンスの変換
 */
export function transformSinglePetResponse(pet: Pet): LegacySinglePetResponse {
  if (isDog(pet)) {
    return { dog: pet };
  } else if (isCat(pet)) {
    return { cat: pet };
  }
  
  throw new Error('Unknown pet type in response');
}

/**
 * 都道府県リストレスポンスの変換
 */
export function transformPrefecturesResponse(
  prefectures: string[]
): LegacyPrefecturesResponse {
  return { prefectures };
}

/**
 * 統計データレスポンスの変換
 */
export function transformStatsResponse(stats: StatsData): LegacyStatsResponse {
  return {
    total: stats.total,
    cats: stats.cats,
    dogs: stats.dogs,
    last_updated: stats.last_updated
  };
}

/**
 * レガシー形式のバリデーション
 */
export function validateLegacyResponse(response: unknown): boolean {
  if (!response || typeof response !== 'object') {
    return false;
  }
  
  // 詳細なバリデーションロジックを実装
  const res = response as Record<string, unknown>;
  
  // ペットリストレスポンスの検証
  if ('pets' in res || 'cats' in res || 'dogs' in res) {
    return Array.isArray(res.pets || res.cats || res.dogs);
  }
  
  // 単一ペットレスポンスの検証
  if ('cat' in res || 'dog' in res) {
    return typeof (res.cat || res.dog) === 'object';
  }
  
  // 都道府県レスポンスの検証
  if ('prefectures' in res) {
    return Array.isArray(res.prefectures);
  }
  
  // 統計レスポンスの検証
  if ('total' in res && 'cats' in res && 'dogs' in res) {
    return (
      typeof res.total === 'number' &&
      typeof res.cats === 'number' &&
      typeof res.dogs === 'number'
    );
  }
  
  return false;
}