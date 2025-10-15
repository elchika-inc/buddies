/**
 * 型定義のバレルエクスポート
 * 統一されたインポートパスを提供
 */

// API関連の型
export type {
  UnifiedApiResponse,
  LegacyResponse,
  ApiMeta,
  LegacyPetListResponse,
  LegacySinglePetResponse,
  LegacyPrefecturesResponse,
  LegacyStatsResponse,
  StatsData,
} from './api'

// ペット関連の型
export type {
  Pet,
  Dog,
  Cat,
  FrontendPet,
  PetType,
  PetGender,
  PetSize,
  ExerciseLevel,
  TrainingLevel,
  SocialLevel,
  IndoorOutdoor,
  PetWithImages,
  Image,
  PetFilter,
  PetSort,
  PetResponse,
  PetsListResponse,
  ExtendedPet,
  LocalPetExtensions,
} from './pet'

// お気に入り関連の型
export type {
  FavoriteRating,
  FavoriteItem,
  FavoritesData,
  UseFavoritesReturn,
  FavoritesServiceOptions,
  GetStorageKeyFunction,
  FavoritesValidationResult,
} from './favorites'

// 位置情報関連の型
export type { Prefecture, Gender } from './location'

// ストレージ関連の型
export type { StorageErrorType, StorageError, StorageResult, StorageOptions } from './storage'

// エラー関連（クラスと関数も含む）
export {
  ApiError,
  ValidationError,
  StorageError as StorageErrorClass,
  isApiError,
  isValidationError,
  isStorageError,
  getErrorMessage,
} from './error'

// 共通型とユーティリティ
export type { SafeArray, StrictOptional, NonNullable, ArrayElement, SafeRecord } from './common'

export {
  isObject,
  isString,
  isNumber,
  isArray,
  hasProperty,
  safeArrayAccess,
  safePropertyAccess,
} from './common'
