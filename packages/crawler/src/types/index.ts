// 基本的なペット情報の型定義
export interface RawPetData {
  name: string;
  species: 'dog' | 'cat';
  breed: string;
  age: string;
  gender: 'male' | 'female';
  weight?: string;
  size?: string;
  description: string;
  imageUrls: string[];
  location: string;
  rescueOrganization: string;
  contact: string;
  adoptionFee?: number;
  healthInfo?: {
    vaccination?: boolean;
    sterilization?: boolean;
    healthCondition?: string;
    specialCare?: string[];
  };
  personality?: string[];
  sourceUrl: string;
  scrapedAt: Date;
}

// 犬専用の情報
export interface DogSpecificData {
  exerciseNeeds?: string;
  walkFrequency?: string;
  yardRequired?: boolean;
  childFriendly?: boolean;
  otherDogFriendly?: boolean;
  trainingLevel?: string;
  apartmentFriendly?: boolean;
}

// 猫専用の情報
export interface CatSpecificData {
  coatLength?: 'short' | 'long';
  indoorOutdoor?: 'indoor' | 'outdoor' | 'both';
  multiCatFriendly?: boolean;
  vocalLevel?: string;
  activityTime?: string;
  groomingRequirements?: string;
}

// 完全なペットデータ
export interface CompletePetData extends RawPetData {
  dogSpecific?: DogSpecificData;
  catSpecific?: CatSpecificData;
}

// クローラー設定
export interface CrawlerConfig {
  baseUrl: string;
  maxPages?: number;
  delayMs?: number;
  outputDir?: string;
  enableImages?: boolean;
  userAgent?: string;
}

// クローラー結果
export interface CrawlerResult {
  success: boolean;
  itemsFound: number;
  itemsProcessed: number;
  errors: string[];
  outputFile?: string;
  duration: number;
}