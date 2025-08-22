/**
 * ドメインモデルの型定義
 */

/**
 * ペット基本情報
 */
export interface Pet {
  id: string;
  type: 'dog' | 'cat';
  name: string;
  breed?: string;
  age?: number;
  gender?: 'male' | 'female' | 'unknown';
  prefecture: string;
  city?: string;
  location?: string;
  description?: string;
  personality?: string[];
  medicalInfo?: string;
  careRequirements?: string[];
  imageUrl?: string;
  shelterName?: string;
  shelterContact?: string;
  sourceUrl: string;
  adoptionFee?: number;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
  // 画像ステータス
  hasJpeg: boolean | number;  // DBからは0/1で取得される
  hasWebp: boolean | number;
  imageCheckedAt?: string | null;
  screenshotRequestedAt?: string | null;
  screenshotCompletedAt?: string | null;
  // 互換性
  goodWith?: string[];
  healthNotes?: string[];
  // DB用のsnake_case互換プロパティ
  has_jpeg?: number;
  has_webp?: number;
  source_url?: string;
  image_checked_at?: string | null;
  screenshot_requested_at?: string | null;
  screenshot_completed_at?: string | null;
}

/**
 * 画像処理用のPet型（必須フィールドのみ）
 */
export interface PetForImage {
  id: string;
  type: string;
  name: string;
  has_jpeg: number;
  has_webp: number;
  source_url: string;
}

/**
 * 画像リクエスト
 */
export interface ImageRequest {
  petType: 'dog' | 'cat';
  petId: string;
  format: 'jpeg' | 'jpg' | 'webp' | 'auto';
}

/**
 * 画像処理結果
 */
export interface ImageResult {
  success: boolean;
  body?: ArrayBuffer | ReadableStream;
  contentType?: string;
  headers?: Record<string, string>;
  error?: string;
  status?: number;
  format?: 'jpeg' | 'webp';
  size?: number;
  url?: string;
  processingTime?: number;
}

/**
 * ペットリストレスポンス
 */
export interface PetListResponse {
  pets: Pet[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * ペットフィルター条件
 */
export interface PetFilter {
  type?: 'dog' | 'cat';
  prefecture?: string;
  ageMin?: number;
  ageMax?: number;
  hasImage?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * ペット作成/更新データ
 */
export interface PetInput {
  type: 'dog' | 'cat';
  name: string;
  breed?: string;
  age?: number;
  gender?: 'male' | 'female' | 'unknown';
  prefecture: string;
  city?: string;
  description?: string;
  sourceUrl: string;
}

/**
 * バッチ更新結果
 */
export interface BatchUpdateResult {
  total: number;
  processed: number;
  updated: number;
  failed: number;
  errors: string[];
}