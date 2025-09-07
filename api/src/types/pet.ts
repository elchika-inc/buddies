/**
 * API用ペット型定義
 * 共通型を拡張してAPI固有の型を定義
 */

import type { Pet, PetRecord, PetSearchFilters, SortOptions } from '../../../types/shared';

/**
 * API固有のペット型（必要に応じて拡張）
 */
export interface ApiPet extends Pet {
  // API固有のフィールドがあれば追加
}

/**
 * APIリクエスト型
 */
export interface CreatePetRequest {
  type: 'dog' | 'cat';
  name: string;
  breed?: string;
  age?: string;
  gender?: 'male' | 'female' | 'unknown';
  location?: string;
  description?: string;
  imageUrl?: string;
  personality?: string[] | string;
  careRequirements?: string[] | string;
  adoptionFee?: number;
  isNeutered?: boolean;
  isVaccinated?: boolean;
  healthStatus?: string;
  size?: string;
  weight?: number;
  color?: string;
  sourceId?: string;
  sourceUrl?: string;
}

export interface UpdatePetRequest extends Partial<CreatePetRequest> {
  // 更新時は全フィールドがオプショナル
}

/**
 * API用検索パラメータ
 */
export interface SearchPetsParams {
  filters?: PetSearchFilters;
  sort?: SortOptions;
  page?: number;
  limit?: number;
}

/**
 * 統計情報型
 */
export interface PetStatistics {
  totalPets: number;
  dogCount: number;
  catCount: number;
  withImages: number;
  withoutImages: number;
  neuteredCount: number;
  vaccinatedCount: number;
  lastUpdated: string;
}

// 型の再エクスポート
export type { Pet, PetRecord, PetSearchFilters, SortOptions } from '../../../types/shared';
export { TypeGuards, TypeConverters } from '../../../types/shared';