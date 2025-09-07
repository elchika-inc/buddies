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
} from './errorHandler';

// レスポンスフォーマッター
export {
  successResponse,
  errorResponse,
  paginationMeta,
  convertKeysToCamelCase,
  snakeToCamel,
  type ApiResponse,
  type ApiErrorResponse
} from './responseFormatter';

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
} from './dataTransformer';

// 型ガード
export {
  // 基本型チェック
  isString,
  isNumber,
  isBoolean,
  isObject,
  isRecord,
  isArray,
  isStringArray,
  isNullOrUndefined,
  isDefined,
  // 特定型チェック
  isPetType,
  isPetStatus,
  isPet,
  isImageFormat,
  // モデル型ガード
  isRawPetRecord,
  isCountResult,
  isApiResponse,
  isStatisticsData,
  // ユーティリティ
  ensureArray,
  safeGet,
  safeJsonParse,
  throwInvalidDataError
} from './typeGuards';