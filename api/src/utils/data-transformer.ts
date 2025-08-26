/**
 * データ変換ユーティリティ
 * 
 * @description データベース（snake_case）とAPI（camelCase）間の変換を提供
 */

/**
 * snake_caseをcamelCaseに変換
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * camelCaseをsnake_caseに変換
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * オブジェクトのキーをsnake_caseからcamelCaseに変換
 */
export function transformToCamelCase<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformToCamelCase(item)) as T;
  }

  if (typeof obj !== 'object') {
    return obj as T;
  }

  const transformed: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;
  for (const key in record) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const camelKey = snakeToCamel(key);
      transformed[camelKey] = transformToCamelCase(record[key]);
    }
  }

  return transformed as T;
}

/**
 * オブジェクトのキーをcamelCaseからsnake_caseに変換
 */
export function transformToSnakeCase<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformToSnakeCase(item)) as T;
  }

  if (typeof obj !== 'object') {
    return obj as T;
  }

  const transformed: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;
  for (const key in record) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const snakeKey = camelToSnake(key);
      transformed[snakeKey] = transformToSnakeCase(record[key]);
    }
  }

  return transformed as T;
}

/**
 * データベースレコードからAPIレスポンスへの変換
 * 
 * @description snake_caseのDBレコードをcamelCaseのAPIレスポンスに変換
 */
export function dbToApi<T = unknown>(record: unknown): T {
  if (!record) return record as T;

  const transformed = transformToCamelCase<T>(record);
  
  // boolean型への変換（DB: 0/1 → API: boolean）
  if (typeof transformed === 'object' && transformed !== null) {
    const obj = transformed as Record<string, unknown>;
    
    // has_jpeg/has_webp のような boolean フィールドを変換
    if ('hasJpeg' in obj && typeof obj.hasJpeg === 'number') {
      obj.hasJpeg = obj.hasJpeg === 1;
    }
    if ('hasWebp' in obj && typeof obj.hasWebp === 'number') {
      obj.hasWebp = obj.hasWebp === 1;
    }
    if ('isReady' in obj && typeof obj.isReady === 'number') {
      obj.isReady = obj.isReady === 1;
    }
  }

  return transformed;
}

/**
 * APIリクエストからデータベースレコードへの変換
 * 
 * @description camelCaseのAPIリクエストをsnake_caseのDBレコードに変換
 */
export function apiToDb<T = unknown>(data: unknown): T {
  if (!data) return data as T;

  const transformed = transformToSnakeCase<T>(data);
  
  // boolean型への変換（API: boolean → DB: 0/1）
  if (typeof transformed === 'object' && transformed !== null) {
    const obj = transformed as Record<string, unknown>;
    
    // has_jpeg/has_webp のような boolean フィールドを変換
    if ('has_jpeg' in obj && typeof obj.has_jpeg === 'boolean') {
      obj.has_jpeg = obj.has_jpeg ? 1 : 0;
    }
    if ('has_webp' in obj && typeof obj.has_webp === 'boolean') {
      obj.has_webp = obj.has_webp ? 1 : 0;
    }
    if ('is_ready' in obj && typeof obj.is_ready === 'boolean') {
      obj.is_ready = obj.is_ready ? 1 : 0;
    }
  }

  return transformed;
}

/**
 * ペットレコードの変換（DB → API）
 */
export interface ApiPetRecord {
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
  goodWith?: string[];
  healthNotes?: string[];
  imageUrl?: string;
  shelterName?: string;
  shelterContact?: string;
  sourceUrl: string;
  adoptionFee?: number;
  metadata?: string;
  hasJpeg: boolean;
  hasWebp: boolean;
  imageCheckedAt?: string;
  screenshotRequestedAt?: string;
  screenshotCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * データベースのペットレコードをAPI用に変換
 */
export function transformPetRecord(dbRecord: unknown): ApiPetRecord {
  const pet = dbToApi<ApiPetRecord>(dbRecord);
  
  // JSON文字列フィールドのパース
  if (pet.personality && typeof pet.personality === 'string') {
    try {
      pet.personality = JSON.parse(pet.personality);
    } catch {
      pet.personality = [];
    }
  }
  
  if (pet.careRequirements && typeof pet.careRequirements === 'string') {
    try {
      pet.careRequirements = JSON.parse(pet.careRequirements);
    } catch {
      pet.careRequirements = [];
    }
  }
  
  if (pet.goodWith && typeof pet.goodWith === 'string') {
    try {
      pet.goodWith = JSON.parse(pet.goodWith);
    } catch {
      pet.goodWith = [];
    }
  }
  
  if (pet.healthNotes && typeof pet.healthNotes === 'string') {
    try {
      pet.healthNotes = JSON.parse(pet.healthNotes);
    } catch {
      pet.healthNotes = [];
    }
  }

  // R2の画像URLを設定（画像がある場合）
  // もしR2に画像がある場合は、APIエンドポイントを通して配信
  if (pet.hasJpeg || pet.hasWebp) {
    // R2の画像を配信するAPIエンドポイント（カスタムドメイン使用）
    pet.imageUrl = `https://pawmatch-api.elchika.app/api/images/${pet.type}/${pet.id}.jpg`;
  } else if (typeof dbRecord === 'object' && dbRecord !== null && 'image_url' in dbRecord && typeof (dbRecord as Record<string, unknown>).image_url === 'string') {
    // データベースに既存の画像URLがある場合はそれを使用
    pet.imageUrl = (dbRecord as Record<string, unknown>).image_url as string;
  }

  // locationフィールドの設定
  if (pet.prefecture && pet.city) {
    pet.location = `${pet.prefecture}${pet.city}`;
  } else if (pet.prefecture) {
    pet.location = pet.prefecture;
  }

  return pet;
}