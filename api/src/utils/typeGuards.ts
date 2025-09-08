import type { Pet } from '../types/models'

// 型定義
export type PetStatus = 'healthy' | 'medical_care' | 'special_needs'

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string | { message: string }
}

export interface StatisticsData {
  totalPets: number
  totalDogs: number
  totalCats: number
  prefectureDistribution: Record<string, number>
  breedDistribution: Record<string, number>
  genderDistribution: Record<string, number>
  ageDistribution: Record<string, number>
  organizationDistribution: Record<string, number>
  storageUsage: Record<string, unknown>
  healthMetrics: Record<string, unknown>
}
import type { PetType, ImageFormat } from './constants'
import { PET_TYPES, IMAGE_FORMATS } from './constants'

// 型ガード関数：PetType
export function isPetType(value: unknown): value is PetType {
  return typeof value === 'string' && PET_TYPES.includes(value as PetType)
}

// 型ガード関数：ImageFormat
export function isImageFormat(value: unknown): value is ImageFormat {
  return typeof value === 'string' && IMAGE_FORMATS.includes(value as ImageFormat)
}

// 型ガード関数：Pet
export function isPet(value: unknown): value is Pet {
  if (!value || typeof value !== 'object') return false

  const pet = value as Record<string, unknown>

  return (
    typeof pet['id'] === 'string' &&
    typeof pet['name'] === 'string' &&
    typeof pet['breed'] === 'string' &&
    typeof pet['gender'] === 'string' &&
    (typeof pet['age'] === 'string' || typeof pet['age'] === 'number') &&
    typeof pet['prefecture'] === 'string' &&
    typeof pet['city'] === 'string' &&
    typeof pet['organization'] === 'string' &&
    typeof pet['description'] === 'string' &&
    typeof pet['sourceUrl'] === 'string' &&
    (pet['imageUrl'] === undefined || typeof pet['imageUrl'] === 'string') &&
    (pet['imageOptimizedUrl'] === undefined || typeof pet['imageOptimizedUrl'] === 'string') &&
    (pet['hasJpeg'] === undefined || typeof pet['hasJpeg'] === 'boolean') &&
    (pet['hasWebp'] === undefined || typeof pet['hasWebp'] === 'boolean') &&
    (pet['jpegSize'] === undefined || typeof pet['jpegSize'] === 'number') &&
    (pet['webpSize'] === undefined || typeof pet['webpSize'] === 'number') &&
    (pet['status'] === undefined || isPetStatus(pet['status'])) &&
    (pet['medicalInfo'] === undefined || typeof pet['medicalInfo'] === 'string') &&
    (pet['updatedAt'] === undefined ||
      typeof pet['updatedAt'] === 'string' ||
      pet['updatedAt'] instanceof Date)
  )
}

// 型ガード関数：PetStatus
export function isPetStatus(value: unknown): value is PetStatus {
  const validStatuses: PetStatus[] = ['healthy', 'medical_care', 'special_needs']
  return typeof value === 'string' && validStatuses.includes(value as PetStatus)
}

// 型ガード関数：ApiResponse
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (!value || typeof value !== 'object') return false

  const response = value as Record<string, unknown>

  return (
    typeof response['success'] === 'boolean' &&
    response['data'] !== undefined &&
    (response['error'] === undefined ||
      typeof response['error'] === 'string' ||
      (typeof response['error'] === 'object' &&
        response['error'] !== null &&
        'message' in response['error'] &&
        typeof (response['error'] as any)['message'] === 'string'))
  )
}

// 型ガード関数：StatisticsData
export function isStatisticsData(value: unknown): value is StatisticsData {
  if (!value || typeof value !== 'object') return false

  const stats = value as Record<string, unknown>

  return (
    typeof stats['totalPets'] === 'number' &&
    typeof stats['totalDogs'] === 'number' &&
    typeof stats['totalCats'] === 'number' &&
    stats['prefectureDistribution'] !== undefined &&
    typeof stats['prefectureDistribution'] === 'object' &&
    stats['breedDistribution'] !== undefined &&
    typeof stats['breedDistribution'] === 'object' &&
    stats['genderDistribution'] !== undefined &&
    typeof stats['genderDistribution'] === 'object' &&
    stats['ageDistribution'] !== undefined &&
    typeof stats['ageDistribution'] === 'object' &&
    stats['organizationDistribution'] !== undefined &&
    typeof stats['organizationDistribution'] === 'object' &&
    stats['storageUsage'] !== undefined &&
    typeof stats['storageUsage'] === 'object' &&
    stats['healthMetrics'] !== undefined &&
    typeof stats['healthMetrics'] === 'object'
  )
}

// 型ガード関数：Record
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// 型ガード関数：Array
export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false
  if (!itemGuard) return true

  return value.every((item) => itemGuard(item))
}

// 型ガード関数：文字列配列
export function isStringArray(value: unknown): value is string[] {
  return isArray(value, (item): item is string => typeof item === 'string')
}

// 型ガード関数：数値
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

// 型ガード関数：文字列
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

// 型ガード関数：真偽値
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

// 型ガード関数：オブジェクト
export function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// 型ガード関数：null or undefined
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

// 型ガード関数：defined (not null or undefined)
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

// 安全なJSONパース
export function safeJsonParse<T>(json: string, guard?: (value: unknown) => value is T): T | null {
  try {
    const parsed = JSON.parse(json)
    if (guard && !guard(parsed)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

// エラーをスローするヘルパー
export function throwInvalidDataError(message: string): never {
  throw new Error(`Invalid data format: ${message}`)
}

// 型ガード関数：RawPetRecord（データベースから取得した生のペットレコード）
export function isRawPetRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record['id'] === 'string' &&
    typeof record['type'] === 'string' &&
    typeof record['name'] === 'string'
  )
}

// 型ガード関数：CountResult（COUNT(*)クエリの結果）
export function isCountResult(value: unknown): value is { count: number; [key: string]: unknown } {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>
  return typeof result['count'] === 'number' || typeof result['total'] === 'number'
}

// 配列を安全に確保し、フィルタリングする
export function ensureArray<T>(
  value: T[] | undefined | null,
  guard: (item: unknown) => item is T
): T[] {
  if (!value || !Array.isArray(value)) return []
  return value.filter((item): item is T => guard(item))
}

// オブジェクトから安全に値を取得する
export function safeGet<T>(
  obj: Record<string, unknown>,
  key: string,
  guard: (value: unknown) => value is T,
  defaultValue: T
): T {
  const value = obj[key]
  return guard(value) ? value : defaultValue
}

// 詳細統計用の型ガード関数
export function isPrefectureStats(
  value: unknown
): value is { prefecture: string; count: number; dogs: number; cats: number } {
  if (!value || typeof value !== 'object') return false
  const stats = value as Record<string, unknown>
  return (
    typeof stats['prefecture'] === 'string' &&
    typeof stats['count'] === 'number' &&
    typeof stats['dogs'] === 'number' &&
    typeof stats['cats'] === 'number'
  )
}

export function isAgeStats(value: unknown): value is { age: number; count: number } {
  if (!value || typeof value !== 'object') return false
  const stats = value as Record<string, unknown>
  return typeof stats['age'] === 'number' && typeof stats['count'] === 'number'
}

export function isRecentPet(
  value: unknown
): value is { id: string; type: 'dog' | 'cat'; name: string; created_at: string } {
  if (!value || typeof value !== 'object') return false
  const pet = value as Record<string, unknown>
  return (
    typeof pet['id'] === 'string' &&
    (pet['type'] === 'dog' || pet['type'] === 'cat') &&
    typeof pet['name'] === 'string' &&
    typeof pet['created_at'] === 'string'
  )
}

export function isCoverageTrend(
  value: unknown
): value is { date: string; checked: number; with_images: number } {
  if (!value || typeof value !== 'object') return false
  const trend = value as Record<string, unknown>
  return (
    typeof trend['date'] === 'string' &&
    typeof trend['checked'] === 'number' &&
    typeof trend['with_images'] === 'number'
  )
}
