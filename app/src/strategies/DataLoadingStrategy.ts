// データローディングの戦略パターン実装
import { Pet } from '@/types/pet';

// データローディングの結果型
export interface LoadingResult<T = Pet> {
  data: T[];
  hasMore: boolean;
  total: number;
}

// ページネーション情報
export interface PaginationParams {
  offset: number;
  limit: number;
  filters?: Record<string, unknown>;
}

// データソースの種類
export type DataSourceType = 'api' | 'local' | 'hybrid';

// データローディング戦略の抽象基底クラス
export abstract class DataLoadingStrategy {
  protected sourceType: DataSourceType;
  
  constructor(sourceType: DataSourceType) {
    this.sourceType = sourceType;
  }
  
  // データ読み込みの抽象メソッド
  abstract loadPetData(
    petType: 'dog' | 'cat', 
    params: PaginationParams
  ): Promise<LoadingResult>;
  
  // 地域データ読み込みの抽象メソッド  
  abstract loadLocationData(petType: 'dog' | 'cat'): Promise<unknown>;
  
  // リージョンデータ読み込みの抽象メソッド
  abstract loadRegionData(petType: 'dog' | 'cat'): Promise<unknown>;
  
  // 戦略の識別子
  getStrategyType(): DataSourceType {
    return this.sourceType;
  }
}

// ローカルデータローディング戦略
export class LocalDataStrategy extends DataLoadingStrategy {
  constructor() {
    super('local');
  }
  
  async loadPetData(petType: 'dog' | 'cat', params: PaginationParams): Promise<LoadingResult> {
    let allData: Pet[] = [];
    
    if (petType === 'dog') {
      const { mockDogs } = await import('@/data/dog/dogs');
      allData = mockDogs;
    } else {
      const { cats } = await import('@/data/cat/cats');
      allData = cats;
    }
    
    // フィルタリング処理
    if (params.filters) {
      allData = this.applyFilters(allData, params.filters);
    }
    
    const { offset, limit } = params;
    const data = allData.slice(offset, offset + limit);
    
    return {
      data,
      hasMore: offset + limit < allData.length,
      total: allData.length
    };
  }
  
  async loadLocationData(petType: 'dog' | 'cat') {
    if (petType === 'dog') {
      const { locations } = await import('@/data/dog/locations');
      return locations;
    } else {
      const { locations } = await import('@/data/cat/locations');
      return locations;
    }
  }
  
  async loadRegionData(petType: 'dog' | 'cat') {
    if (petType === 'dog') {
      const { regions } = await import('@/data/dog/regions');
      return regions;
    } else {
      const { regions } = await import('@/data/cat/regions');
      return regions;
    }
  }
  
  private applyFilters(data: Pet[], filters: Record<string, unknown>): Pet[] {
    return data.filter(pet => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined) return true;
        
        const petValue = (pet as any)[key];
        return petValue === value;
      });
    });
  }
}

// APIデータローディング戦略  
export class ApiDataStrategy extends DataLoadingStrategy {
  private apiService: any;
  
  constructor(apiService: any) {
    super('api');
    this.apiService = apiService;
  }
  
  async loadPetData(petType: 'dog' | 'cat', params: PaginationParams): Promise<LoadingResult> {
    try {
      const apiParams = {
        limit: params.limit,
        offset: params.offset,
        ...params.filters
      };
      
      let response: any;
      if (petType === 'cat') {
        response = await this.apiService.getCats(apiParams);
      } else {
        response = await this.apiService.getDogs(apiParams);
      }
      
      const pets = (response.pets || response[`${petType}s`] || []).map(this.transformApiPet);
      
      return {
        data: pets,
        hasMore: response.pagination?.hasMore || false,
        total: response.pagination?.total || 0
      };
    } catch (error) {
      throw new Error(`API loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async loadLocationData(petType: 'dog' | 'cat') {
    // APIからロケーションデータを取得する実装
    return this.apiService.getPrefectures();
  }
  
  async loadRegionData(petType: 'dog' | 'cat') {
    // APIからリージョンデータを取得する実装
    return this.apiService.getRegions?.() || [];
  }
  
  private transformApiPet(apiPet: any): Pet {
    return {
      ...apiPet,
      imageUrl: apiPet.image_url || apiPet.imageUrl || '',
      medicalInfo: apiPet.medical_info || apiPet.medicalInfo || '',
      careRequirements: apiPet.care_requirements || apiPet.careRequirements || [],
      shelterName: apiPet.shelter_name || apiPet.shelterName || '',
      shelterContact: apiPet.shelter_contact || apiPet.shelterContact || '',
      adoptionFee: apiPet.adoption_fee || apiPet.adoptionFee || 0,
      isNeutered: apiPet.is_neutered || apiPet.isNeutered || false,
      isVaccinated: apiPet.is_vaccinated || apiPet.isVaccinated || false,
      createdAt: apiPet.created_at || apiPet.createdAt || '',
      sourceUrl: apiPet.source_url || apiPet.sourceUrl
    };
  }
}

// ハイブリッドデータローディング戦略（APIフォールバック付き）
export class HybridDataStrategy extends DataLoadingStrategy {
  private apiStrategy: ApiDataStrategy;
  private localStrategy: LocalDataStrategy;
  
  constructor(apiService: any) {
    super('hybrid');
    this.apiStrategy = new ApiDataStrategy(apiService);
    this.localStrategy = new LocalDataStrategy();
  }
  
  async loadPetData(petType: 'dog' | 'cat', params: PaginationParams): Promise<LoadingResult> {
    try {
      // まずAPIからの取得を試行
      return await this.apiStrategy.loadPetData(petType, params);
    } catch (error) {
      console.warn('API loading failed, falling back to local data:', error);
      // APIが失敗した場合はローカルデータにフォールバック
      return await this.localStrategy.loadPetData(petType, params);
    }
  }
  
  async loadLocationData(petType: 'dog' | 'cat') {
    try {
      return await this.apiStrategy.loadLocationData(petType);
    } catch (error) {
      console.warn('API location loading failed, falling back to local data:', error);
      return await this.localStrategy.loadLocationData(petType);
    }
  }
  
  async loadRegionData(petType: 'dog' | 'cat') {
    try {
      return await this.apiStrategy.loadRegionData(petType);
    } catch (error) {
      console.warn('API region loading failed, falling back to local data:', error);
      return await this.localStrategy.loadRegionData(petType);
    }
  }
}