// データベースから返される生のペットデータの型定義
export interface RawPetRecord {
  id: string;
  type: 'dog' | 'cat';
  name: string;
  breed?: string;
  age?: number;
  gender?: 'male' | 'female' | 'unknown';
  prefecture: string;
  city?: string;
  description?: string;
  personality?: string | null;
  care_requirements?: string | null;
  good_with?: string | null;
  health_notes?: string | null;
  source_url: string;
  has_jpeg: number;
  has_webp: number;
  created_at: string;
  updated_at: string;
  image_checked_at?: string | null;
  screenshot_requested_at?: string | null;
  screenshot_completed_at?: string | null;
}

// カウント結果の型定義
export interface CountResult {
  total: number;
}

// 型ガード関数は utils/type-guards.ts に移動
// 互換性のため再エクスポート
export { isRawPetRecord, isCountResult } from '../utils/type-guards';