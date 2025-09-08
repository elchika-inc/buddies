/**
 * 地域データの型定義と型ガード関数
 */

export type LocationData = Record<string, string[]>
export type RegionData = Record<string, string[]>

/**
 * 地域データの型ガード関数
 */
export function isLocationData(obj: unknown): obj is LocationData {
  if (!obj || typeof obj !== 'object') return false

  const record = obj as Record<string, unknown>
  return Object.values(record).every(
    (value) => Array.isArray(value) && value.every((item) => typeof item === 'string')
  )
}

/**
 * リージョンデータの型ガード関数
 */
export function isRegionData(obj: unknown): obj is RegionData {
  return isLocationData(obj) // 同じ構造なので同じガードを使用
}

/**
 * 安全に地域データを取得する
 */
export function ensureLocationData(data: unknown): LocationData {
  if (isLocationData(data)) {
    return data
  }
  console.warn('Invalid location data, returning empty object')
  return {}
}

/**
 * 安全にリージョンデータを取得する
 */
export function ensureRegionData(data: unknown): RegionData {
  if (isRegionData(data)) {
    return data
  }
  console.warn('Invalid region data, returning empty object')
  return {}
}
