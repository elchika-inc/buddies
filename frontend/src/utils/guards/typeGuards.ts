// 型ガード関数群
import { Pet, Dog, Cat } from '@/types/pet';
import { StatsData } from '@/types/api';

/**
 * Dog型の型ガード
 */
export function isDog(pet: Pet): pet is Dog {
  return (
    'size' in pet &&
    'exerciseLevel' in pet &&
    'goodWithKids' in pet &&
    typeof (pet as Dog).size === 'string' &&
    typeof (pet as Dog).exerciseLevel === 'string' &&
    typeof (pet as Dog).goodWithKids === 'boolean'
  );
}

/**
 * Cat型の型ガード
 */
export function isCat(pet: Pet): pet is Cat {
  return (
    'coatLength' in pet &&
    'socialLevel' in pet &&
    'indoorOutdoor' in pet &&
    typeof (pet as Cat).coatLength === 'string' &&
    typeof (pet as Cat).socialLevel === 'string' &&
    typeof (pet as Cat).indoorOutdoor === 'string'
  );
}

/**
 * ペットリストデータの型ガード
 */
export function isPetListData(obj: Record<string, unknown>): obj is { pets: Pet[] } {
  return Array.isArray(obj['pets']) && (obj['pets'].length === 0 || isPet(obj['pets'][0]));
}

/**
 * 単一ペットデータの型ガード
 */
export function isSinglePetData(obj: Record<string, unknown>): obj is Record<string, unknown> & Pet {
  return isPet(obj);
}

/**
 * Pet型の基本的な型ガード
 */
export function isPet(obj: unknown): obj is Pet {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  const pet = obj as Record<string, unknown>;
  
  // 基本的なPetプロパティの検証
  return (
    typeof pet['id'] === 'string' &&
    typeof pet['name'] === 'string' &&
    typeof pet['age'] === 'string' &&
    typeof pet['gender'] === 'string' &&
    typeof pet['breed'] === 'string' &&
    typeof pet['location'] === 'string' &&
    Array.isArray(pet['photos']) &&
    typeof pet['description'] === 'string'
  );
}

/**
 * 都道府県データの型ガード
 */
export function isPrefecturesData(
  obj: Record<string, unknown>
): obj is { prefectures: string[] } {
  return (
    Array.isArray(obj['prefectures']) &&
    obj['prefectures'].every(item => typeof item === 'string')
  );
}

/**
 * 統計データの型ガード
 */
export function isStatsData(obj: Record<string, unknown>): obj is Record<string, unknown> & StatsData {
  return (
    typeof obj['total'] === 'number' &&
    typeof obj['cats'] === 'number' &&
    typeof obj['dogs'] === 'number' &&
    typeof obj['last_updated'] === 'string'
  );
}

/**
 * 統計データの部分的な型ガード（last_updatedがオプショナル）
 */
export function isPartialStatsData(
  obj: Record<string, unknown>
): obj is Omit<StatsData, 'last_updated'> & { last_updated?: string } {
  return (
    typeof obj['total'] === 'number' &&
    typeof obj['cats'] === 'number' &&
    typeof obj['dogs'] === 'number' &&
    (obj['last_updated'] === undefined || typeof obj['last_updated'] === 'string')
  );
}