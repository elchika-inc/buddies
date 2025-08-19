// API service for fetching pet data
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
const USE_SAMPLE_DATA = process.env.NEXT_PUBLIC_USE_SAMPLE_DATA === 'true' || process.env.NODE_ENV === 'development';

interface PaginationParams {
  limit?: number;
  offset?: number;
  prefecture?: string;
}

interface ApiResponse<T> {
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
  
  private async fetchApi<T>(endpoint: string): Promise<T> {
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
      
      return response.json();
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }
  
  // 猫データ取得
  async getCats(params: PaginationParams = {}) {
    const { limit = 10, offset = 0, prefecture } = params;
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(prefecture && { prefecture })
    });
    
    const endpoint = USE_SAMPLE_DATA 
      ? `/api/sample/cats?${queryParams}`
      : `/pets/cat?${queryParams}`;
      
    return this.fetchApi<ApiResponse<any>>(endpoint);
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
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(prefecture && { prefecture })
    });
    
    const endpoint = USE_SAMPLE_DATA 
      ? `/api/sample/dogs?${queryParams}`
      : `/pets/dog?${queryParams}`;
      
    return this.fetchApi<ApiResponse<any>>(endpoint);
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