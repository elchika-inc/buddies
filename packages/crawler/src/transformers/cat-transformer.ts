import { format } from 'date-fns';
import type { RawPetData } from '../types/index.js';

// PawMatch アプリの Cat 型定義（既存のものを参照）
export type Cat = {
  id: string
  name: string
  breed: string
  age: number
  gender: '男の子' | '女の子'
  coatLength: '短毛' | '長毛'
  color: string
  location: string
  description: string
  personality: string[]
  medicalInfo: string
  careRequirements: string[]
  imageUrl: string
  shelterName: string
  shelterContact: string
  adoptionFee: number
  isNeutered: boolean
  isVaccinated: boolean
  isFIVFeLVTested: boolean
  socialLevel: '人懐っこい' | 'シャイ' | '警戒心強い' | '普通'
  indoorOutdoor: '完全室内' | '室内外自由' | 'どちらでも'
  goodWithMultipleCats: boolean
  groomingRequirements: '低' | '中' | '高'
  vocalizationLevel: '静か' | '普通' | 'よく鳴く' | 'おしゃべり'
  activityTime: '昼型' | '夜型' | 'どちらでも'
  playfulness: '低' | '中' | '高'
  createdAt: string
}

export class CatTransformer {
  /**
   * RawPetData を Cat 型に変換する
   */
  static transform(rawData: RawPetData): Cat {
    return {
      id: this.generateId(rawData),
      name: rawData.name,
      breed: this.transformBreed(rawData.breed),
      age: this.transformAge(rawData.age),
      gender: this.transformGender(rawData.gender),
      coatLength: this.transformCoatLength(rawData.description, rawData.breed),
      color: this.extractColor(rawData.description, rawData.breed),
      location: rawData.location,
      description: rawData.description,
      personality: this.transformPersonality(rawData.personality),
      medicalInfo: this.transformMedicalInfo(rawData),
      careRequirements: this.generateCareRequirements(rawData),
      imageUrl: rawData.imageUrls[0] || '',
      shelterName: rawData.rescueOrganization,
      shelterContact: rawData.contact,
      adoptionFee: rawData.adoptionFee || this.estimateAdoptionFee(),
      isNeutered: rawData.healthInfo?.sterilization || false,
      isVaccinated: rawData.healthInfo?.vaccination || false,
      isFIVFeLVTested: this.inferFIVFeLVTested(rawData),
      socialLevel: this.inferSocialLevel(rawData),
      indoorOutdoor: this.inferIndoorOutdoor(rawData),
      goodWithMultipleCats: this.inferMultiCatFriendly(rawData),
      groomingRequirements: this.inferGroomingRequirements(rawData),
      vocalizationLevel: this.inferVocalizationLevel(rawData),
      activityTime: this.inferActivityTime(rawData),
      playfulness: this.inferPlayfulness(rawData),
      createdAt: format(rawData.scrapedAt, 'yyyy-MM-dd'),
    };
  }

  /**
   * 複数のRawPetDataをCat型の配列に変換する
   */
  static transformMany(rawDataArray: RawPetData[]): Cat[] {
    return rawDataArray
      .filter(data => data.species === 'cat')
      .map(data => this.transform(data));
  }

  private static generateId(rawData: RawPetData): string {
    // URLまたは名前+組織名のハッシュからIDを生成
    const baseString = rawData.sourceUrl || `${rawData.name}-${rawData.rescueOrganization}`;
    return btoa(baseString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private static transformBreed(breed: string): string {
    // 品種名の正規化
    const normalized = breed
      .replace(/（.*?）/g, '') // 括弧内を削除
      .replace(/\(.*?\)/g, '')
      .trim();
    
    return normalized || '雑種';
  }

  private static transformAge(ageString: string): number {
    // 年齢文字列から数値を抽出
    const match = ageString.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    // 「子猫」「成猫」「シニア」などの表現を数値に変換
    if (ageString.includes('子猫') || ageString.includes('キトン')) return 1;
    if (ageString.includes('若') || ageString.includes('成猫')) return 3;
    if (ageString.includes('シニア') || ageString.includes('高齢')) return 8;
    
    return 3; // デフォルト値
  }

  private static transformGender(gender: string): '男の子' | '女の子' {
    return gender === 'male' ? '男の子' : '女の子';
  }

  private static transformCoatLength(description: string, breed: string): '短毛' | '長毛' {
    const text = `${description} ${breed}`;
    
    // 長毛種の品種名
    const longHairBreeds = [
      'ペルシャ', 'メインクーン', 'ラガマフィン', 'ノルウェージャンフォレスト',
      'ターキッシュアンゴラ', 'バーマン', 'ソマリ'
    ];
    
    if (longHairBreeds.some(longBreed => text.includes(longBreed))) {
      return '長毛';
    }
    
    if (text.includes('長毛') || text.includes('ロング')) return '長毛';
    return '短毛';
  }

  private static extractColor(description: string, breed: string): string {
    const colors = [
      '白', '黒', '茶', 'グレー', 'シルバー', 'クリーム', 'ブルー',
      '三毛', 'キジトラ', '茶トラ', 'サビ', 'ハチワレ', '縞三毛',
      'シルバータビー', 'ブラウンタビー', 'ルディ', 'チョコレート',
      'ライラック', 'シールポイント', 'ブルーポイント', 'ピンクポイント'
    ];
    
    const text = `${description} ${breed}`;
    const foundColor = colors.find(color => text.includes(color));
    
    return foundColor || 'キジトラ';
  }

  private static transformPersonality(personality?: string[]): string[] {
    if (!personality || personality.length === 0) {
      return ['人懐っこい', '穏やか'];
    }
    return personality;
  }

  private static transformMedicalInfo(rawData: RawPetData): string {
    const parts: string[] = [];
    
    if (rawData.healthInfo?.vaccination) {
      parts.push('ワクチン接種済み');
    }
    if (rawData.healthInfo?.sterilization) {
      parts.push(rawData.gender === 'male' ? '去勢手術済み' : '避妊手術済み');
    }
    if (rawData.healthInfo?.healthCondition) {
      parts.push(rawData.healthInfo.healthCondition);
    }
    
    return parts.length > 0 ? parts.join('、') : '健康状態良好';
  }

  private static generateCareRequirements(rawData: RawPetData): string[] {
    const requirements: string[] = [];
    
    // 毛の長さに基づく要件
    if (rawData.description.includes('長毛')) {
      requirements.push('毎日のブラッシング');
      requirements.push('長毛種ケア');
    }
    
    // 年齢に基づく要件
    const age = this.transformAge(rawData.age);
    if (age >= 7) {
      requirements.push('シニア用フード');
      requirements.push('定期健診');
    }
    
    // 健康状態に基づく要件
    if (rawData.healthInfo?.specialCare) {
      requirements.push(...rawData.healthInfo.specialCare);
    }
    
    // デフォルトの要件
    if (requirements.length === 0) {
      requirements.push('定期的なブラッシング', '愛情深いケア');
    }
    
    return requirements;
  }

  private static estimateAdoptionFee(): number {
    // 猫の一般的な譲渡費用
    return 25000;
  }

  private static inferFIVFeLVTested(rawData: RawPetData): boolean {
    const text = `${rawData.description} ${rawData.healthInfo?.healthCondition || ''}`;
    return text.includes('FIV') || text.includes('FeLV') || text.includes('陰性') || text.includes('検査済み');
  }

  private static inferSocialLevel(rawData: RawPetData): '人懐っこい' | 'シャイ' | '警戒心強い' | '普通' {
    const text = `${rawData.description} ${rawData.personality?.join(' ') || ''}`;
    
    if (text.includes('警戒心') && text.includes('強い')) return '警戒心強い';
    if (text.includes('シャイ') || text.includes('恥ずかしがり') || text.includes('人見知り')) return 'シャイ';
    if (text.includes('人懐っこい') || text.includes('甘えん坊') || text.includes('フレンドリー')) return '人懐っこい';
    
    return '普通';
  }

  private static inferIndoorOutdoor(rawData: RawPetData): '完全室内' | '室内外自由' | 'どちらでも' {
    const text = `${rawData.description}`;
    
    if (text.includes('完全室内') || text.includes('室内のみ')) return '完全室内';
    if (text.includes('室内外自由') || text.includes('外にも出る')) return '室内外自由';
    
    return '完全室内'; // デフォルトは完全室内飼い
  }

  private static inferMultiCatFriendly(rawData: RawPetData): boolean {
    const text = `${rawData.description} ${rawData.personality?.join(' ') || ''}`;
    
    if (text.includes('多頭飼い') && text.includes('苦手')) return false;
    if (text.includes('他の猫') && text.includes('苦手')) return false;
    if (text.includes('多頭飼い') || text.includes('猫同士仲良し')) return true;
    
    // 若い猫は一般的に他の猫と仲良くしやすい
    const age = this.transformAge(rawData.age);
    return age <= 3;
  }

  private static inferGroomingRequirements(rawData: RawPetData): '低' | '中' | '高' {
    const text = `${rawData.description} ${rawData.breed}`;
    
    // 長毛種は高いグルーミング要件
    if (text.includes('長毛') || text.includes('ペルシャ') || text.includes('メインクーン')) {
      return '高';
    }
    
    if (text.includes('ブラッシング') && text.includes('必要')) return '高';
    if (text.includes('短毛')) return '低';
    
    return '低';
  }

  private static inferVocalizationLevel(rawData: RawPetData): '静か' | '普通' | 'よく鳴く' | 'おしゃべり' {
    const text = `${rawData.description} ${rawData.personality?.join(' ') || ''}`;
    
    if (text.includes('おしゃべり') || text.includes('お話し好き')) return 'おしゃべり';
    if (text.includes('よく鳴く') || text.includes('鳴き声が多い')) return 'よく鳴く';
    if (text.includes('静か') || text.includes('無口')) return '静か';
    
    // シャム系は一般的におしゃべり
    if (text.includes('シャム') || text.includes('ポイント')) return 'おしゃべり';
    
    return '普通';
  }

  private static inferActivityTime(rawData: RawPetData): '昼型' | '夜型' | 'どちらでも' {
    const text = `${rawData.description} ${rawData.personality?.join(' ') || ''}`;
    
    if (text.includes('夜型') || text.includes('夜行性') || text.includes('夜の活動')) return '夜型';
    if (text.includes('昼型') || text.includes('朝型')) return '昼型';
    
    return 'どちらでも';
  }

  private static inferPlayfulness(rawData: RawPetData): '低' | '中' | '高' {
    const text = `${rawData.description} ${rawData.personality?.join(' ') || ''}`;
    
    if (text.includes('遊び好き') || text.includes('活発') || text.includes('好奇心旺盛')) return '高';
    if (text.includes('のんびり') || text.includes('落ち着いている') || text.includes('穏やか')) return '低';
    
    // 年齢に基づく推定
    const age = this.transformAge(rawData.age);
    if (age <= 2) return '高';
    if (age >= 7) return '低';
    
    return '中';
  }
}