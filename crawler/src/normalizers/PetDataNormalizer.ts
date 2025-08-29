/**
 * ペットデータ正規化クラス
 * 
 * 生データから統一フォーマットへの変換に特化
 */
import type { ParsedPetData, DetailedPetData, NormalizedPet } from '../types/pet';

export class PetDataNormalizer {
  /**
   * パースデータを正規化
   */
  normalizeData(
    rawData: ParsedPetData,
    detailData: DetailedPetData | null,
    petType: 'dog' | 'cat'
  ): NormalizedPet {
    // 詳細ページのlocationを優先、なければリストページのlocationを使用
    const locationToUse = detailData?.location || rawData.location;
    const { prefecture, city } = this.parseLocation(locationToUse);
    
    return {
      id: this.normalizeId(rawData.id),
      type: petType,
      name: this.normalizeName(rawData.name),
      // 詳細ページのbreedを優先、なければリストページのbreedを使用
      breed: this.normalizeBreed(detailData?.breed || rawData.breed, petType),
      // 詳細ページのageを優先、なければリストページのageを使用
      age: detailData?.age || rawData.age,
      // 詳細ページのgenderを優先、なければリストページのgenderを使用
      gender: detailData?.gender || rawData.gender,
      prefecture,
      city,
      location: locationToUse,
      // descriptionは詳細ページのpersonalityデータから生成
      // personalityが配列の場合は結合、なければ募集経緯やリストページのdescriptionを使用
      description: this.createDescription(detailData, rawData),
      personality: detailData?.personality || [],
      medicalInfo: detailData?.medicalInfo || '',
      careRequirements: detailData?.requirements || [],
      goodWith: detailData?.goodWith || [],
      healthNotes: detailData?.healthNotes || [],
      imageUrl: detailData?.imageUrl || rawData.thumbnailUrl,
      shelterName: rawData.organization,
      shelterContact: detailData?.shelterContact || '',
      sourceUrl: rawData.detailUrl,
      adoptionFee: detailData?.adoptionFee || null,
      metadata: this.createMetadata(rawData, detailData),
      hasJpeg: false,
      hasWebp: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * IDを正規化
   */
  private normalizeId(id: string): string {
    // pet-home_12345 または pethome_12345 形式に統一
    const cleanId = id.replace(/[^0-9]/g, '');
    return `pethome_${cleanId}`;
  }

  /**
   * 名前を正規化
   */
  private normalizeName(name: string): string {
    // 全角スペースを半角に、前後の空白を除去
    return name
      .replace(/　/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * 品種を正規化
   */
  private normalizeBreed(breed: string, petType: 'dog' | 'cat'): string {
    const normalizedBreed = breed.trim();
    
    // 一般的な品種名の正規化
    const breedMappings: Record<string, string> = {
      // 犬
      '柴': '柴犬',
      'ラブ': 'ラブラドール',
      'ゴールデン': 'ゴールデンレトリバー',
      'チワワmix': 'チワワ（ミックス）',
      
      // 猫
      'アメショー': 'アメリカンショートヘア',
      'スコティッシュ': 'スコティッシュフォールド',
      'ロシアンブルー': 'ロシアンブルー',
      '雑種': 'ミックス'
    };

    for (const [pattern, replacement] of Object.entries(breedMappings)) {
      if (normalizedBreed.includes(pattern)) {
        return replacement;
      }
    }

    return normalizedBreed || (petType === 'dog' ? '雑種犬' : '雑種猫');
  }

  /**
   * 場所情報をパース
   */
  private parseLocation(location: string): { prefecture: string; city: string } {
    const prefectures = [
      '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
      '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
      '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
      '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
      '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
      '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
      '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
    ];

    let prefecture = '';
    let city = '';

    // 都道府県を検出
    for (const pref of prefectures) {
      if (location.includes(pref)) {
        prefecture = pref;
        // 都道府県の後の部分を市区町村として取得
        const prefIndex = location.indexOf(pref);
        city = location.substring(prefIndex + pref.length).trim();
        break;
      }
    }

    // 都道府県が見つからない場合
    if (!prefecture) {
      // 東京23区の特別処理
      const tokyoWards = ['千代田区', '中央区', '港区', '新宿区', '文京区', '台東区',
        '墨田区', '江東区', '品川区', '目黒区', '大田区', '世田谷区',
        '渋谷区', '中野区', '杉並区', '豊島区', '北区', '荒川区',
        '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区'];
      
      for (const ward of tokyoWards) {
        if (location.includes(ward)) {
          prefecture = '東京都';
          city = ward;
          break;
        }
      }
    }

    return {
      prefecture: prefecture || '不明',
      city: this.normalizeCity(city)
    };
  }

  /**
   * 市区町村名を正規化
   */
  private normalizeCity(city: string): string {
    return city
      .replace(/市$/, '')
      .replace(/区$/, '')
      .replace(/町$/, '')
      .replace(/村$/, '')
      .trim() || '不明';
  }

  /**
   * 説明文を作成
   */
  private createDescription(
    detailData: DetailedPetData | null,
    rawData: ParsedPetData
  ): string {
    // 1. 詳細ページのpersonalityがある場合はそれを使用
    if (detailData?.personality && detailData.personality.length > 0) {
      // 配列の場合は結合
      return detailData.personality.join(' ');
    }
    
    // 2. リストページのdescriptionがある場合はそれを使用
    if (rawData.description) {
      return rawData.description;
    }
    
    // 3. どれもない場合はデフォルトメッセージ
    return `${rawData.name}の里親を募集しています。`;
  }

  /**
   * メタデータを作成
   */
  private createMetadata(
    rawData: ParsedPetData,
    detailData: DetailedPetData | null
  ): Record<string, unknown> {
    return {
      originalId: rawData.id,
      thumbnailUrl: rawData.thumbnailUrl,
      hasDetailData: detailData !== null,
      crawledAt: new Date().toISOString(),
      source: 'pet-home.jp'
    };
  }
}