// ペットAPI操作のビジネスロジックを担当するサービス
import { Pet, Dog, Cat } from '@/types/pet';
import { ApiClient } from './ApiClient';
import { 
  ResponseTransformer, 
  LegacyPetListResponse, 
  LegacySinglePetResponse,
  LegacyPrefecturesResponse,
  LegacyStatsResponse
} from './ResponseTransformer';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
const USE_SAMPLE_DATA = process.env.NEXT_PUBLIC_USE_SAMPLE_DATA === 'true';

export interface PaginationParams {
  limit?: number;
  offset?: number;
  prefecture?: string;
}

// ペットAPI操作を統合するサービス
export class PetApiService {
  private apiClient: ApiClient;
  private responseTransformer: ResponseTransformer;
  
  constructor() {
    this.apiClient = new ApiClient({
      baseUrl: API_BASE_URL,
      timeout: 10000,
    });
    this.responseTransformer = new ResponseTransformer();
  }

  // 猫データ取得
  async getCats(params: PaginationParams = {}): Promise<LegacyPetListResponse> {
    const { limit = 10, offset = 0, prefecture } = params;
    
    if (USE_SAMPLE_DATA) {
      const queryParams: Record<string, string> = {
        limit: limit.toString(),
        offset: offset.toString(),
      };
      
      if (prefecture) {
        queryParams.prefecture = prefecture;
      }
      
      const response = await this.apiClient.get<LegacyPetListResponse>('/api/sample/cats', queryParams);
      return response.data;
    } else {
      // 新しいAPI形式：offsetをpageに変換
      const page = Math.floor(offset / limit) + 1;
      const queryParams: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      };
      
      if (prefecture) {
        queryParams.prefecture = prefecture;
      }
      
      const response = await this.apiClient.get('/api/pets/cat', queryParams);
      return this.responseTransformer.transformToLegacyFormat(response.data) as LegacyPetListResponse;
    }
  }
  
  // 特定の猫データ取得
  async getCatById(id: string): Promise<LegacySinglePetResponse> {
    const endpoint = USE_SAMPLE_DATA
      ? `/api/sample/cats/${id}`
      : `/api/pets/cat/${id}`;
      
    const response = await this.apiClient.get<LegacySinglePetResponse>(endpoint);
    return response.data;
  }

  // 犬データ取得
  async getDogs(params: PaginationParams = {}): Promise<LegacyPetListResponse> {
    const { limit = 10, offset = 0, prefecture } = params;
    
    if (USE_SAMPLE_DATA) {
      const queryParams: Record<string, string> = {
        limit: limit.toString(),
        offset: offset.toString(),
      };
      
      if (prefecture) {
        queryParams.prefecture = prefecture;
      }
      
      const response = await this.apiClient.get<LegacyPetListResponse>('/api/sample/dogs', queryParams);
      return response.data;
    } else {
      // 新しいAPI形式：offsetをpageに変換
      const page = Math.floor(offset / limit) + 1;
      const queryParams: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      };
      
      if (prefecture) {
        queryParams.prefecture = prefecture;
      }
      
      const response = await this.apiClient.get('/api/pets/dog', queryParams);
      return this.responseTransformer.transformToLegacyFormat(response.data) as LegacyPetListResponse;
    }
  }
  
  // 特定の犬データ取得
  async getDogById(id: string): Promise<LegacySinglePetResponse> {
    const endpoint = USE_SAMPLE_DATA
      ? `/api/sample/dogs/${id}`
      : `/api/pets/dog/${id}`;
      
    const response = await this.apiClient.get<LegacySinglePetResponse>(endpoint);
    return response.data;
  }
  
  // 都道府県一覧取得
  async getPrefectures(): Promise<LegacyPrefecturesResponse> {
    const endpoint = USE_SAMPLE_DATA
      ? '/api/sample/prefectures'
      : '/api/prefectures';
      
    const response = await this.apiClient.get<LegacyPrefecturesResponse>(endpoint);
    return response.data;
  }
  
  // 統計情報取得
  async getStats(): Promise<LegacyStatsResponse> {
    const endpoint = USE_SAMPLE_DATA
      ? '/api/sample/stats'
      : '/api/stats';
      
    const response = await this.apiClient.get<LegacyStatsResponse>(endpoint);
    return response.data;
  }
}