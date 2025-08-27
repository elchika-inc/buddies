import type { Pet, PetStatus, ApiResponse, StatisticsData } from '../types/api';
import type { PetType, ImageFormat } from './constants';
import { PET_TYPES, IMAGE_FORMATS } from './constants';

// 型ガード関数：PetType
export function isPetType(value: unknown): value is PetType {
  return typeof value === 'string' && PET_TYPES.includes(value as PetType);
}

// 型ガード関数：ImageFormat  
export function isImageFormat(value: unknown): value is ImageFormat {
  return typeof value === 'string' && IMAGE_FORMATS.includes(value as ImageFormat);
}

// 型ガード関数：Pet
export function isPet(value: unknown): value is Pet {
  if (!value || typeof value !== 'object') return false;
  
  const pet = value as Record<string, unknown>;
  
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
    (pet['detailedInfo'] === undefined || isDetailedInfo(pet['detailedInfo'])) &&
    (pet['updatedAt'] === undefined || typeof pet['updatedAt'] === 'string' || pet['updatedAt'] instanceof Date)
  );
}

// 型ガード関数：PetStatus
export function isPetStatus(value: unknown): value is PetStatus {
  const validStatuses: PetStatus[] = ['healthy', 'medical_care', 'special_needs'];
  return typeof value === 'string' && validStatuses.includes(value as PetStatus);
}

// 型ガード関数：DetailedInfo
function isDetailedInfo(value: unknown): value is Pet['detailedInfo'] {
  if (value === null) return true;
  if (!value || typeof value !== 'object') return false;
  
  const info = value as Record<string, unknown>;
  
  return (
    (info['personality'] === undefined || typeof info['personality'] === 'string') &&
    (info['healthNotes'] === undefined || typeof info['healthNotes'] === 'string') &&
    (info['requirements'] === undefined || typeof info['requirements'] === 'string')
  );
}

// 型ガード関数：ApiResponse
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (!value || typeof value !== 'object') return false;
  
  const response = value as Record<string, unknown>;
  
  return (
    typeof response['success'] === 'boolean' &&
    response['data'] !== undefined &&
    (response['error'] === undefined || typeof response['error'] === 'string' || 
     (typeof response['error'] === 'object' && response['error'] !== null && 
      'message' in response['error'] && typeof (response['error'] as any)['message'] === 'string'))
  );
}

// 型ガード関数：StatisticsData
export function isStatisticsData(value: unknown): value is StatisticsData {
  if (!value || typeof value !== 'object') return false;
  
  const stats = value as Record<string, unknown>;
  
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
  );
}

// 型ガード関数：Record
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// 型ガード関数：Array
export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false;
  if (!itemGuard) return true;
  
  return value.every(item => itemGuard(item));
}

// 型ガード関数：文字列配列
export function isStringArray(value: unknown): value is string[] {
  return isArray(value, (item): item is string => typeof item === 'string');
}

// 型ガード関数：数値
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

// 型ガード関数：文字列
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// 型ガード関数：真偽値
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// 安全なJSONパース
export function safeJsonParse<T>(json: string, guard?: (value: unknown) => value is T): T | null {
  try {
    const parsed = JSON.parse(json);
    if (guard && !guard(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// エラーをスローするヘルパー
export function throwInvalidDataError(message: string): never {
  throw new Error(`Invalid data format: ${message}`);
}

// 型ガード関数：RawPetRecord（データベースから取得した生のペットレコード）
export function isRawPetRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record['id'] === 'string' && 
         typeof record['type'] === 'string' &&
         typeof record['name'] === 'string';
}

// 型ガード関数：CountResult（COUNT(*)クエリの結果）
export function isCountResult(value: unknown): value is { count: number; [key: string]: unknown } {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return typeof result['count'] === 'number' || typeof result['total'] === 'number';
}

// 配列を安全に確保する
export function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}