// API service for fetching pet data
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
const USE_SAMPLE_DATA = process.env.NEXT_PUBLIC_USE_SAMPLE_DATA === 'true';

interface PaginationParams {
  limit?: number;
  offset?: number;
  prefecture?: string;
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
    details?: any;
  };
}

// レガシー形式（後方互換性のため）
interface LegacyApiResponse<T> {
  pets?: T[];
  cats?: T[];
  cat?: T;
  dogs?: T[];
  dog?: T;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  prefectures?: string[];
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
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // 新しい統一形式の場合、dataプロパティを展開
      if (useUnified && data.success !== undefined) {
        const unifiedResponse = data as UnifiedApiResponse<any>;
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

  private convertToLegacyFormat(unifiedResponse: UnifiedApiResponse<any>): LegacyApiResponse<any> {
    const { data, meta } = unifiedResponse;
    
    // ペットデータの場合
    if (data.pets) {
      return {
        pets: data.pets,
        pagination: meta ? {
          limit: meta.limit || 20,
          offset: ((meta.page || 1) - 1) * (meta.limit || 20),
          total: meta.total || 0,
          hasMore: meta.hasMore || false
        } : undefined
      };
    }
    
    // 単一ペットデータの場合
    if (data.type) {
      const key = data.type === 'dog' ? 'dog' : 'cat';
      return { [key]: data };
    }
    
    // その他のデータ
    return data;
  }
  
  // 猫データ取得
  async getCats(params: PaginationParams = {}) {
    const { limit = 10, offset = 0, prefecture } = params;
    
    if (USE_SAMPLE_DATA) {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(prefecture && { prefecture })
      });
      const endpoint = `/api/sample/cats?${queryParams}`;
      return this.fetchApi<LegacyApiResponse<any>>(endpoint, false);
    } else {
      // 新しいAPI形式：offsetをpageに変換
      const page = Math.floor(offset / limit) + 1;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(prefecture && { prefecture })
      });
      const endpoint = `/pets/cat?${queryParams}`;
      return this.fetchApi<LegacyApiResponse<any>>(endpoint, true);
    }
  }
  
  // 特定の猫データ取得
  async getCatById(id: string) {
    const endpoint = USE_SAMPLE_DATA
      ? `/api/sample/cats/${id}`
      : `/pets/cat/${id}`;
      
    return this.fetchApi<{ cat: any }>(endpoint);
  }
  
  // 都道府県一覧取得
  async getPrefectures() {
    const endpoint = USE_SAMPLE_DATA
      ? '/api/sample/prefectures'
      : '/prefectures';
      
    return this.fetchApi<{ prefectures: string[] }>(endpoint);
  }
  
  // 統計情報取得
  async getStats() {
    const endpoint = USE_SAMPLE_DATA
      ? '/api/sample/stats'
      : '/stats';
      
    return this.fetchApi<{
      total: number;
      cats: number;
      dogs: number;
      last_updated: string;
    }>(endpoint);
  }
  
  // 犬データ取得
  async getDogs(params: PaginationParams = {}) {
    const { limit = 10, offset = 0, prefecture } = params;
    
    if (USE_SAMPLE_DATA) {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(prefecture && { prefecture })
      });
      const endpoint = `/api/sample/dogs?${queryParams}`;
      return this.fetchApi<LegacyApiResponse<any>>(endpoint, false);
    } else {
      // 新しいAPI形式：offsetをpageに変換
      const page = Math.floor(offset / limit) + 1;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(prefecture && { prefecture })
      });
      const endpoint = `/pets/dog?${queryParams}`;
      return this.fetchApi<LegacyApiResponse<any>>(endpoint, true);
    }
  }
  
  // 特定の犬データ取得
  async getDogById(id: string) {
    const endpoint = USE_SAMPLE_DATA
      ? `/api/sample/dogs/${id}`
      : `/pets/dog/${id}`;
      
    return this.fetchApi<{ dog: any }>(endpoint);
  }
}

export const petApi = new PetApiService();
export default petApi;