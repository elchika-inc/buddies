// APIレスポンスの変換を担当するクラス（レガシー互換性のために保持）
import { Pet } from '@/types/pet';
import {
  UnifiedApiResponse,
  LegacyResponse
} from '@/types/api';
import { transformToLegacyFormat, validateLegacyResponse } from '@/utils/transformers/responseTransformer';

/**
 * @deprecated 新しい実装は /utils/transformers/responseTransformer.ts を使用してください
 * このクラスは既存コードとの互換性のために保持されています
 */
export class ResponseTransformer {
  
  // 統一形式からレガシー形式への変換
  transformToLegacyFormat<T>(unifiedResponse: UnifiedApiResponse<T>): LegacyResponse {
    return transformToLegacyFormat(unifiedResponse);
  }

  // レガシー形式のバリデーション
  validateLegacyResponse(response: unknown): boolean {
    return validateLegacyResponse(response);
  }
}

// 関数のエクスポート（新しい推奨される方法）
export { transformToLegacyFormat, validateLegacyResponse } from '@/utils/transformers/responseTransformer';
export * from '@/types/api';