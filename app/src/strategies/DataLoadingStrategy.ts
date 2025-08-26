// データローディングの戦略パターン実装
import { Pet } from '@/types/pet';
import { PetApiService } from '@/services/PetApiService';
import { LegacyPetListResponse, LegacyPrefecturesResponse } from '@/services/ResponseTransformer';

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
  abstract loadLocationData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>>;
  
  // リージョンデータ読み込みの抽象メソッド
  abstract loadRegionData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>>;
  
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
  
  async loadLocationData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    if (petType === 'dog') {
      const { locations } = await import('@/data/dog/locations');
      return locations as unknown as Record<string, string[]>;
    } else {
      const { locations } = await import('@/data/cat/locations');
      return locations as unknown as Record<string, string[]>;
    }
  }
  
  async loadRegionData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    if (petType === 'dog') {
      const { regions } = await import('@/data/dog/regions');
      return regions as unknown as Record<string, string[]>;
    } else {
      const { regions } = await import('@/data/cat/regions');
      return regions as unknown as Record<string, string[]>;
    }
  }
  
  private applyFilters(data: Pet[], filters: Record<string, unknown>): Pet[] {
    return data.filter(pet => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined) return true;
        
        const petValue = (pet as unknown as Record<string, unknown>)[key];
        return petValue === value;
      });
    });
  }
}

// APIデータローディング戦略  
export class ApiDataStrategy extends DataLoadingStrategy {
  private apiService: PetApiService;
  
  constructor(apiService: PetApiService) {
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
      
      let response: LegacyPetListResponse;
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
  
  async loadLocationData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    // APIからロケーションデータを取得する実装
    const prefecturesResponse = await this.apiService.getPrefectures();
    // LegacyPrefecturesResponseをRecord<string, string[]>に変換
    const result: Record<string, string[]> = {};
    if (prefecturesResponse.prefectures) {
      // prefecturesはstring[]なので、都道府県名のみをキーとして使用
      prefecturesResponse.prefectures.forEach((prefName: string) => {
        result[prefName] = [];
      });
    }
    return result;
  }
  
  async loadRegionData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    // APIからリージョンデータを取得する実装
    // 現在のAPIにはリージョンエンドポイントがないため、ローカルデータにフォールバック
    const localStrategy = new LocalDataStrategy();
    return localStrategy.loadRegionData(petType);
  }
  
  private transformApiPet(apiPet: unknown): Pet {
    const pet = apiPet as Record<string, unknown>;
    return {
      ...pet,
      imageUrl: (pet.image_url || pet.imageUrl || '') as string,
      medicalInfo: (pet.medical_info || pet.medicalInfo || '') as string,
      careRequirements: (pet.care_requirements || pet.careRequirements || []) as string[],
      shelterName: (pet.shelter_name || pet.shelterName || '') as string,
      shelterContact: (pet.shelter_contact || pet.shelterContact || '') as string,
      adoptionFee: (pet.adoption_fee || pet.adoptionFee || 0) as number,
      isNeutered: (pet.is_neutered || pet.isNeutered || false) as boolean,
      isVaccinated: (pet.is_vaccinated || pet.isVaccinated || false) as boolean,
      createdAt: (pet.created_at || pet.createdAt || '') as string,
      sourceUrl: (pet.source_url || pet.sourceUrl) as string
    } as Pet;
  }
}

// ハイブリッドデータローディング戦略（APIフォールバック付き）
export class HybridDataStrategy extends DataLoadingStrategy {
  private apiStrategy: ApiDataStrategy;
  private localStrategy: LocalDataStrategy;
  
  constructor(apiService: PetApiService) {
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
  
  async loadLocationData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    try {
      return await this.apiStrategy.loadLocationData(petType);
    } catch (error) {
      console.warn('API location loading failed, falling back to local data:', error);
      return await this.localStrategy.loadLocationData(petType);
    }
  }
  
  async loadRegionData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    try {
      return await this.apiStrategy.loadRegionData(petType);
    } catch (error) {
      console.warn('API region loading failed, falling back to local data:', error);
      return await this.localStrategy.loadRegionData(petType);
    }
  }
}