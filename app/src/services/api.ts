import { Pet, Dog, Cat } from '@/types/pet';

// API service for fetching pet data
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface PaginationParams {
  limit?: number;
  offset?: number;
  prefecture?: string;
}

// APIエラー詳細情報の型定義
interface ApiErrorDetails {
  field?: string;
  code?: string;
  message?: string;
}

// 新しい統一されたAPI形式
interface UnifiedApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasMore?: boolean;
  };
  timestamp: string;
  error?: {
    message: string;
    code: string;
    details?: ApiErrorDetails[];
  };
}

// レガシー形式（後方互換性のため）
interface LegacyPetListResponse {
  pets?: Pet[];
  cats?: Cat[];
  dogs?: Dog[];
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  error?: string;
}

interface LegacySinglePetResponse {
  cat?: Cat;
  dog?: Dog;
  error?: string;
}

interface LegacyPrefecturesResponse {
  prefectures: string[];
  error?: string;
}

interface LegacyStatsResponse {
  total: number;
  cats: number;
  dogs: number;
  last_updated: string;
  error?: string;
}

class PetApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = API_BASE_URL;
  }
  
  private async fetchApi<T>(endpoint: string, useUnified: boolean = true): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        // キャッシュを完全に無効化
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // 新しい統一形式の場合、dataプロパティを展開
      if (useUnified && data.success !== undefined) {
        const unifiedResponse = data as UnifiedApiResponse<unknown>;
        if (!unifiedResponse.success) {
          throw new Error(unifiedResponse.error?.message || 'API request failed');
        }
        // レガシー形式に変換して返す（後方互換性のため）
        return this.convertToLegacyFormat(unifiedResponse) as T;
      }
      
      return data;
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }

  private convertToLegacyFormat(unifiedResponse: UnifiedApiResponse<unknown>): unknown {
    const { data, meta } = unifiedResponse;
    
    // データが不正な場合はエラー
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response data format');
    }
    
    const dataObj = data as Record<string, unknown>;
    
    // ペットリストデータの場合
    if (Array.isArray(dataObj.pets)) {
      return {
        pets: dataObj.pets,
        pagination: meta ? {
          limit: meta.limit || 20,
          offset: ((meta.page || 1) - 1) * (meta.limit || 20),
          total: meta.total || 0,
          hasMore: meta.hasMore || false
        } : undefined
      } as LegacyPetListResponse;
    }
    
    // 単一ペットデータの場合 
    if (dataObj.type === 'dog' || dataObj.type === 'cat') {
      const key = dataObj.type;
      return { [key]: dataObj } as LegacySinglePetResponse;
    }
    
    // その他のデータ
    return dataObj;
  }
  
  // 猫データ取得
  async getCats(params: PaginationParams = {}): Promise<LegacyPetListResponse> {
    const { limit = 10, offset = 0, prefecture } = params;
    
    // 新しいAPI形式：offsetをpageに変換
    const page = Math.floor(offset / limit) + 1;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(prefecture && { prefecture })
    });
    const endpoint = `/api/pets/cat?${queryParams}`;
    return this.fetchApi<LegacyPetListResponse>(endpoint, true);
  }
  
  // 特定の猫データ取得
  async getCatById(id: string): Promise<LegacySinglePetResponse> {
    const endpoint = `/api/pets/cat/${id}`;
      
    return this.fetchApi<LegacySinglePetResponse>(endpoint);
  }
  
  // 都道府県一覧取得
  async getPrefectures(): Promise<LegacyPrefecturesResponse> {
    const endpoint = '/api/prefectures';
      
    return this.fetchApi<LegacyPrefecturesResponse>(endpoint);
  }
  
  // 統計情報取得
  async getStats(): Promise<LegacyStatsResponse> {
    const endpoint = '/api/stats';
      
    return this.fetchApi<LegacyStatsResponse>(endpoint);
  }
  
  // 犬データ取得
  async getDogs(params: PaginationParams = {}): Promise<LegacyPetListResponse> {
    const { limit = 10, offset = 0, prefecture } = params;
    
    // 新しいAPI形式：offsetをpageに変換
    const page = Math.floor(offset / limit) + 1;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(prefecture && { prefecture })
    });
    const endpoint = `/api/pets/dog?${queryParams}`;
    return this.fetchApi<LegacyPetListResponse>(endpoint, true);
  }
  
  // 特定の犬データ取得
  async getDogById(id: string): Promise<LegacySinglePetResponse> {
    const endpoint = `/api/pets/dog/${id}`;
      
    return this.fetchApi<LegacySinglePetResponse>(endpoint);
  }
}

export const petApi = new PetApiService();
export default petApi;