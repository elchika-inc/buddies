/**
 * API関連の型定義
 */

// APIから返されるペットデータの型
export interface ApiPetData {
  id: string;
  type: 'dog' | 'cat';
  name: string;
  sourceUrl: string;
  hasJpeg?: boolean;
  hasWebp?: boolean;
}

// Stats APIのレスポンス型
export interface ApiStatsResponse {
  success: boolean;
  data?: {
    missingImages?: ApiPetData[];
    totalCount?: number;
  };
  error?: string;
}

// 型ガード関数
export function isApiStatsResponse(obj: unknown): obj is ApiStatsResponse {
  if (!obj || typeof obj !== 'object') return false;
  
  const response = obj as Record<string, unknown>;
  
  // successフィールドは必須
  if (typeof response['success'] !== 'boolean') return false;
  
  // dataフィールドがある場合の検証
  if (response['data'] !== undefined) {
    if (typeof response['data'] !== 'object' || response['data'] === null) return false;
    
    const data = response['data'] as Record<string, unknown>;
    
    // missingImagesがある場合、配列であることを確認
    if (data['missingImages'] !== undefined && !Array.isArray(data['missingImages'])) {
      return false;
    }
    
    // totalCountがある場合、数値であることを確認
    if (data['totalCount'] !== undefined && typeof data['totalCount'] !== 'number') {
      return false;
    }
  }
  
  // errorフィールドがある場合、文字列であることを確認
  if (response['error'] !== undefined && typeof response['error'] !== 'string') {
    return false;
  }
  
  return true;
}

export function isApiPetData(obj: unknown): obj is ApiPetData {
  if (!obj || typeof obj !== 'object') return false;
  
  const record = obj as Record<string, unknown>;
  
  return typeof record['id'] === 'string' &&
         (record['type'] === 'dog' || record['type'] === 'cat') &&
         typeof record['name'] === 'string' &&
         typeof record['sourceUrl'] === 'string' &&
         (record['hasJpeg'] === undefined || typeof record['hasJpeg'] === 'boolean') &&
         (record['hasWebp'] === undefined || typeof record['hasWebp'] === 'boolean');
}