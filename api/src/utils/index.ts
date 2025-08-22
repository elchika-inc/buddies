/**
 * ユーティリティのバレルエクスポート
 * 
 * @module utils
 * @description 共通ユーティリティ関数とヘルパーを一元的にエクスポート
 */

// 定数
export { CONFIG } from './constants';

// エラーハンドリング
export {
  PawMatchError,
  ValidationError,
  NotFoundError,
  ServiceUnavailableError,
  handleError
} from './error-handler';

// レスポンスフォーマッター
export {
  successResponse,
  errorResponse,
  paginationMeta,
  convertKeysToCamelCase,
  snakeToCamel,
  type ApiResponse,
  type ApiErrorResponse
} from './response-formatter';

// バリデーション
export {
  validatePetType,
  validateImageFormat,
  validatePagination,
  extractPetIdFromFilename
} from './validation';

// データ変換
export {
  transformToCamelCase,
  transformToSnakeCase,
  dbToApi,
  apiToDb,
  transformPetRecord,
  type ApiPetRecord
} from './data-transformer';

// 型ガード
export {
  // 基本型チェック
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isNullOrUndefined,
  isDefined,
  // 特定型チェック
  isPetType,
  isGender,
  isServiceStatus,
  isSyncStatus,
  // モデル型ガード
  isRawPetRecord,
  isCountResult,
  isDataReadiness,
  isPetStatistics,
  isServiceHealth,
  isServiceHealthArray,
  isPrefectureStats,
  isAgeStats,
  isRecentPet,
  isCoverageTrend,
  isDetailedStatistics,
  // ユーティリティ
  isQueryResult,
  safeCast,
  combineGuards,
  ensureArray,
  safeGet
} from './type-guards';