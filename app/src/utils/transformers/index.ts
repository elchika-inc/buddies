/**
 * レスポンス変換ユーティリティのエクスポート
 */

// 基本的な変換関数
export {
  transformToLegacyFormat,
  transformPetListResponse,
  transformSinglePetResponse,
  transformPrefecturesResponse,
  transformStatsResponse,
  validateLegacyResponse
} from './responseTransformer';

// Result型を使用した安全な変換関数
export {
  safeTransformToLegacyFormat,
  transformPetListResponseSafe,
  transformSinglePetResponseSafe,
  transformPrefecturesResponseSafe,
  transformStatsResponseSafe,
  validateLegacyResponseSafe,
  type TransformError
} from './safeResponseTransformer';