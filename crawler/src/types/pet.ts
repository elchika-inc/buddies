// 基本ペット情報インターface
export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: '男の子' | '女の子' | '不明';
  color: string;
  weight?: number;
  prefecture: string;
  city: string;
  location?: string;
  description: string;
  personality: string[];
  medicalInfo: string;
  careRequirements: string[];
  imageUrl: string;
  shelterName: string;
  shelterContact: string;
  adoptionFee?: number;
  isNeutered?: boolean;
  isVaccinated?: boolean;
  createdAt: string;
  sourceUrl: string;
}

// 犬特有の情報
export interface Dog extends Pet {
  size: '小型犬' | '中型犬' | '大型犬' | '超大型犬';
  goodWithKids?: boolean;
  goodWithDogs?: boolean;
  exerciseLevel: '低' | '中' | '高';
  trainingLevel: '要訓練' | '基本済み' | '高度な訓練済み';
  walkFrequency: string;
  needsYard?: boolean;
  apartmentFriendly?: boolean;
}

// 猫特有の情報
export interface Cat extends Pet {
  coatLength: '短毛' | '長毛';
  isFIVFeLVTested?: boolean;
  socialLevel: '人懐っこい' | '普通' | 'シャイ' | '警戒心強い';
  indoorOutdoor: '完全室内' | 'どちらでも';
  goodWithMultipleCats?: boolean;
  groomingRequirements: '低' | '中' | '高';
  vocalizationLevel: '静か' | '普通' | 'よく鳴く';
  activityTime: '昼型' | '夜型' | 'どちらでも';
  playfulness: '低' | '中' | '高';
}

// クローラー設定
export interface CrawlerConfig {
  baseUrl: string;
  maxPages: number;
  requestDelay: number;
  maxRetries: number;
  timeout: number;
  userAgent: string;
  outputDir: string;
}

// クローリング結果
export interface CrawlingResult {
  success: boolean;
  totalPages: number;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  errors: string[];
  duration: number;
  timestamp: string;
}

// ページ情報
export interface PageInfo {
  url: string;
  pageNumber: number;
  totalPages: number;
  itemsOnPage: number;
}

// 抽出された生データ
export interface RawPetData {
  [key: string]: string | string[] | undefined;
}

export type PetType = 'dog' | 'cat';