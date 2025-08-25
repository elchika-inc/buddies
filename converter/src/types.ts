/**
 * 画像変換サービス用の型定義
 */

/**
 * ペット情報（画像処理用）
 */
export interface PetForImage {
  id: string;
  type: 'dog' | 'cat';
  name: string;
  source_url: string;
  has_jpeg: number;
  has_webp: number;
  updated_at?: string;
}

/**
 * 画像リクエスト
 */
export interface ImageRequest {
  petId: string;
  type: 'dog' | 'cat';
  format?: 'jpeg' | 'webp';
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * 画像処理結果
 */
export interface ImageProcessingResult {
  success: boolean;
  petId: string;
  jpegUrl?: string;
  webpUrl?: string;
  error?: string;
  processingTime?: number;
}

/**
 * バッチ処理リクエスト
 */
export interface BatchProcessingRequest {
  pets: Array<{
    id: string;
    type: 'dog' | 'cat';
    name: string;
    sourceUrl: string;
  }>;
  batchId: string;
}

/**
 * スクリーンショット設定
 */
export interface ScreenshotConfig {
  viewport?: {
    width: number;
    height: number;
  };
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
  selector?: string;
}

/**
 * 画像アップロード結果
 */
export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  size?: number;
  error?: string;
}