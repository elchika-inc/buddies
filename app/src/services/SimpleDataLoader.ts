/**
 * シンプルなデータローダー
 * 
 * 戦略パターンを削除し、直線的な処理にリファクタリング
 * APIが失敗した場合のフォールバック機能付き
 */

import { Pet } from '@/types/pet';
import { PetApiService } from '@/services/PetApiService';
import { LegacyPetListResponse, LegacyPrefecturesResponse } from '@/services/ResponseTransformer';
import { RegionData, ensureRegionData } from '@/types/locations';

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
  timeoutMs?: number;
}

export class SimpleDataLoader {
  constructor(
    private apiService: PetApiService,
    private config: LoaderConfig = { timeoutMs: 5000 }
  ) {}

  /**
   * ペットデータを読み込み
   */
  async loadPetData(
    petType: 'dog' | 'cat', 
    params: PaginationParams
  ): Promise<LoadingResult> {
    return await this.loadFromApi(petType, params);
  }

  /**
   * 地域データを読み込み
   */
  async loadLocationData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    try {
      return await this.loadLocationFromApi();
    } catch (error) {
      console.warn('API location loading failed:', error);
      return {};
    }
  }

  /**
   * リージョンデータを読み込み
   */
  async loadRegionData(petType: 'dog' | 'cat'): Promise<Record<string, string[]>> {
    // 現在APIにリージョンエンドポイントがないため、空を返す
    // 将来的にAPIで実装する際にはここを更新
    if (petType === 'dog') {
      const { regions } = await import('@/data/dog/regions');
      return ensureRegionData(regions);
    } else {
      const { regions } = await import('@/data/cat/regions');
      return ensureRegionData(regions);
    }
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