/**
 * @deprecated 新しい実装を使用してください:
 * - parseLocation: @/utils/normalizers/addressParser
 * - normalizeGender: @/utils/normalizers/genderNormalizer
 * - normalizePrefecture: @/utils/normalizers/prefectureNormalizer
 * 
 * このファイルは既存コードとの互換性のために保持されています
 */

// 新しい実装からエクスポート
export { parseLocation, isValidPrefecture } from '@/utils/normalizers/addressParser';
export { normalizeGender, type NormalizedGender } from '@/utils/normalizers/genderNormalizer';
export { normalizePrefecture } from '@/utils/normalizers/prefectureNormalizer';