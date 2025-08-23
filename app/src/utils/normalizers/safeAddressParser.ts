import { Prefecture } from '@/types/location';
import { Result, ok, err } from '@/types/result';

// エラータイプの定義
export interface ParseError {
  code: 'EMPTY_INPUT' | 'INVALID_FORMAT' | 'UNKNOWN_PREFECTURE';
  message: string;
  input?: string;
}

// 都道府県リスト
const VALID_PREFECTURES: readonly Prefecture[] = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
] as const;

// 解析結果の型
export interface ParsedLocation {
  prefecture: Prefecture | '不明';
  city: string;
}

/**
 * 住所文字列を安全に都道府県と市町村に分離する
 */
export function safeParseLocation(location: string): Result<ParsedLocation, ParseError> {
  // 空文字列チェック
  if (!location || location.trim() === '') {
    return err({
      code: 'EMPTY_INPUT',
      message: '住所が入力されていません',
      input: location
    });
  }

  const trimmedLocation = location.trim();
  
  // 都道府県の正規表現パターン
  const prefecturePattern = /(北海道|.*?[都府県])/;
  const match = trimmedLocation.match(prefecturePattern);
  
  if (match) {
    const prefectureCandidate = match[1];
    const city = trimmedLocation.substring(match[0].length).trim();
    
    // 都道府県名の検証
    const validationResult = validatePrefecture(prefectureCandidate);
    
    if (validationResult.success) {
      return ok({
        prefecture: validationResult.data,
        city: city || prefectureCandidate // 市町村がない場合は都道府県名をセット
      });
    }
    
    // 不正な都道府県名の場合
    return ok({
      prefecture: '不明',
      city: trimmedLocation
    });
  }
  
  // 都道府県が見つからない場合
  return ok({
    prefecture: '不明',
    city: trimmedLocation
  });
}

/**
 * 都道府県名を検証する
 */
function validatePrefecture(prefecture: string): Result<Prefecture, ParseError> {
  if ((VALID_PREFECTURES as readonly string[]).includes(prefecture)) {
    return ok(prefecture as Prefecture);
  }
  
  return err({
    code: 'UNKNOWN_PREFECTURE',
    message: `不明な都道府県名: ${prefecture}`,
    input: prefecture
  });
}

/**
 * 有効な都道府県名かチェックする型ガード関数
 */
export function isValidPrefecture(prefecture: string): prefecture is Prefecture {
  return (VALID_PREFECTURES as readonly string[]).includes(prefecture);
}

/**
 * 複数の住所を一括で解析する
 */
export function safeParseBatchLocations(
  locations: string[]
): Result<ParsedLocation[], ParseError> {
  const results: ParsedLocation[] = [];
  
  for (const location of locations) {
    const result = safeParseLocation(location);
    
    if (!result.success) {
      return err({
        ...result.error,
        message: `バッチ処理エラー: ${result.error.message}`
      });
    }
    
    results.push(result.data);
  }
  
  return ok(results);
}

/**
 * 住所を解析して都道府県のみを取得する
 */
export function extractPrefecture(location: string): Result<Prefecture | '不明', ParseError> {
  const result = safeParseLocation(location);
  
  if (!result.success) {
    return result;
  }
  
  return ok(result.data.prefecture);
}

/**
 * 住所を解析して市町村のみを取得する
 */
export function extractCity(location: string): Result<string, ParseError> {
  const result = safeParseLocation(location);
  
  if (!result.success) {
    return result;
  }
  
  return ok(result.data.city);
}