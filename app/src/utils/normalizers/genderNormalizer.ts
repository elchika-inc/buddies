/**
 * 性別文字列を正規化する
 */

// 性別パターンの設定
const GENDER_PATTERNS = {
  male: ['♂', 'オス', '男の子', 'male', '男'],
  female: ['♀', 'メス', '女の子', 'female', '女']
} as const;

export type NormalizedGender = '男の子' | '女の子' | '不明';

/**
 * 性別文字列を正規化する
 * @param genderText 正規化する性別文字列
 * @returns 正規化された性別（'男の子' | '女の子' | '不明'）
 */
export function normalizeGender(genderText: string): NormalizedGender {
  if (!genderText) {
    return '不明';
  }
  
  const text = genderText.toLowerCase().trim();
  
  // 男の子のパターンチェック
  if (GENDER_PATTERNS.male.some(pattern => text.includes(pattern.toLowerCase()))) {
    return '男の子';
  }
  
  // 女の子のパターンチェック
  if (GENDER_PATTERNS.female.some(pattern => text.includes(pattern.toLowerCase()))) {
    return '女の子';
  }
  
  // 不明のパターン
  return '不明';
}

/**
 * 性別が有効かチェック
 * @param gender チェックする性別
 * @returns 有効な性別かどうか
 */
export function isValidGender(gender: string): gender is NormalizedGender {
  return gender === '男の子' || gender === '女の子' || gender === '不明';
}

/**
 * 性別パターンを取得（テストや拡張用）
 * @returns 性別パターンの設定
 */
export function getGenderPatterns(): typeof GENDER_PATTERNS {
  return GENDER_PATTERNS;
}