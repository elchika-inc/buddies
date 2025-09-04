import { Prefecture } from '@/types/location';

/**
 * 住所文字列を都道府県と市町村に分離する
 */
export function parseLocation(location: string): { 
  prefecture: Prefecture | '不明', 
  city: string 
} {
  if (!location || location.trim() === '') {
    return {
      prefecture: '不明',
      city: ''
    };
  }

  // 都道府県の正規表現パターン
  const prefecturePattern = /(北海道|.*?[都府県])/;
  const match = location.match(prefecturePattern);
  
  if (match) {
    const prefecture = match[1];
    const city = location.substring(match[0].length).trim();
    
    // 都道府県名が正しいかチェック（型ガード関数を使用）
    if (prefecture && isValidPrefecture(prefecture)) {
      return {
        prefecture: prefecture,
        city: city || prefecture // 市町村がない場合は都道府県名をセット
      };
    }
  }
  
  // 分離できない場合はフォールバック処理
  return {
    prefecture: '不明',
    city: location
  };
}

/**
 * 有効な都道府県名かチェックする型ガード関数
 */
export function isValidPrefecture(prefecture: string): prefecture is Prefecture {
  const validPrefectures: readonly Prefecture[] = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ] as const;
  
  return (validPrefectures as readonly string[]).includes(prefecture);
}