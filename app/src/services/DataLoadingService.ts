// データローディングサービス（戦略パターンのContext）
import { 
  DataLoadingStrategy, 
  LocalDataStrategy, 
  ApiDataStrategy, 
  HybridDataStrategy,
  PaginationParams,
  LoadingResult
} from '@/strategies/DataLoadingStrategy';
import { petApiService } from '@/services/index';

// 環境変数による戦略選択
const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';
const USE_SAMPLE_DATA = process.env.NEXT_PUBLIC_USE_SAMPLE_DATA === 'true';

// データローディングサービス
export class DataLoadingService {
  private strategy: DataLoadingStrategy;
  
  constructor(strategy?: DataLoadingStrategy) {
    this.strategy = strategy || this.createDefaultStrategy();
  }
  
  // デフォルト戦略の作成
  private createDefaultStrategy(): DataLoadingStrategy {
    if (USE_SAMPLE_DATA) {
      return new LocalDataStrategy();
    }
    
    if (USE_API) {
      return new ApiDataStrategy(petApiService);
    }
    
    // デフォルトはハイブリッド戦略（API + フォールバック）
    return new HybridDataStrategy(petApiService);
  }
  
  // 戦略の動的変更
  setStrategy(strategy: DataLoadingStrategy) {
    this.strategy = strategy;
  }
  
  // 現在の戦略を取得
  getStrategy() {
    return this.strategy;
  }
  
  // ペットデータの読み込み
  async loadPetData(
    petType: 'dog' | 'cat', 
    offset: number = 0, 
    limit: number = 10,
    filters?: Record<string, unknown>
  ): Promise<LoadingResult> {
    const params: PaginationParams = { offset, limit, filters: filters || {} };
    return this.strategy.loadPetData(petType, params);
  }
  
  // 地域データの読み込み  
  async loadLocationData(petType: 'dog' | 'cat') {
    return this.strategy.loadLocationData(petType);
  }
  
  // リージョンデータの読み込み
  async loadRegionData(petType: 'dog' | 'cat') {
    return this.strategy.loadRegionData(petType);
  }
  
  // 戦略タイプの取得
  getStrategyType() {
    return this.strategy.getStrategyType();
  }
}

// シングルトンインスタンス
export const dataLoadingService = new DataLoadingService();

// 既存のAPIとの互換性のための関数エクスポート
export const loadPetDataIncremental = async (
  offset: number = 0, 
  limit: number = 10,
  petType?: 'dog' | 'cat'
) => {
  // petTypeが指定されていない場合は設定から取得
  const actualPetType = petType || (await import('@/config/petConfig')).getPetType();
  return dataLoadingService.loadPetData(actualPetType, offset, limit);
};

export const loadPetData = async (petType?: 'dog' | 'cat') => {
  const actualPetType = petType || (await import('@/config/petConfig')).getPetType();
  const result = await dataLoadingService.loadPetData(actualPetType, 0, 100);
  return result.data;
};

export const loadLocations = async (petType?: 'dog' | 'cat') => {
  const actualPetType = petType || (await import('@/config/petConfig')).getPetType();
  return dataLoadingService.loadLocationData(actualPetType);
};

export const loadRegions = async (petType?: 'dog' | 'cat') => {
  const actualPetType = petType || (await import('@/config/petConfig')).getPetType();
  return dataLoadingService.loadRegionData(actualPetType);
};