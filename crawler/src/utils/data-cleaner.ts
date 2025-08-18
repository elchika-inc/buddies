import { RawPetData, Dog, Cat, PetType } from '../types';

export class DataCleaner {
  private static readonly PREFECTURE_MAP: Record<string, string> = {
    '北海道': '北海道',
    '青森': '青森県',
    '岩手': '岩手県',
    '宮城': '宮城県',
    '秋田': '秋田県',
    '山形': '山形県',
    '福島': '福島県',
    '茨城': '茨城県',
    '栃木': '栃木県',
    '群馬': '群馬県',
    '埼玉': '埼玉県',
    'さいたま': '埼玉県',
    '千葉': '千葉県',
    '東京': '東京都',
    '神奈川': '神奈川県',
    '新潟': '新潟県',
    '富山': '富山県',
    '石川': '石川県',
    '福井': '福井県',
    '山梨': '山梨県',
    '長野': '長野県',
    '岐阜': '岐阜県',
    '静岡': '静岡県',
    '愛知': '愛知県',
    '三重': '三重県',
    '滋賀': '滋賀県',
    '京都': '京都府',
    '大阪': '大阪府',
    '兵庫': '兵庫県',
    '奈良': '奈良県',
    '和歌山': '和歌山県',
    '鳥取': '鳥取県',
    '島根': '島根県',
    '岡山': '岡山県',
    '広島': '広島県',
    '山口': '山口県',
    '徳島': '徳島県',
    '香川': '香川県',
    '愛媛': '愛媛県',
    '高知': '高知県',
    '福岡': '福岡県',
    '佐賀': '佐賀県',
    '長崎': '長崎県',
    '熊本': '熊本県',
    '大分': '大分県',
    '宮崎': '宮崎県',
    '鹿児島': '鹿児島県',
    '沖縄': '沖縄県'
  };

  private static readonly GENDER_MAP: Record<string, '男の子' | '女の子' | '不明'> = {
    '♂': '男の子',
    '♀': '女の子',
    'オス': '男の子',
    'メス': '女の子',
    '男の子': '男の子',
    '女の子': '女の子',
    'male': '男の子',
    'female': '女の子',
    '?': '不明',
    '不明': '不明',
    'unknown': '不明',
    '-': '不明',
    '': '不明'
  };

  /**
   * 年齢の正規化
   */
  static normalizeAge(ageText: string): number {
    if (!ageText) return 0;
    
    const text = ageText.toLowerCase().replace(/\s/g, '');
    
    // 子犬・子猫の場合
    if (text.includes('子猫') || text.includes('子犬') || text.includes('生後')) {
      const monthMatch = text.match(/(\d+)ヶ?月/);
      if (monthMatch) {
        return Math.max(0.1, parseInt(monthMatch[1]) / 12);
      }
      return 0.5; // デフォルト値
    }
    
    // 年数の抽出
    const yearMatch = text.match(/(\d+)歳?年?/);
    if (yearMatch) {
      return parseInt(yearMatch[1]);
    }
    
    // 月数のみの場合
    const monthOnlyMatch = text.match(/(\d+)ヶ?月/);
    if (monthOnlyMatch) {
      return Math.max(0.1, parseInt(monthOnlyMatch[1]) / 12);
    }
    
    return 0;
  }

  /**
   * 性別の正規化
   */
  static normalizeGender(genderText: string): '男の子' | '女の子' | '不明' {
    if (!genderText) return '不明';
    
    const cleanText = genderText.trim().toLowerCase();
    return this.GENDER_MAP[cleanText] || '不明';
  }

  /**
   * 都道府県の正規化
   */
  static normalizePrefecture(locationText: string): { prefecture: string; city: string } {
    if (!locationText) return { prefecture: '', city: '' };
    
    const text = locationText.trim();
    
    // 都道府県を検索
    for (const [key, value] of Object.entries(this.PREFECTURE_MAP)) {
      if (text.includes(key) || text.includes(value)) {
        const prefecture = value;
        const city = text.replace(key, '').replace(prefecture, '').trim();
        
        return { 
          prefecture, 
          city: city || '' 
        };
      }
    }
    
    return { prefecture: text, city: '' };
  }

  /**
   * 体重の正規化
   */
  static normalizeWeight(weightText: string): number | undefined {
    if (!weightText) return undefined;
    
    const match = weightText.match(/(\d+(?:\.\d+)?)\s*kg?/i);
    return match ? parseFloat(match[1]) : undefined;
  }

  /**
   * 犬のサイズ推定
   */
  static estimateDogSize(breed: string, weight?: number): '小型犬' | '中型犬' | '大型犬' | '超大型犬' {
    if (weight) {
      if (weight <= 10) return '小型犬';
      if (weight <= 25) return '中型犬';
      if (weight <= 40) return '大型犬';
      return '超大型犬';
    }
    
    // 犬種による推定
    const smallBreeds = ['チワワ', 'ポメラニアン', 'トイプードル', 'ヨークシャーテリア', 'マルチーズ'];
    const largeBreeds = ['ゴールデンレトリバー', 'ラブラドールレトリバー', 'ジャーマンシェパード'];
    const extraLargeBreeds = ['グレートデーン', 'セントバーナード', 'マスティフ'];
    
    if (smallBreeds.some(b => breed.includes(b))) return '小型犬';
    if (extraLargeBreeds.some(b => breed.includes(b))) return '超大型犬';
    if (largeBreeds.some(b => breed.includes(b))) return '大型犬';
    
    return '中型犬'; // デフォルト
  }

  /**
   * 猫の毛の長さ推定
   */
  static estimateCoatLength(breed: string, description: string): '短毛' | '長毛' {
    const longHairBreeds = ['ペルシャ', 'メインクーン', 'ラグドール', 'ノルウェージャンフォレスト'];
    const longHairKeywords = ['長毛', 'ロング', 'ふわふわ', 'もふもふ'];
    
    if (longHairBreeds.some(b => breed.includes(b))) return '長毛';
    if (longHairKeywords.some(k => description.includes(k))) return '長毛';
    
    return '短毛';
  }

  /**
   * 画像URLの検証
   */
  static validateImageUrl(url: string): boolean {
    if (!url) return false;
    
    try {
      new URL(url);
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    } catch {
      return false;
    }
  }

  /**
   * テキストクリーニング
   */
  static cleanText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, '\n')
      .trim();
  }

  /**
   * 配列の正規化（性格など）
   */
  static normalizeArray(text: string): string[] {
    if (!text) return [];
    
    return text
      .split(/[,、・]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  /**
   * 真偽値の正規化
   */
  static normalizeBoolean(text: string): boolean | undefined {
    if (!text) return undefined;
    
    const cleanText = text.toLowerCase().trim();
    const trueValues = ['済', 'あり', 'yes', 'true', '○', '✓'];
    const falseValues = ['未', 'なし', 'no', 'false', '×', '✗'];
    
    if (trueValues.some(val => cleanText.includes(val))) return true;
    if (falseValues.some(val => cleanText.includes(val))) return false;
    
    return undefined;
  }

  /**
   * 生データをDogオブジェクトに変換
   */
  static toDog(rawData: RawPetData, sourceUrl: string): Partial<Dog> {
    const location = this.normalizePrefecture(rawData.location as string || '');
    const weight = this.normalizeWeight(rawData.weight as string || '');
    
    return {
      id: rawData.id as string || '',
      name: this.cleanText(rawData.name as string || ''),
      breed: this.cleanText(rawData.breed as string || ''),
      age: this.normalizeAge(rawData.age as string || ''),
      gender: this.normalizeGender(rawData.gender as string || ''),
      size: this.estimateDogSize(rawData.breed as string || '', weight),
      color: this.cleanText(rawData.color as string || ''),
      weight,
      prefecture: location.prefecture,
      city: location.city,
      location: rawData.fullLocation as string || '',
      description: this.cleanText(rawData.description as string || ''),
      personality: this.normalizeArray(rawData.personality as string || ''),
      medicalInfo: this.cleanText(rawData.medicalInfo as string || ''),
      careRequirements: this.normalizeArray(rawData.careRequirements as string || ''),
      imageUrl: rawData.imageUrl as string || '',
      shelterName: this.cleanText(rawData.shelterName as string || ''),
      shelterContact: this.cleanText(rawData.shelterContact as string || ''),
      adoptionFee: rawData.adoptionFee ? parseInt(rawData.adoptionFee as string) : undefined,
      isNeutered: this.normalizeBoolean(rawData.isNeutered as string || ''),
      isVaccinated: this.normalizeBoolean(rawData.isVaccinated as string || ''),
      goodWithKids: this.normalizeBoolean(rawData.goodWithKids as string || ''),
      goodWithDogs: this.normalizeBoolean(rawData.goodWithDogs as string || ''),
      exerciseLevel: '中', // デフォルト値
      trainingLevel: '基本済み', // デフォルト値
      walkFrequency: rawData.walkFrequency as string || '1日2回',
      needsYard: this.normalizeBoolean(rawData.needsYard as string || ''),
      apartmentFriendly: this.normalizeBoolean(rawData.apartmentFriendly as string || ''),
      createdAt: new Date().toISOString(),
      sourceUrl
    };
  }

  /**
   * 生データをCatオブジェクトに変換
   */
  static toCat(rawData: RawPetData, sourceUrl: string): Partial<Cat> {
    const location = this.normalizePrefecture(rawData.location as string || '');
    const weight = this.normalizeWeight(rawData.weight as string || '');
    
    return {
      id: rawData.id as string || '',
      name: this.cleanText(rawData.name as string || ''),
      breed: this.cleanText(rawData.breed as string || ''),
      age: this.normalizeAge(rawData.age as string || ''),
      gender: this.normalizeGender(rawData.gender as string || ''),
      coatLength: this.estimateCoatLength(rawData.breed as string || '', rawData.description as string || ''),
      color: this.cleanText(rawData.color as string || ''),
      weight,
      prefecture: location.prefecture,
      city: location.city,
      location: rawData.fullLocation as string || '',
      description: this.cleanText(rawData.description as string || ''),
      personality: this.normalizeArray(rawData.personality as string || ''),
      medicalInfo: this.cleanText(rawData.medicalInfo as string || ''),
      careRequirements: this.normalizeArray(rawData.careRequirements as string || ''),
      imageUrl: rawData.imageUrl as string || '',
      shelterName: this.cleanText(rawData.shelterName as string || ''),
      shelterContact: this.cleanText(rawData.shelterContact as string || ''),
      adoptionFee: rawData.adoptionFee ? parseInt(rawData.adoptionFee as string) : undefined,
      isNeutered: this.normalizeBoolean(rawData.isNeutered as string || ''),
      isVaccinated: this.normalizeBoolean(rawData.isVaccinated as string || ''),
      isFIVFeLVTested: this.normalizeBoolean(rawData.isFIVFeLVTested as string || ''),
      socialLevel: '普通', // デフォルト値
      indoorOutdoor: '完全室内', // デフォルト値
      goodWithMultipleCats: this.normalizeBoolean(rawData.goodWithMultipleCats as string || ''),
      groomingRequirements: '中', // デフォルト値
      vocalizationLevel: '普通', // デフォルト値
      activityTime: 'どちらでも', // デフォルト値
      playfulness: '中', // デフォルト値
      createdAt: new Date().toISOString(),
      sourceUrl
    };
  }
}