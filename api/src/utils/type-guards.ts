/**
 * 型ガードユーティリティ
 * 
 * @description 実行時の型チェックを提供し、型安全性を保証
 */

import type { 
  RawPetRecord, 
  CountResult 
} from '../types/database';
import type { 
  Pet, 
  Dog, 
  Cat 
} from '../types/models';
import type { 
  DataReadiness, 
  PetStatistics, 
  SyncJobStatus 
} from '../types/services';
import type {
  ServiceHealth,
  DetailedStatistics,
  PrefectureStats,
  AgeStats,
  RecentPet,
  CoverageTrend
} from '../types/statistics';

/**
 * 基本的な型チェック
 */
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number';
};

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean';
};

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

/**
 * null/undefined チェック
 */
export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return value === null || value === undefined;
};

export const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

/**
 * 文字列型のユニオン型チェック
 */
export const isPetType = (value: unknown): value is 'dog' | 'cat' => {
  return value === 'dog' || value === 'cat';
};

export const isGender = (value: unknown): value is 'male' | 'female' | 'unknown' => {
  return value === 'male' || value === 'female' || value === 'unknown';
};

export const isServiceStatus = (value: unknown): value is 'healthy' | 'degraded' | 'down' => {
  return value === 'healthy' || value === 'degraded' || value === 'down';
};

export const isSyncStatus = (value: unknown): value is 'pending' | 'running' | 'completed' | 'failed' => {
  return value === 'pending' || value === 'running' || value === 'completed' || value === 'failed';
};

/**
 * RawPetRecord の完全な型ガード
 */
export function isRawPetRecord(value: unknown): value is RawPetRecord {
  if (!isObject(value)) {
    return false;
  }

  // 最小限の必須フィールドのチェック
  const hasRequiredFields = (
    isString(value.id) &&
    isPetType(value.type) &&
    isString(value.name)
  );

  return hasRequiredFields;
}

/**
 * CountResult の型ガード
 */
export function isCountResult(value: unknown): value is CountResult {
  return isObject(value) && isNumber(value.total);
}

/**
 * DataReadiness の型ガード
 */
export function isDataReadiness(value: unknown): value is DataReadiness {
  if (!isObject(value)) {
    return false;
  }

  return (
    isBoolean(value.isReady) &&
    isNumber(value.totalPets) &&
    isNumber(value.totalDogs) &&
    isNumber(value.totalCats) &&
    isNumber(value.petsWithJpeg) &&
    isNumber(value.imageCoverage) &&
    (value.lastSyncAt === null || isString(value.lastSyncAt)) &&
    isString(value.message)
  );
}

/**
 * PetStatistics の型ガード
 */
export function isPetStatistics(value: unknown): value is PetStatistics {
  if (!isObject(value)) {
    return false;
  }

  return (
    isNumber(value.totalPets) &&
    isNumber(value.totalDogs) &&
    isNumber(value.totalCats) &&
    isNumber(value.petsWithJpeg) &&
    isNumber(value.petsWithWebp) &&
    isNumber(value.dogsWithJpeg) &&
    isNumber(value.dogsWithWebp) &&
    isNumber(value.catsWithJpeg) &&
    isNumber(value.catsWithWebp)
  );
}

/**
 * ServiceHealth の型ガード
 */
export function isServiceHealth(value: unknown): value is ServiceHealth {
  if (!isObject(value)) {
    return false;
  }

  return (
    isString(value.service) &&
    isServiceStatus(value.status) &&
    isString(value.message) &&
    isString(value.lastCheck) &&
    (value.metrics === undefined || isObject(value.metrics))
  );
}

/**
 * ServiceHealth配列の型ガード
 */
export function isServiceHealthArray(value: unknown): value is ServiceHealth[] {
  return isArray(value) && value.every(isServiceHealth);
}

/**
 * PrefectureStats の型ガード
 */
export function isPrefectureStats(value: unknown): value is PrefectureStats {
  if (!isObject(value)) {
    return false;
  }

  return (
    isString(value.prefecture) &&
    isNumber(value.count) &&
    isNumber(value.dogs) &&
    isNumber(value.cats)
  );
}

/**
 * AgeStats の型ガード
 */
export function isAgeStats(value: unknown): value is AgeStats {
  if (!isObject(value)) {
    return false;
  }

  return (
    isNumber(value.age) &&
    isNumber(value.count)
  );
}

/**
 * RecentPet の型ガード
 */
export function isRecentPet(value: unknown): value is RecentPet {
  if (!isObject(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isPetType(value.type) &&
    isString(value.name) &&
    isString(value.created_at)
  );
}

/**
 * CoverageTrend の型ガード
 */
export function isCoverageTrend(value: unknown): value is CoverageTrend {
  if (!isObject(value)) {
    return false;
  }

  return (
    isString(value.date) &&
    isNumber(value.checked) &&
    isNumber(value.with_images)
  );
}

/**
 * DetailedStatistics の型ガード
 */
export function isDetailedStatistics(value: unknown): value is DetailedStatistics {
  if (!isObject(value)) {
    return false;
  }

  return (
    isArray(value.prefectureDistribution) && value.prefectureDistribution.every(isPrefectureStats) &&
    isArray(value.ageDistribution) && value.ageDistribution.every(isAgeStats) &&
    isArray(value.recentPets) && value.recentPets.every(isRecentPet) &&
    isArray(value.coverageTrend) && value.coverageTrend.every(isCoverageTrend) &&
    isString(value.timestamp)
  );
}

/**
 * データベースクエリ結果の型ガード
 */
export function isQueryResult<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): value is { results: T[] } {
  if (!isObject(value)) {
    return false;
  }

  return (
    isArray(value.results) &&
    value.results.every(itemGuard)
  );
}

/**
 * 安全な型キャスト（型ガード付き）
 */
export function safeCast<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  defaultValue: T
): T {
  return guard(value) ? value : defaultValue;
}

/**
 * 複数の型ガードを組み合わせる
 */
export function combineGuards<T, U>(
  guard1: (value: unknown) => value is T,
  guard2: (value: T) => value is U
): (value: unknown) => value is U {
  return (value: unknown): value is U => {
    return guard1(value) && guard2(value);
  };
}

/**
 * 配列の全要素が特定の型であることを保証
 */
export function ensureArray<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): T[] {
  if (!isArray(value)) {
    return [];
  }
  return value.filter(itemGuard);
}

/**
 * オブジェクトから安全にプロパティを取得
 */
export function safeGet<T>(
  obj: unknown,
  key: string,
  guard: (value: unknown) => value is T,
  defaultValue: T
): T {
  if (!isObject(obj)) {
    return defaultValue;
  }
  const value = obj[key];
  return guard(value) ? value : defaultValue;
}