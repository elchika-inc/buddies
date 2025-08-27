import { ValidationError } from './error-handler';
import { PET_TYPES, IMAGE_FORMATS, CONFIG } from './constants';
import type { PetType, ImageFormat } from './constants';
import { isPetType, isImageFormat } from './type-guards';

export function validatePetType(type: string | undefined): PetType | undefined {
  if (!type) return undefined;
  
  if (!isPetType(type)) {
    throw new ValidationError(`Invalid pet type: ${type}. Must be one of: ${PET_TYPES.join(', ')}`);
  }
  
  return type;
}

export function validateImageFormat(format: string): ImageFormat {
  if (!isImageFormat(format)) {
    throw new ValidationError(`Invalid image format: ${format}. Must be one of: ${IMAGE_FORMATS.join(', ')}`);
  }
  
  return format;
}

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

export function extractPetIdFromFilename(filename: string): string {
  const fileMatch = filename.match(/^(pet-home_\d+|pethome_\d+|\d+)(?:\.(jpg|jpeg|png|webp))?$/);
  
  if (!fileMatch) {
    throw new ValidationError('Invalid filename format');
  }
  
  const rawId = fileMatch[1];
  
  // pet-home_ または pethome_ 形式の場合はそのまま返す
  if (rawId.startsWith('pet-home_') || rawId.startsWith('pethome_')) {
    return rawId;
  }
  
  // 数字のみの場合はpethome_プレフィックスを付ける
  return `pethome_${rawId}`;
}

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