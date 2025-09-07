/**
 * バリデーションユーティリティ
 * 
 * @description API入力値の検証を行うヘルパー関数群
 * ペットタイプ、画像形式、ページネーション、ファイル名などの検証を提供
 */

import { ValidationError } from './error-handler';
import { PET_TYPES, IMAGE_FORMATS, CONFIG } from './constants';
import type { PetType, ImageFormat } from './constants';
import { isPetType, isImageFormat } from './type-guards';

/**
 * ペットタイプの検証
 * 
 * @param type - 検証対象のペットタイプ文字列
 * @returns 有効なPetTypeまたはundefined
 * @throws ValidationError - 無効なペットタイプの場合
 * @description 'dog'または'cat'の有効性を確認し、無効な場合はエラーを投げる
 */
export function validatePetType(type: string | undefined): PetType | undefined {
  if (!type) return undefined;
  
  if (!isPetType(type)) {
    throw new ValidationError(`Invalid pet type: ${type}. Must be one of: ${PET_TYPES.join(', ')}`);
  }
  
  return type;
}

/**
 * 画像フォーマットの検証
 * 
 * @param format - 検証対象の画像フォーマット文字列
 * @returns 有効なImageFormat
 * @throws ValidationError - 無効な画像フォーマットの場合
 * @description サポートされた画像フォーマット（jpeg, webp等）の有効性を確認
 */
export function validateImageFormat(format: string): ImageFormat {
  if (!isImageFormat(format)) {
    throw new ValidationError(`Invalid image format: ${format}. Must be one of: ${IMAGE_FORMATS.join(', ')}`);
  }
  
  return format;
}

/**
 * ページネーションパラメータの検証
 * 
 * @param limit - 1ページあたりの件数文字列
 * @param offset - オフセット文字列
 * @returns 検証済みのlimitとoffset
 * @throws ValidationError - 無効な値の場合
 * @description limitは最大値で制限され、offsetは0以上であることを確認
 */
export function validatePagination(limit: string | undefined, offset: string | undefined) {
  const parsedLimit = Math.min(
    parseInt(limit || String(CONFIG.LIMITS.DEFAULT_PETS_PER_REQUEST)), 
    CONFIG.LIMITS.MAX_PETS_PER_REQUEST
  );
  
  const parsedOffset = parseInt(offset || '0');
  
  if (isNaN(parsedLimit) || parsedLimit < 1) {
    throw new ValidationError('Invalid limit parameter');
  }
  
  if (isNaN(parsedOffset) || parsedOffset < 0) {
    throw new ValidationError('Invalid offset parameter');
  }
  
  return { limit: parsedLimit, offset: parsedOffset };
}

/**
 * ファイル名からペットIDを抽出
 * 
 * @param filename - 解析対象のファイル名
 * @returns ペットID
 * @throws ValidationError - 無効なファイル名の場合
 * @description 様々なファイル名形式からペットIDを統一的に抽出
 * pet-home_pethome_数字, pet-home_数字, pethome_数字, 数字 形式に対応
 */
export function extractPetIdFromFilename(filename: string): string {
  // pet-home_pethome_数字 形式も含めて対応
  const fileMatch = filename.match(/^(pet-home_pethome_\d+|pet-home_\d+|pethome_\d+|\d+)(?:\.(jpg|jpeg|png|webp))?$/);
  
  if (!fileMatch) {
    throw new ValidationError('Invalid filename format');
  }
  
  const rawId = fileMatch[1];
  
  if (!rawId) {
    throw new Error('Invalid filename: could not extract pet ID');
  }
  
  // pet-home_pethome_ 形式の場合はそのまま返す
  if (rawId.startsWith('pet-home_pethome_')) {
    return rawId;
  }
  
  // pet-home_ または pethome_ 形式の場合はそのまま返す
  if (rawId.startsWith('pet-home_') || rawId.startsWith('pethome_')) {
    return rawId;
  }
  
  // 数字のみの場合はpethome_プレフィックスを付ける
  return `pethome_${rawId}`;
}

/**
 * JSONフィールドのパース
 * 
 * @param field - パース対象のJSON文字列
 * @param defaultValue - パース失敗時のデフォルト値
 * @returns パースされた値またはデフォルト値
 * @description データベースから取得したJSON文字列を安全にパース
 * エラー時はデフォルト値を返す
 */
export function parseJsonField<T>(field: string | null, defaultValue: T): T {
  if (!field) return defaultValue;
  
  try {
    const parsed = JSON.parse(field);
    // 型チェックが必要な場合は呼び出し側で型ガードを使用
    return parsed;
  } catch {
    return defaultValue;
  }
}