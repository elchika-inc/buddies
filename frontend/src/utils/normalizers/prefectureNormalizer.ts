import { Prefecture } from '@/types/location';

// 都道府県の略称マッピング
const PREFECTURE_ABBREVIATION_MAP: Readonly<Record<string, Prefecture>> = {
  '東京': '東京都',
  '大阪': '大阪府',
  '京都': '京都府',
  '北海道': '北海道',
  // 追加の略称マッピングが必要な場合はここに追加
} as const;

// 有効な都道府県リスト
const VALID_PREFECTURES: readonly Prefecture[] = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
] as const;

/**
 * 都道府県名を正式名称に正規化する
 * @param prefecture 正規化する都道府県名
 * @returns 正規化された都道府県名または'不明'
 */
export function normalizePrefecture(prefecture: string): Prefecture | '不明' {
  if (!prefecture) {
    return '不明';
  }
  
  const normalized = prefecture.trim();
  
  // 略称を正式名称に変換
  if (PREFECTURE_ABBREVIATION_MAP[normalized]) {
    return PREFECTURE_ABBREVIATION_MAP[normalized];
  }
  
  // 既に正式名称の場合はそのまま返す
  if (isValidPrefecture(normalized)) {
    return normalized;
  }
  
  return '不明';
}

/**
 * 有効な都道府県名かチェックする型ガード関数
 * @param prefecture チェックする都道府県名
 * @returns 有効な都道府県名かどうか
 */
export function isValidPrefecture(prefecture: string): prefecture is Prefecture {
  return (VALID_PREFECTURES as readonly string[]).includes(prefecture);
}

/**
 * すべての有効な都道府県リストを取得
 * @returns 都道府県のリスト
 */
export function getAllPrefectures(): readonly Prefecture[] {
  return VALID_PREFECTURES;
}

/**
 * 都道府県の略称マッピングを取得
 * @returns 略称マッピング
 */
export function getPrefectureAbbreviationMap(): Readonly<Record<string, Prefecture>> {
  return PREFECTURE_ABBREVIATION_MAP;
}