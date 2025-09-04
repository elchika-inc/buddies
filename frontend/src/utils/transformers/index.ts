/**
 * レスポンス変換ユーティリティのエクスポート
 */

// シンプルな変換関数（Result型パターンを削除）
export {
  transformToLegacyFormat,
  transformPetListResponse,
  transformSinglePetResponse,
  transformPrefecturesResponse,
  transformStatsResponse,
  validateLegacyResponse,
  handleApiError
} from './responseTransformer';