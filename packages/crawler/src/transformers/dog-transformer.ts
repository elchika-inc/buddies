import { format } from 'date-fns';
import type { RawPetData } from '../types/index.js';

// PawMatch アプリの Dog 型定義（既存のものを参照）
export type Dog = {
  id: string
  name: string
  breed: string
  age: number
  gender: '男の子' | '女の子'
  size: '小型犬' | '中型犬' | '大型犬' | '超大型犬'
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
  goodWithKids: boolean
  goodWithOtherDogs: boolean
  exerciseLevel: '低' | '中' | '高'
  trainingLevel: '基本済み' | '要訓練' | '高度な訓練済み'
  walkFrequency: '1日1回' | '1日2回' | '1日3回以上'
  needsYard: boolean
  apartmentFriendly: boolean
  createdAt: string
}

export class DogTransformer {
  /**
   * RawPetData を Dog 型に変換する
   */
  static transform(rawData: RawPetData): Dog {
    return {
      id: this.generateId(rawData),
      name: rawData.name,
      breed: this.transformBreed(rawData.breed),
      age: this.transformAge(rawData.age),
      gender: this.transformGender(rawData.gender),
      size: this.transformSize(rawData.size),
      color: this.extractColor(rawData.description, rawData.breed),
      location: rawData.location,
      description: rawData.description,
      personality: this.transformPersonality(rawData.personality),
      medicalInfo: this.transformMedicalInfo(rawData),
      careRequirements: this.generateCareRequirements(rawData),
      imageUrl: rawData.imageUrls[0] || '',
      shelterName: rawData.rescueOrganization,
      shelterContact: rawData.contact,
      adoptionFee: rawData.adoptionFee || this.estimateAdoptionFee(rawData.size),
      isNeutered: rawData.healthInfo?.sterilization || false,
      isVaccinated: rawData.healthInfo?.vaccination || false,
      goodWithKids: this.inferChildFriendly(rawData),
      goodWithOtherDogs: this.inferDogFriendly(rawData),
      exerciseLevel: this.inferExerciseLevel(rawData),
      trainingLevel: this.inferTrainingLevel(rawData),
      walkFrequency: this.inferWalkFrequency(rawData),
      needsYard: this.inferYardNeeds(rawData),
      apartmentFriendly: this.inferApartmentFriendly(rawData),
      createdAt: format(rawData.scrapedAt, 'yyyy-MM-dd'),
    };
  }

  /**
   * 複数のRawPetDataをDog型の配列に変換する
   */
  static transformMany(rawDataArray: RawPetData[]): Dog[] {
    return rawDataArray
      .filter(data => data.species === 'dog')
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
    
    // 「子犬」「若犬」「シニア」などの表現を数値に変換
    if (ageString.includes('子犬') || ageString.includes('パピー')) return 1;
    if (ageString.includes('若') || ageString.includes('成')) return 3;
    if (ageString.includes('シニア') || ageString.includes('高齢')) return 8;
    
    return 3; // デフォルト値
  }

  private static transformGender(gender: string): '男の子' | '女の子' {
    return gender === 'male' ? '男の子' : '女の子';
  }

  private static transformSize(size?: string): '小型犬' | '中型犬' | '大型犬' | '超大型犬' {
    if (!size) return '中型犬';
    
    const sizeStr = size.toLowerCase();
    if (sizeStr.includes('小') || sizeStr.includes('small')) return '小型犬';
    if (sizeStr.includes('中') || sizeStr.includes('medium')) return '中型犬';
    if (sizeStr.includes('大') || sizeStr.includes('large')) return '大型犬';
    if (sizeStr.includes('超大') || sizeStr.includes('giant')) return '超大型犬';
    
    return '中型犬';
  }

  private static extractColor(description: string, breed: string): string {
    const colors = [
      '白', '黒', '茶', '金', 'ゴールド', 'クリーム', 'グレー', 'シルバー',
      'ブラウン', 'チョコレート', '赤毛', 'フォーン', 'ブリンドル',
      'トライカラー', 'バイカラー', 'パーティー'
    ];
    
    const text = `${description} ${breed}`;
    const foundColor = colors.find(color => text.includes(color));
    
    return foundColor || '茶';
  }

  private static transformPersonality(personality?: string[]): string[] {
    if (!personality || personality.length === 0) {
      return ['人懐っこい', '元気'];
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
    
    // サイズに基づく基本的な要件
    if (rawData.size?.includes('大')) {
      requirements.push('十分な運動');
      requirements.push('広いスペース');
    } else if (rawData.size?.includes('小')) {
      requirements.push('小型犬用の環境');
      requirements.push('温度管理');
    }
    
    // 健康状態に基づく要件
    if (rawData.healthInfo?.specialCare) {
      requirements.push(...rawData.healthInfo.specialCare);
    }
    
    // デフォルトの要件
    if (requirements.length === 0) {
      requirements.push('毎日の散歩', '愛情深いケア');
    }
    
    return requirements;
  }

  private static estimateAdoptionFee(size?: string): number {
    // サイズに基づく譲渡費用の推定
    if (size?.includes('小')) return 25000;
    if (size?.includes('中')) return 30000;
    if (size?.includes('大')) return 35000;
    return 30000;
  }

  private static inferChildFriendly(rawData: RawPetData): boolean {
    const text = `${rawData.description} ${rawData.personality?.join(' ') || ''}`;
    
    if (text.includes('子供') && text.includes('苦手')) return false;
    if (text.includes('子供好き') || text.includes('家族向け')) return true;
    
    // デフォルトは中型犬以下なら子供に優しいと仮定
    return !rawData.size?.includes('大');
  }

  private static inferDogFriendly(rawData: RawPetData): boolean {
    const text = `${rawData.description} ${rawData.personality?.join(' ') || ''}`;
    
    if (text.includes('他の犬') && text.includes('苦手')) return false;
    if (text.includes('多頭飼い') || text.includes('犬好き')) return true;
    
    return true; // デフォルトは友好的
  }

  private static inferExerciseLevel(rawData: RawPetData): '低' | '中' | '高' {
    const text = `${rawData.description} ${rawData.breed}`;
    
    // 品種に基づく判定
    if (text.includes('ボーダーコリー') || text.includes('ハスキー') || text.includes('ジャックラッセル')) {
      return '高';
    }
    
    // サイズに基づく判定
    if (rawData.size?.includes('大')) return '高';
    if (rawData.size?.includes('小')) return '低';
    
    return '中';
  }

  private static inferTrainingLevel(rawData: RawPetData): '基本済み' | '要訓練' | '高度な訓練済み' {
    const text = `${rawData.description} ${rawData.personality?.join(' ') || ''}`;
    
    if (text.includes('しつけ済み') || text.includes('トレーニング済み')) return '高度な訓練済み';
    if (text.includes('基本') && text.includes('しつけ')) return '基本済み';
    
    // 年齢に基づく推定
    const age = this.transformAge(rawData.age);
    if (age >= 3) return '基本済み';
    
    return '要訓練';
  }

  private static inferWalkFrequency(rawData: RawPetData): '1日1回' | '1日2回' | '1日3回以上' {
    // サイズと運動レベルに基づく判定
    if (rawData.size?.includes('大')) return '1日3回以上';
    if (rawData.size?.includes('小')) return '1日2回';
    
    return '1日2回';
  }

  private static inferYardNeeds(rawData: RawPetData): boolean {
    // 大型犬は庭が必要
    return rawData.size?.includes('大') || false;
  }

  private static inferApartmentFriendly(rawData: RawPetData): boolean {
    const text = `${rawData.description}`;
    
    if (text.includes('アパート') || text.includes('マンション')) return true;
    
    // 小型犬・中型犬はアパート向け
    return !rawData.size?.includes('大');
  }
}