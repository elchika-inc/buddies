// サービスクラスのエクスポート統合
export { ApiClient } from './ApiClient';
export { ResponseTransformer } from './ResponseTransformer';
export { PetApiService } from './PetApiService';

// サービスインスタンスの作成
export const petApiService = new PetApiService();

// 既存コードとの互換性のため
export const petApi = petApiService;
export default petApiService;