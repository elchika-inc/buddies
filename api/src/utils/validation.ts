import { ValidationError } from './error-handler';
import { PET_TYPES, IMAGE_FORMATS, CONFIG } from './constants';
import type { PetType, ImageFormat } from './constants';

export function validatePetType(type: string | undefined): PetType | undefined {
  if (!type) return undefined;
  
  if (!PET_TYPES.includes(type as PetType)) {
    throw new ValidationError(`Invalid pet type: ${type}. Must be one of: ${PET_TYPES.join(', ')}`);
  }
  
  return type as PetType;
}

export function validateImageFormat(format: string): ImageFormat {
  if (!IMAGE_FORMATS.includes(format as ImageFormat)) {
    throw new ValidationError(`Invalid image format: ${format}. Must be one of: ${IMAGE_FORMATS.join(', ')}`);
  }
  
  return format as ImageFormat;
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
  const fileMatch = filename.match(/^(pethome_\d+|\d+)(?:\.(jpg|jpeg|png|webp))?$/);
  
  if (!fileMatch) {
    throw new ValidationError('Invalid filename format');
  }
  
  const rawId = fileMatch[1];
  return rawId.startsWith('pethome_') ? rawId : `pethome_${rawId}`;
}

export function parseJsonField<T>(field: string | null, defaultValue: T): T {
  if (!field) return defaultValue;
  
  try {
    return JSON.parse(field) as T;
  } catch {
    return defaultValue;
  }
}