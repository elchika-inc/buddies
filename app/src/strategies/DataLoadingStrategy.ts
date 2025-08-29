/**
 * データローディング戦略（リファクタ済み）
 * 
 * 複雑な戦略パターンをSimpleDataLoaderに統合し、シンプル化
 * 既存コードとの互換性のためファサードパターンを使用
 */
import { Pet } from '@/types/pet';
import { PetApiService } from '@/services/PetApiService';
import { SimpleDataLoader } from '@/services/SimpleDataLoader';

// 既存のインターフェースをエクスポート（互換性維持）
export interface LoadingResult<T = Pet> {
  data: T[];
  hasMore: boolean;
  total: number;
}

export interface PaginationParams {
  offset: number;
  limit: number;
  filters?: Record<string, unknown>;
}

// 旧戦略タイプ（互換性のため）
export type DataSourceType = 'api' | 'local' | 'hybrid';

/**
 * 互換性のための基底クラス（非推奨）
 * 新しいコードでは SimpleDataLoader を直接使用することを推奨
 * @deprecated Use SimpleDataLoader instead
 */
export abstract class DataLoadingStrategy {
  protected sourceType: DataSourceType;
  
  constructor(sourceType: DataSourceType) {
    this.sourceType = sourceType;
  }
  
  abstract loadPetData(
    petType: 'dog' | 'cat', 
    params: PaginationParams
  ): Promise<LoadingResult>;
  
  abstract loadLocationData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>>;
  
  abstract loadRegionData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>>;
  
  getStrategyType(): DataSourceType {
    return this.sourceType;
  }
}

/**
 * 互換性のためのラッパークラス（非推奨）
 * 新しい実装では SimpleDataLoader を直接使用してください
 */

// ローカルデータ専用ローダー（互換性維持 - 非推奨）
export class LocalDataStrategy extends DataLoadingStrategy {
  constructor() {
    super('local');
  }
  
  async loadPetData(petType: 'dog' | 'cat', params: PaginationParams): Promise<LoadingResult> {
    // ローカルデータが削除されたため、空の結果を返す
    return {
      data: [],
      hasMore: false,
      total: 0
    };
  }
  
  async loadLocationData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    return {};
  }
  
  async loadRegionData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    // リージョンデータは残す
    if (petType === 'dog') {
      const { regions } = await import('@/data/dog/regions');
      // readonlyを解除してmutableな形式に変換
      const mutableRegions: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(regions)) {
        mutableRegions[key] = [...value];
      }
      return mutableRegions;
    } else {
      const { regions } = await import('@/data/cat/regions');
      // readonlyを解除してmutableな形式に変換
      const mutableRegions: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(regions)) {
        mutableRegions[key] = [...value];
      }
      return mutableRegions;
    }
  }
}

// API専用ローダー（互換性維持） 
export class ApiDataStrategy extends DataLoadingStrategy {
  private loader: SimpleDataLoader;
  
  constructor(apiService: PetApiService) {
    super('api');
    this.loader = new SimpleDataLoader(apiService);
  }
  
  async loadPetData(petType: 'dog' | 'cat', params: PaginationParams): Promise<LoadingResult> {
    return this.loader.loadFromApi(petType, params);
  }
  
  async loadLocationData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    return this.loader.loadLocationFromApi();
  }
  
  async loadRegionData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    return this.loader.loadRegionData(petType);
  }
}

// ハイブリッドローダー（互換性維持 - APIのみ使用）
export class HybridDataStrategy extends DataLoadingStrategy {
  private loader: SimpleDataLoader;
  
  constructor(apiService: PetApiService) {
    super('hybrid');
    this.loader = new SimpleDataLoader(apiService);
  }
  
  async loadPetData(petType: 'dog' | 'cat', params: PaginationParams): Promise<LoadingResult> {
    return this.loader.loadPetData(petType, params);
  }
  
  async loadLocationData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    return this.loader.loadLocationData(petType);
  }
  
  async loadRegionData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    return this.loader.loadRegionData(petType);
  }
}