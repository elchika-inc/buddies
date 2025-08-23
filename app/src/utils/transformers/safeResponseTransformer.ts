/**
 * Result型パターンを使用した安全なAPIレスポンス変換
 */
import { Pet } from '@/types/pet';
import {
  UnifiedApiResponse,
  LegacyPetListResponse,
  LegacySinglePetResponse,
  LegacyPrefecturesResponse,
  LegacyStatsResponse,
  LegacyResponse,
  ApiMeta
} from '@/types/api';
import {
  Result,
  ok,
  err,
  isOk,
  map,
  flatMap
} from '@/types/result';
import {
  isDog,
  isCat,
  isPetListData,
  isSinglePetData,
  isPrefecturesData,
  isStatsData
} from '@/utils/guards/typeGuards';

// エラータイプの定義
export interface TransformError {
  code: 'INVALID_DATA' | 'UNKNOWN_TYPE' | 'API_ERROR' | 'VALIDATION_ERROR';
  message: string;
  details?: unknown;
}

/**
 * 統一形式からレガシー形式への安全な変換
 */
export function safeTransformToLegacyFormat<T>(
  unifiedResponse: UnifiedApiResponse<T>
): Result<LegacyResponse, TransformError> {
  // APIレスポンスのチェック
  if (!unifiedResponse.success) {
    return err({
      code: 'API_ERROR',
      message: unifiedResponse.error?.message || 'API request failed',
      details: unifiedResponse.error
    });
  }

  const { data, meta } = unifiedResponse;
  
  // データの存在チェック
  if (!data || typeof data !== 'object') {
    return err({
      code: 'INVALID_DATA',
      message: 'Invalid API response data format',
      details: data
    });
  }
  
  const dataObj = data as Record<string, unknown>;
  
  // データタイプの判定と変換
  const dataTypeResult = identifyDataType(dataObj);
  if (!isOk(dataTypeResult)) {
    return dataTypeResult;
  }

  // データタイプに応じた変換
  switch (dataTypeResult.data) {
    case 'petList':
      return transformPetListResponseSafe(dataObj.pets as Pet[], meta);
    case 'singlePet':
      return transformSinglePetResponseSafe(dataObj as Pet);
    case 'prefectures':
      return transformPrefecturesResponseSafe(dataObj.prefectures as string[]);
    case 'stats':
      return transformStatsResponseSafe(dataObj);
    default:
      return err({
        code: 'UNKNOWN_TYPE',
        message: 'Unknown data type in unified response',
        details: dataObj
      });
  }
}

/**
 * データタイプの識別
 */
function identifyDataType(
  dataObj: Record<string, unknown>
): Result<'petList' | 'singlePet' | 'prefectures' | 'stats', TransformError> {
  if (isPetListData(dataObj)) {
    return ok('petList');
  }
  
  if (isSinglePetData(dataObj)) {
    return ok('singlePet');
  }
  
  if (isPrefecturesData(dataObj)) {
    return ok('prefectures');
  }
  
  if (isStatsData(dataObj)) {
    return ok('stats');
  }
  
  return err({
    code: 'UNKNOWN_TYPE',
    message: 'Could not identify data type',
    details: Object.keys(dataObj)
  });
}

/**
 * ペットリストレスポンスの安全な変換
 */
export function transformPetListResponseSafe(
  pets: Pet[], 
  meta?: ApiMeta
): Result<LegacyPetListResponse, TransformError> {
  try {
    const response: LegacyPetListResponse = {
      pets,
      pagination: meta ? {
        limit: meta.limit || 20,
        offset: ((meta.page || 1) - 1) * (meta.limit || 20),
        total: meta.total || 0,
        hasMore: meta.hasMore || false
      } : undefined
    };
    return ok(response);
  } catch (error) {
    return err({
      code: 'VALIDATION_ERROR',
      message: 'Failed to transform pet list response',
      details: error
    });
  }
}

/**
 * 単一ペットレスポンスの安全な変換
 */
export function transformSinglePetResponseSafe(
  pet: Pet
): Result<LegacySinglePetResponse, TransformError> {
  if (isDog(pet)) {
    return ok({ dog: pet });
  }
  
  if (isCat(pet)) {
    return ok({ cat: pet });
  }
  
  return err({
    code: 'UNKNOWN_TYPE',
    message: 'Unknown pet type in response',
    details: { petType: (pet as any).type }
  });
}

/**
 * 都道府県リストレスポンスの安全な変換
 */
export function transformPrefecturesResponseSafe(
  prefectures: string[]
): Result<LegacyPrefecturesResponse, TransformError> {
  if (!Array.isArray(prefectures)) {
    return err({
      code: 'INVALID_DATA',
      message: 'Prefectures must be an array',
      details: prefectures
    });
  }
  
  return ok({ prefectures });
}

/**
 * 統計データレスポンスの安全な変換
 */
export function transformStatsResponseSafe(
  stats: Record<string, unknown>
): Result<LegacyStatsResponse, TransformError> {
  if (!isStatsData(stats)) {
    return err({
      code: 'INVALID_DATA',
      message: 'Invalid stats data format',
      details: stats
    });
  }
  
  return ok({
    total: stats.total,
    cats: stats.cats,
    dogs: stats.dogs,
    last_updated: stats.last_updated
  });
}

/**
 * バリデーション結果をResult型で返す
 */
export function validateLegacyResponseSafe(
  response: unknown
): Result<LegacyResponse, TransformError> {
  if (!response || typeof response !== 'object') {
    return err({
      code: 'INVALID_DATA',
      message: 'Response must be an object',
      details: response
    });
  }
  
  const res = response as Record<string, unknown>;
  
  // ペットリストレスポンスの検証
  if ('pets' in res || 'cats' in res || 'dogs' in res) {
    const pets = res.pets || res.cats || res.dogs;
    if (!Array.isArray(pets)) {
      return err({
        code: 'VALIDATION_ERROR',
        message: 'Pets data must be an array',
        details: pets
      });
    }
    return ok(res as LegacyPetListResponse);
  }
  
  // 単一ペットレスポンスの検証
  if ('cat' in res || 'dog' in res) {
    const pet = res.cat || res.dog;
    if (typeof pet !== 'object') {
      return err({
        code: 'VALIDATION_ERROR',
        message: 'Pet data must be an object',
        details: pet
      });
    }
    return ok(res as LegacySinglePetResponse);
  }
  
  // 都道府県レスポンスの検証
  if ('prefectures' in res) {
    if (!Array.isArray(res.prefectures)) {
      return err({
        code: 'VALIDATION_ERROR',
        message: 'Prefectures must be an array',
        details: res.prefectures
      });
    }
    return ok(res as LegacyPrefecturesResponse);
  }
  
  // 統計レスポンスの検証
  if ('total' in res && 'cats' in res && 'dogs' in res) {
    if (
      typeof res.total !== 'number' ||
      typeof res.cats !== 'number' ||
      typeof res.dogs !== 'number'
    ) {
      return err({
        code: 'VALIDATION_ERROR',
        message: 'Stats values must be numbers',
        details: res
      });
    }
    return ok(res as LegacyStatsResponse);
  }
  
  return err({
    code: 'UNKNOWN_TYPE',
    message: 'Unknown response type',
    details: Object.keys(res)
  });
}