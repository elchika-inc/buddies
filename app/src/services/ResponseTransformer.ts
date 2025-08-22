// APIレスポンスの変換を担当するクラス
import { Pet, Dog, Cat } from '@/types/pet';

// 統一されたAPIレスポンス形式
export interface UnifiedApiResponse<T> {
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
    details?: Array<{
      field?: string;
      code?: string;
      message?: string;
    }>;
  };
}

// レガシー形式のレスポンス型
export interface LegacyPetListResponse {
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

export interface LegacySinglePetResponse {
  cat?: Cat;
  dog?: Dog;
  error?: string;
}

export interface LegacyPrefecturesResponse {
  prefectures: string[];
  error?: string;
}

export interface LegacyStatsResponse {
  total: number;
  cats: number;
  dogs: number;
  last_updated: string;
  error?: string;
}

// APIレスポンス変換の責任を持つクラス
export class ResponseTransformer {
  
  // 統一形式からレガシー形式への変換
  transformToLegacyFormat<T>(unifiedResponse: UnifiedApiResponse<T>): unknown {
    if (!unifiedResponse.success) {
      throw new Error(unifiedResponse.error?.message || 'API request failed');
    }

    const { data, meta } = unifiedResponse;
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response data format');
    }
    
    const dataObj = data as Record<string, unknown>;
    
    // ペットリストデータの場合
    if (Array.isArray(dataObj.pets)) {
      return this.transformPetListResponse(dataObj.pets as Pet[], meta);
    }
    
    // 単一ペットデータの場合 
    if (dataObj.type === 'dog' || dataObj.type === 'cat') {
      return this.transformSinglePetResponse(dataObj as Pet);
    }
    
    // 都道府県データの場合
    if (Array.isArray(dataObj.prefectures)) {
      return this.transformPrefecturesResponse(dataObj.prefectures as string[]);
    }
    
    // 統計データの場合
    if (typeof dataObj.total === 'number' && typeof dataObj.cats === 'number') {
      return this.transformStatsResponse(dataObj as any);
    }
    
    // その他のデータはそのまま返す
    return dataObj;
  }

  private transformPetListResponse(
    pets: Pet[], 
    meta?: UnifiedApiResponse<unknown>['meta']
  ): LegacyPetListResponse {
    return {
      pets,
      pagination: meta ? {
        limit: meta.limit || 20,
        offset: ((meta.page || 1) - 1) * (meta.limit || 20),
        total: meta.total || 0,
        hasMore: meta.hasMore || false
      } : undefined
    };
  }

  private transformSinglePetResponse(pet: Pet): LegacySinglePetResponse {
    // 型ガードを使用してペットタイプを判定
    if ('size' in pet && 'exerciseLevel' in pet) {
      return { dog: pet as Dog };
    } else if ('coatLength' in pet && 'socialLevel' in pet) {
      return { cat: pet as Cat };
    }
    
    throw new Error('Unknown pet type in response');
  }

  private transformPrefecturesResponse(prefectures: string[]): LegacyPrefecturesResponse {
    return { prefectures };
  }

  private transformStatsResponse(stats: {
    total: number;
    cats: number;
    dogs: number;
    last_updated: string;
  }): LegacyStatsResponse {
    return stats;
  }

  // レガシー形式のバリデーション
  validateLegacyResponse(response: unknown): boolean {
    if (!response || typeof response !== 'object') {
      return false;
    }
    
    // 基本的なプロパティの存在をチェック
    return true; // 簡易実装、必要に応じて詳細化
  }
}