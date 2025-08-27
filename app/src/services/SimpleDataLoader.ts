/**
 * シンプルなデータローダー
 * 
 * 戦略パターンを削除し、直線的な処理にリファクタリング
 * APIが失敗した場合のフォールバック機能付き
 */

import { Pet } from '@/types/pet';
import { PetApiService } from '@/services/PetApiService';
import { LegacyPetListResponse, LegacyPrefecturesResponse } from '@/services/ResponseTransformer';
import { LocationData, RegionData, ensureLocationData, ensureRegionData } from '@/types/locations';

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

export interface LoaderConfig {
  useLocalAsFallback: boolean;
  timeoutMs?: number;
}

export class SimpleDataLoader {
  constructor(
    private apiService: PetApiService,
    private config: LoaderConfig = { useLocalAsFallback: true, timeoutMs: 5000 }
  ) {}

  /**
   * ペットデータを読み込み
   */
  async loadPetData(
    petType: 'dog' | 'cat', 
    params: PaginationParams
  ): Promise<LoadingResult> {
    try {
      return await this.loadFromApi(petType, params);
    } catch (error) {
      console.warn(`API loading failed for ${petType}:`, error);
      
      if (this.config.useLocalAsFallback) {
        return this.loadFromLocal(petType, params);
      }
      
      throw error;
    }
  }

  /**
   * 地域データを読み込み
   */
  async loadLocationData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    try {
      return await this.loadLocationFromApi();
    } catch (error) {
      console.warn('API location loading failed:', error);
      
      if (this.config.useLocalAsFallback) {
        return this.loadLocationFromLocal(petType);
      }
      
      return {};
    }
  }

  /**
   * リージョンデータを読み込み
   */
  async loadRegionData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    // 現在APIにリージョンエンドポイントがないため、ローカルから読み込み
    return this.loadRegionFromLocal(petType);
  }

  /**
   * APIからペットデータを取得
   */
  async loadFromApi(
    petType: 'dog' | 'cat', 
    params: PaginationParams
  ): Promise<LoadingResult> {
    const apiParams = {
      limit: params.limit,
      offset: params.offset,
      ...params.filters
    };

    const response: LegacyPetListResponse = petType === 'cat' 
      ? await this.apiService.getCats(apiParams)
      : await this.apiService.getDogs(apiParams);

    const pets = (response.pets || response[`${petType}s`] || [])
      .map(this.transformApiPet);

    return {
      data: pets,
      hasMore: response.pagination?.hasMore || false,
      total: response.pagination?.total || 0
    };
  }

  /**
   * ローカルからペットデータを取得
   */
  async loadFromLocal(
    petType: 'dog' | 'cat', 
    params: PaginationParams
  ): Promise<LoadingResult> {
    let allData: Pet[] = [];
    
    if (petType === 'dog') {
      const { mockDogs } = await import('@/data/dog/dogs');
      allData = mockDogs;
    } else {
      const { cats } = await import('@/data/cat/cats');
      allData = cats;
    }
    
    // フィルタリング
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

  /**
   * APIから地域データを取得
   */
  async loadLocationFromApi(): Promise<Record<string, string[]>> {
    const prefecturesResponse = await this.apiService.getPrefectures();
    const result: Record<string, string[]> = {};
    
    if (prefecturesResponse.prefectures) {
      prefecturesResponse.prefectures.forEach((prefName: string) => {
        result[prefName] = [];
      });
    }
    
    return result;
  }

  /**
   * ローカルから地域データを取得
   */
  async loadLocationFromLocal(petType: 'dog' | 'cat'): Promise<LocationData> {
    if (petType === 'dog') {
      const { locations } = await import('@/data/dog/locations');
      return ensureLocationData(locations);
    } else {
      const { locations } = await import('@/data/cat/locations');
      return ensureLocationData(locations);
    }
  }

  /**
   * ローカルからリージョンデータを取得
   */
  async loadRegionFromLocal(petType: 'dog' | 'cat'): Promise<RegionData> {
    if (petType === 'dog') {
      const { regions } = await import('@/data/dog/regions');
      return ensureRegionData(regions);
    } else {
      const { regions } = await import('@/data/cat/regions');
      return ensureRegionData(regions);
    }
  }

  /**
   * フィルターを適用
   */
  private applyFilters(data: Pet[], filters: Record<string, unknown>): Pet[] {
    return data.filter(pet => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined) return true;
        
        const petValue = (pet as unknown as Record<string, unknown>)[key];
        return petValue === value;
      });
    });
  }

  /**
   * APIペットデータを変換
   */
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

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<LoaderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): LoaderConfig {
    return { ...this.config };
  }
}