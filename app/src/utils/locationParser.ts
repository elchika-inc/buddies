import { Prefecture } from '@/types/location'

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
    }
  }

  // 都道府県の正規表現パターン
  const prefecturePattern = /(北海道|.*?[都府県])/
  const match = location.match(prefecturePattern)
  
  if (match) {
    const prefecture = match[1]
    const city = location.substring(match[0].length).trim()
    
    // 都道府県名が正しいかチェック
    if (isValidPrefecture(prefecture)) {
      return {
        prefecture: prefecture as Prefecture,
        city: city || prefecture // 市町村がない場合は都道府県名をセット
      }
    }
  }
  
  // 分離できない場合はフォールバック処理
  return {
    prefecture: '不明',
    city: location
  }
}

/**
 * 有効な都道府県名かチェック
 */
function isValidPrefecture(prefecture: string): prefecture is Prefecture {
  const validPrefectures: Prefecture[] = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ]
  
  return validPrefectures.includes(prefecture as Prefecture)
}

/**
 * 性別文字列を正規化する
 */
export function normalizeGender(genderText: string): '男の子' | '女の子' | '不明' {
  if (!genderText) return '不明'
  
  const text = genderText.toLowerCase().trim()
  
  // 男の子のパターン
  if (text.includes('♂') || 
      text.includes('オス') || 
      text.includes('男の子') ||
      text.includes('male') ||
      text.includes('男')) {
    return '男の子'
  }
  
  // 女の子のパターン
  if (text.includes('♀') || 
      text.includes('メス') || 
      text.includes('女の子') ||
      text.includes('female') ||
      text.includes('女')) {
    return '女の子'
  }
  
  // 不明のパターン
  return '不明'
}

/**
 * 都道府県名を正式名称に正規化する
 */
export function normalizePrefecture(prefecture: string): Prefecture | '不明' {
  if (!prefecture) return '不明'
  
  const normalized = prefecture.trim()
  
  // 略称を正式名称に変換
  const prefectureMap: Record<string, Prefecture> = {
    '東京': '東京都',
    '大阪': '大阪府',
    '京都': '京都府',
    '北海道': '北海道'
  }
  
  if (prefectureMap[normalized]) {
    return prefectureMap[normalized]
  }
  
  // 既に正式名称の場合はそのまま返す
  if (isValidPrefecture(normalized)) {
    return normalized as Prefecture
  }
  
  return '不明'
}