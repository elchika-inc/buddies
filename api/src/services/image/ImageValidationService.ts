/**
 * 画像アップロードリクエストのバリデーションサービス
 * 単一責任: リクエストのバリデーション
 */

import { Result } from '../../types/result'

// リクエスト型定義
export interface UploadScreenshotRequest {
  petId: string
  petType: 'dog' | 'cat'
  imageData: string // Base64エンコードされた画像
  captureMethod?: string
  sourceUrl?: string
}

export interface ConvertImageRequest {
  petId: string
  petType: 'dog' | 'cat'
  sourceFormat: 'png' | 'jpeg' | 'webp'
  targetFormats: ('jpeg' | 'webp')[]
  sourceKey?: string // R2のキー
  imageData?: string // Base64（sourceKeyがない場合）
}

export interface BatchUploadRequest {
  results: Array<{
    petId: string
    petType: 'dog' | 'cat'
    screenshot?: {
      data: string // Base64
      captureMethod?: string
    }
    jpeg?: {
      data: string // Base64
    }
    webp?: {
      data: string // Base64
    }
  }>
  batchId: string
}

export class ImageValidationService {
  /**
   * スクリーンショットリクエストのバリデーション
   */
  validateScreenshotRequest(body: unknown): Result<UploadScreenshotRequest, string> {
    if (!this.isValidScreenshotRequest(body)) {
      return Result.err('Invalid screenshot request: missing required fields or invalid pet type')
    }
    return Result.ok(body as UploadScreenshotRequest)
  }

  /**
   * 画像変換リクエストのバリデーション
   */
  validateConvertRequest(body: unknown): Result<ConvertImageRequest, string> {
    if (!this.isValidConvertRequest(body)) {
      return Result.err('Invalid convert request: missing required fields or invalid formats')
    }
    return Result.ok(body as ConvertImageRequest)
  }

  /**
   * バッチアップロードリクエストのバリデーション
   */
  validateBatchRequest(body: unknown): Result<BatchUploadRequest, string> {
    if (!this.isValidBatchRequest(body)) {
      return Result.err('Invalid batch request: missing batchId or invalid results array')
    }
    return Result.ok(body as BatchUploadRequest)
  }

  /**
   * Type guards
   */
  private isValidScreenshotRequest(body: unknown): body is UploadScreenshotRequest {
    return !!(
      typeof body === 'object' &&
      body !== null &&
      'petId' in body &&
      'petType' in body &&
      'imageData' in body &&
      typeof (body as UploadScreenshotRequest).petId === 'string' &&
      ((body as UploadScreenshotRequest).petType === 'dog' ||
        (body as UploadScreenshotRequest).petType === 'cat') &&
      typeof (body as UploadScreenshotRequest).imageData === 'string'
    )
  }

  private isValidConvertRequest(body: unknown): body is ConvertImageRequest {
    return !!(
      typeof body === 'object' &&
      body !== null &&
      'petId' in body &&
      'petType' in body &&
      'targetFormats' in body &&
      typeof (body as ConvertImageRequest).petId === 'string' &&
      ((body as ConvertImageRequest).petType === 'dog' ||
        (body as ConvertImageRequest).petType === 'cat') &&
      Array.isArray((body as ConvertImageRequest).targetFormats) &&
      (body as ConvertImageRequest).targetFormats.length > 0 &&
      ('imageData' in body || 'sourceKey' in body)
    )
  }

  private isValidBatchRequest(body: unknown): body is BatchUploadRequest {
    return !!(
      typeof body === 'object' &&
      body !== null &&
      'results' in body &&
      'batchId' in body &&
      Array.isArray((body as BatchUploadRequest).results) &&
      typeof (body as BatchUploadRequest).batchId === 'string'
    )
  }
}
