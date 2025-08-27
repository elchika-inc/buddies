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

// ローカルデータ専用ローダー（互換性維持）
export class LocalDataStrategy extends DataLoadingStrategy {
  private loader: SimpleDataLoader;

  constructor() {
    super('local');
    // ダミーのAPIサービスを渡し、フォールバック無効にして純粋ローカル動作
    this.loader = new SimpleDataLoader(
      {} as PetApiService, 
      { useLocalAsFallback: false }
    );
  }
  
  async loadPetData(petType: 'dog' | 'cat', params: PaginationParams): Promise<LoadingResult> {
    // SimpleDataLoaderのローカル実装を直接呼び出し
    return this.loader.loadFromLocal(petType, params);
  }
  
  async loadLocationData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    return this.loader.loadLocationFromLocal(petType);
  }
  
  async loadRegionData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    return this.loader.loadRegionFromLocal(petType);
  }
}

// API専用ローダー（互換性維持） 
export class ApiDataStrategy extends DataLoadingStrategy {
  private loader: SimpleDataLoader;
  
  constructor(apiService: PetApiService) {
    super('api');
    this.loader = new SimpleDataLoader(apiService, { useLocalAsFallback: false });
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

// ハイブリッドローダー（互換性維持）
export class HybridDataStrategy extends DataLoadingStrategy {
  private loader: SimpleDataLoader;
  
  constructor(apiService: PetApiService) {
    super('hybrid');
    this.loader = new SimpleDataLoader(apiService, { useLocalAsFallback: true });
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