// サービスクラスのエクスポート統合
export { ApiClient } from './ApiClient';
export { ResponseTransformer } from './ResponseTransformer';
import { PetApiService } from './PetApiService';
export { PetApiService };

// サービスインスタンスの作成
export const petApiService = new PetApiService();

// 既存コードとの互換性のため
export const petApi = petApiService;
export default petApiService;