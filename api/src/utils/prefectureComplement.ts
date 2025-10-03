/**
 * 都道府県補完ユーティリティ
 *
 * 市町村情報から都道府県を推測して補完する
 */

// 市町村→都道府県のマッピング（主要都市のみ）
const CITY_TO_PREFECTURE_MAP: Record<string, string> = {
  // 政令指定都市
  札幌市: '北海道',
  仙台市: '宮城県',
  さいたま市: '埼玉県',
  千葉市: '千葉県',
  横浜市: '神奈川県',
  川崎市: '神奈川県',
  相模原市: '神奈川県',
  新潟市: '新潟県',
  静岡市: '静岡県',
  浜松市: '静岡県',
  名古屋市: '愛知県',
  京都市: '京都府',
  大阪市: '大阪府',
  堺市: '大阪府',
  神戸市: '兵庫県',
  岡山市: '岡山県',
  広島市: '広島県',
  北九州市: '福岡県',
  福岡市: '福岡県',
  熊本市: '熊本県',

  // 東京23区
  千代田区: '東京都',
  中央区: '東京都',
  港区: '東京都',
  新宿区: '東京都',
  文京区: '東京都',
  台東区: '東京都',
  墨田区: '東京都',
  江東区: '東京都',
  品川区: '東京都',
  目黒区: '東京都',
  大田区: '東京都',
  世田谷区: '東京都',
  渋谷区: '東京都',
  中野区: '東京都',
  杉並区: '東京都',
  豊島区: '東京都',
  北区: '東京都',
  荒川区: '東京都',
  板橋区: '東京都',
  練馬区: '東京都',
  足立区: '東京都',
  葛飾区: '東京都',
  江戸川区: '東京都',

  // 県庁所在地
  青森市: '青森県',
  盛岡市: '岩手県',
  秋田市: '秋田県',
  山形市: '山形県',
  福島市: '福島県',
  水戸市: '茨城県',
  宇都宮市: '栃木県',
  前橋市: '群馬県',
  川越市: '埼玉県',
  松戸市: '千葉県',
  八王子市: '東京都',
  横須賀市: '神奈川県',
  富山市: '富山県',
  金沢市: '石川県',
  福井市: '福井県',
  甲府市: '山梨県',
  長野市: '長野県',
  岐阜市: '岐阜県',
  沼津市: '静岡県',
  豊橋市: '愛知県',
  津市: '三重県',
  大津市: '滋賀県',
  宇治市: '京都府',
  高槻市: '大阪府',
  姫路市: '兵庫県',
  奈良市: '奈良県',
  和歌山市: '和歌山県',
  鳥取市: '鳥取県',
  松江市: '島根県',
  倉敷市: '岡山県',
  呉市: '広島県',
  下関市: '山口県',
  徳島市: '徳島県',
  高松市: '香川県',
  松山市: '愛媛県',
  高知市: '高知県',
  久留米市: '福岡県',
  佐賀市: '佐賀県',
  長崎市: '長崎県',
  大分市: '大分県',
  宮崎市: '宮崎県',
  鹿児島市: '鹿児島県',
  那覇市: '沖縄県',

  // その他主要都市
  旭川市: '北海道',
  函館市: '北海道',
  小樽市: '北海道',
  帯広市: '北海道',
  釧路市: '北海道',
  いわき市: '福島県',
  郡山市: '福島県',
  つくば市: '茨城県',
  日立市: '茨城県',
  足利市: '栃木県',
  小山市: '栃木県',
  高崎市: '群馬県',
  所沢市: '埼玉県',
  船橋市: '千葉県',
  柏市: '千葉県',
  町田市: '東京都',
  立川市: '東京都',
  藤沢市: '神奈川県',
  平塚市: '神奈川県',
  長岡市: '新潟県',
  上越市: '新潟県',
  高岡市: '富山県',
  松本市: '長野県',
  飯田市: '長野県',
  大垣市: '岐阜県',
  豊田市: '愛知県',
  岡崎市: '愛知県',
  四日市市: '三重県',
  枚方市: '大阪府',
  東大阪市: '大阪府',
  尼崎市: '兵庫県',
  西宮市: '兵庫県',
  福山市: '広島県',
  北九州市小倉北区: '福岡県',
  北九州市小倉南区: '福岡県',
  北九州市八幡西区: '福岡県',
  佐世保市: '長崎県',
  八代市: '熊本県',
  別府市: '大分県',
  都城市: '宮崎県',
  鹿屋市: '鹿児島県',
  沖縄市: '沖縄県',
}

/**
 * 市町村名から都道府県を推測
 */
export function inferPrefectureFromCity(city: string | null): string | null {
  if (!city) {
    return null
  }

  // 完全一致で検索
  if (CITY_TO_PREFECTURE_MAP[city]) {
    return CITY_TO_PREFECTURE_MAP[city]
  }

  // 部分一致で検索（区を含む場合など）
  const cityKeys = Object.keys(CITY_TO_PREFECTURE_MAP)
  for (const key of cityKeys) {
    if (city.includes(key) || key.includes(city)) {
      return CITY_TO_PREFECTURE_MAP[key] || null
    }
  }

  return null
}

/**
 * ペットデータの都道府県を補完
 */
export function complementPetPrefecture(pet: {
  prefecture: string | null
  city: string | null
}): string | null {
  // 既に都道府県がある場合はそのまま返す
  if (pet.prefecture) {
    return pet.prefecture
  }

  // 市町村から推測
  return inferPrefectureFromCity(pet.city)
}

/**
 * バッチ処理用: 複数のペットデータの都道府県を補完
 */
export function complementPetsPrefecture(
  pets: Array<{
    id: string
    prefecture: string | null
    city: string | null
  }>
): Array<{
  id: string
  inferredPrefecture: string | null
  needsUpdate: boolean
}> {
  return pets.map((pet) => {
    const inferredPrefecture = complementPetPrefecture(pet)
    return {
      id: pet.id,
      inferredPrefecture,
      needsUpdate: !pet.prefecture && inferredPrefecture !== null,
    }
  })
}
