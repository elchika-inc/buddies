# PawMatch データ構造設計書

## 1. データ構造概要

### 1.1 データ分類
- **静的データ**: 動物情報、犬種・猫種データ
- **動的データ**: ユーザー操作履歴、お気に入り
- **一時データ**: セッション情報、進捗状況
- **設定データ**: フィルター設定、アプリ設定

### 1.2 データ管理方針
- **TypeScript**: 型安全性を保証
- **イミュータブル**: 状態の不変性を維持
- **正規化**: データの重複を避ける
- **バリデーション**: 入力データの検証

## 2. 基本型定義

### 2.1 共通型定義
```typescript
// 基本型
export type ID = string;
export type Timestamp = Date;
export type UUID = string;

// 列挙型
export type Gender = 'male' | 'female' | 'unknown';
export type Size = 'small' | 'medium' | 'large' | 'extra_large';
export type Species = 'dog' | 'cat';
export type HealthStatus = 'healthy' | 'special_needs' | 'medical_attention';
export type SwipeDirection = 'left' | 'right' | 'up';
export type SwipeResult = 'pass' | 'like' | 'superlike';

// 地理情報
export interface Location {
  prefecture: string;
  city: string;
  ward?: string;
  latitude?: number;
  longitude?: number;
}

// 画像情報
export interface ImageData {
  id: ID;
  url: string;
  alt: string;
  width: number;
  height: number;
  thumbnail?: string;
  blurhash?: string;
}

// 保護団体情報
export interface Organization {
  id: ID;
  name: string;
  type: 'shelter' | 'rescue' | 'individual';
  location: Location;
  contact: {
    email: string;
    phone?: string;
    website?: string;
  };
  description?: string;
  verified: boolean;
  createdAt: Timestamp;
}
```

### 2.2 動物基本情報
```typescript
// 動物基本情報
export interface Animal {
  id: ID;
  name: string;
  species: Species;
  breed: string;
  age: number; // 月単位
  gender: Gender;
  size: Size;
  weight?: number; // kg
  color: string[];
  
  // 画像・メディア
  images: ImageData[];
  videos?: string[];
  
  // 基本情報
  description: string;
  personality: string[];
  specialNeeds: string[];
  healthStatus: HealthStatus;
  medicalNotes?: string;
  
  // 場所・組織
  location: Location;
  organization: Organization;
  
  // メタデータ
  isActive: boolean;
  featured: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // 統計情報
  viewCount: number;
  likeCount: number;
  adoptionStatus: 'available' | 'pending' | 'adopted';
}
```

## 3. 動物種別データ構造

### 3.1 犬専用データ構造
```typescript
// 犬種情報
export interface BreedInfo {
  id: ID;
  name: string;
  category: 'toy' | 'small' | 'medium' | 'large' | 'giant';
  origin: string;
  lifespan: [number, number]; // [min, max] years
  characteristics: {
    energyLevel: 1 | 2 | 3 | 4 | 5;
    trainability: 1 | 2 | 3 | 4 | 5;
    socialNeeds: 1 | 2 | 3 | 4 | 5;
    groomingNeeds: 1 | 2 | 3 | 4 | 5;
  };
  commonHealthIssues: string[];
  description: string;
}

// 犬特有の情報
export interface DogSpecificInfo {
  breed: string;
  breedInfo?: BreedInfo;
  isMixed: boolean;
  mixedBreeds?: string[];
  
  // 運動・行動
  exerciseNeeds: 'low' | 'moderate' | 'high' | 'very_high';
  walkFrequency: number; // 1日あたり回数
  walkDuration: number; // 分
  playfulness: 1 | 2 | 3 | 4 | 5;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  
  // しつけ・訓練
  trainingLevel: 'untrained' | 'basic' | 'intermediate' | 'advanced';
  housebroken: boolean;
  leashTrained: boolean;
  commands: string[];
  behaviorIssues: string[];
  
  // 社会性
  goodWithChildren: boolean;
  goodWithDogs: boolean;
  goodWithCats: boolean;
  goodWithStrangers: boolean;
  
  // 住環境
  apartmentSuitable: boolean;
  yardRequired: boolean;
  yardSize?: 'small' | 'medium' | 'large';
  climatePreference: string[];
  
  // 特殊情報
  guardDog: boolean;
  huntingInstinct: boolean;
  swimmingAbility: boolean;
  noiseLevel: 'quiet' | 'moderate' | 'loud';
}

// 犬の完全な型
export interface Dog extends Animal {
  species: 'dog';
  dogInfo: DogSpecificInfo;
}
```

### 3.2 猫専用データ構造
```typescript
// 猫種情報
export interface CatBreedInfo {
  id: ID;
  name: string;
  origin: string;
  lifespan: [number, number]; // [min, max] years
  characteristics: {
    activityLevel: 1 | 2 | 3 | 4 | 5;
    affectionLevel: 1 | 2 | 3 | 4 | 5;
    socialNeeds: 1 | 2 | 3 | 4 | 5;
    groomingNeeds: 1 | 2 | 3 | 4 | 5;
    vocalization: 1 | 2 | 3 | 4 | 5;
  };
  commonHealthIssues: string[];
  description: string;
}

// 猫特有の情報
export interface CatSpecificInfo {
  breed: string;
  breedInfo?: CatBreedInfo;
  isMixed: boolean;
  mixedBreeds?: string[];
  
  // 外見
  coatLength: 'hairless' | 'short' | 'medium' | 'long';
  coatPattern: string[];
  eyeColor: string;
  
  // 行動・性格
  activityLevel: 1 | 2 | 3 | 4 | 5;
  affectionLevel: 1 | 2 | 3 | 4 | 5;
  socialLevel: 'very_shy' | 'shy' | 'moderate' | 'social' | 'very_social';
  playfulness: 1 | 2 | 3 | 4 | 5;
  
  // 住環境
  indoorOutdoor: 'indoor_only' | 'outdoor_access' | 'both';
  apartmentSuitable: boolean;
  climatePreference: string[];
  
  // 社会性
  goodWithChildren: boolean;
  goodWithCats: boolean;
  goodWithDogs: boolean;
  goodWithStrangers: boolean;
  
  // 特殊情報
  litterBoxTrained: boolean;
  scratchingPostUse: boolean;
  vocalization: 'quiet' | 'moderate' | 'vocal' | 'very_vocal';
  nightActivity: boolean;
  
  // 健康・ケア
  groomingNeeds: 'low' | 'moderate' | 'high';
  specialDiet: string[];
  allergies: string[];
  declawed: boolean;
  
  // 多頭飼い
  multiCatCompatible: boolean;
  preferredCompanionType: 'alone' | 'with_cats' | 'with_dogs' | 'any';
}

// 猫の完全な型
export interface Cat extends Animal {
  species: 'cat';
  catInfo: CatSpecificInfo;
}
```

## 4. ユーザー操作データ

### 4.1 スワイプ操作データ
```typescript
// スワイプアクション
export interface SwipeAction {
  id: ID;
  animalId: ID;
  direction: SwipeDirection;
  result: SwipeResult;
  timestamp: Timestamp;
  
  // 操作詳細
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  duration: number; // ミリ秒
  velocity: number; // px/ms
  
  // コンテキスト
  sessionId: ID;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  inputMethod: 'touch' | 'mouse' | 'keyboard';
}

// スワイプ統計
export interface SwipeStats {
  totalSwipes: number;
  likeCount: number;
  passCount: number;
  superLikeCount: number;
  
  // 比率
  likeRate: number;
  passRate: number;
  superLikeRate: number;
  
  // 時間統計
  averageSwipeTime: number;
  totalTime: number;
  
  // 最新の活動
  lastSwipe: Timestamp;
  lastActive: Timestamp;
}
```

### 4.2 お気に入り管理データ
```typescript
// お気に入りアイテム
export interface FavoriteItem {
  id: ID;
  animalId: ID;
  animal: Animal; // 非正規化データ
  type: 'like' | 'superlike';
  addedAt: Timestamp;
  
  // ユーザーメモ
  note?: string;
  tags?: string[];
  
  // 状態
  isActive: boolean;
  viewed: boolean;
  contacted: boolean;
}

// お気に入りリスト
export interface FavoritesList {
  liked: FavoriteItem[];
  superLiked: FavoriteItem[];
  
  // メタデータ
  lastUpdated: Timestamp;
  totalCount: number;
  
  // 設定
  maxItems: number;
  autoCleanup: boolean;
}
```

### 4.3 履歴管理データ
```typescript
// セッション情報
export interface SwipeSession {
  id: ID;
  startTime: Timestamp;
  endTime?: Timestamp;
  isActive: boolean;
  
  // 進捗
  currentIndex: number;
  totalAnimals: number;
  
  // 統計
  swipeCount: number;
  likeCount: number;
  passCount: number;
  superLikeCount: number;
  
  // 設定
  filters: FilterSettings;
  species: Species;
  
  // メタデータ
  deviceInfo: {
    userAgent: string;
    screenSize: { width: number; height: number };
    deviceType: 'mobile' | 'tablet' | 'desktop';
  };
}

// 履歴データ
export interface SwipeHistory {
  sessions: SwipeSession[];
  actions: SwipeAction[];
  
  // 統計
  stats: SwipeStats;
  
  // 設定
  retentionDays: number;
  maxActions: number;
}
```

## 5. 設定・フィルターデータ

### 5.1 フィルター設定
```typescript
// 基本フィルター
export interface BaseFilter {
  age: {
    min: number;
    max: number;
  };
  gender: Gender[];
  size: Size[];
  location: {
    prefecture: string[];
    maxDistance?: number; // km
  };
  healthStatus: HealthStatus[];
}

// 犬専用フィルター
export interface DogFilter extends BaseFilter {
  breeds: string[];
  exerciseNeeds: ('low' | 'moderate' | 'high' | 'very_high')[];
  trainingLevel: ('untrained' | 'basic' | 'intermediate' | 'advanced')[];
  goodWithChildren: boolean | null;
  goodWithDogs: boolean | null;
  goodWithCats: boolean | null;
  apartmentSuitable: boolean | null;
  yardRequired: boolean | null;
}

// 猫専用フィルター
export interface CatFilter extends BaseFilter {
  breeds: string[];
  coatLength: ('hairless' | 'short' | 'medium' | 'long')[];
  indoorOutdoor: ('indoor_only' | 'outdoor_access' | 'both')[];
  socialLevel: ('very_shy' | 'shy' | 'moderate' | 'social' | 'very_social')[];
  goodWithChildren: boolean | null;
  goodWithCats: boolean | null;
  goodWithDogs: boolean | null;
  multiCatCompatible: boolean | null;
  vocalization: ('quiet' | 'moderate' | 'vocal' | 'very_vocal')[];
}

// フィルター設定
export interface FilterSettings {
  isActive: boolean;
  name?: string;
  species: Species;
  filter: DogFilter | CatFilter;
  
  // メタデータ
  createdAt: Timestamp;
  lastUsed: Timestamp;
  useCount: number;
}
```

### 5.2 アプリケーション設定
```typescript
// アプリ設定
export interface AppSettings {
  // 表示設定
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
  animations: boolean;
  reducedMotion: boolean;
  
  // 通知設定
  notifications: {
    newAnimals: boolean;
    favorites: boolean;
    system: boolean;
  };
  
  // プライバシー設定
  analytics: boolean;
  crashReporting: boolean;
  
  // 機能設定
  autoAdvance: boolean;
  autoAdvanceDelay: number; // 秒
  swipeThreshold: number; // px
  
  // アクセシビリティ
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  
  // デバッグ
  debugMode: boolean;
  
  // メタデータ
  version: string;
  lastUpdated: Timestamp;
}
```

## 6. データ永続化

### 6.1 LocalStorage 設計
```typescript
// LocalStorage キー設計
export const STORAGE_KEYS = {
  // ユーザーデータ
  SWIPE_HISTORY: 'pawmatch:swipe_history',
  FAVORITES: 'pawmatch:favorites',
  CURRENT_SESSION: 'pawmatch:current_session',
  
  // 設定
  APP_SETTINGS: 'pawmatch:app_settings',
  FILTER_SETTINGS: 'pawmatch:filter_settings',
  
  // キャッシュ
  ANIMAL_CACHE: 'pawmatch:animal_cache',
  BREED_CACHE: 'pawmatch:breed_cache',
  
  // 一時データ
  TEMP_DATA: 'pawmatch:temp_data',
} as const;

// ストレージ管理
export interface StorageManager {
  // 基本操作
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
  
  // 高度な操作
  getWithExpiry<T>(key: string): T | null;
  setWithExpiry<T>(key: string, value: T, ttl: number): void;
  
  // バックアップ・復元
  backup(): string;
  restore(data: string): void;
  
  // 容量管理
  getUsage(): number;
  cleanup(): void;
}
```

### 6.2 データキャッシュ
```typescript
// キャッシュエントリ
export interface CacheEntry<T> {
  data: T;
  timestamp: Timestamp;
  ttl: number; // 秒
  version: string;
}

// 動物データキャッシュ
export interface AnimalCache {
  dogs: Map<ID, CacheEntry<Dog>>;
  cats: Map<ID, CacheEntry<Cat>>;
  
  // メタデータ
  lastUpdate: Timestamp;
  version: string;
  
  // 設定
  maxEntries: number;
  defaultTTL: number;
}
```

## 7. データバリデーション

### 7.1 バリデーション関数
```typescript
// 動物データバリデーション
export const validateAnimal = (animal: any): animal is Animal => {
  return (
    typeof animal.id === 'string' &&
    typeof animal.name === 'string' &&
    typeof animal.species === 'string' &&
    ['dog', 'cat'].includes(animal.species) &&
    typeof animal.age === 'number' &&
    animal.age >= 0 &&
    Array.isArray(animal.images) &&
    animal.images.length > 0
  );
};

// スワイプアクションバリデーション
export const validateSwipeAction = (action: any): action is SwipeAction => {
  return (
    typeof action.id === 'string' &&
    typeof action.animalId === 'string' &&
    ['left', 'right', 'up'].includes(action.direction) &&
    ['pass', 'like', 'superlike'].includes(action.result) &&
    action.timestamp instanceof Date
  );
};

// フィルター設定バリデーション
export const validateFilterSettings = (settings: any): settings is FilterSettings => {
  return (
    typeof settings.isActive === 'boolean' &&
    ['dog', 'cat'].includes(settings.species) &&
    typeof settings.filter === 'object' &&
    settings.filter !== null
  );
};
```

### 7.2 データ正規化
```typescript
// 動物データ正規化
export const normalizeAnimal = (animal: any): Animal => {
  return {
    ...animal,
    id: String(animal.id),
    name: String(animal.name).trim(),
    age: Math.max(0, Number(animal.age) || 0),
    images: (animal.images || []).filter(Boolean),
    personality: (animal.personality || []).filter(Boolean),
    specialNeeds: (animal.specialNeeds || []).filter(Boolean),
    createdAt: new Date(animal.createdAt),
    updatedAt: new Date(animal.updatedAt),
    viewCount: Math.max(0, Number(animal.viewCount) || 0),
    likeCount: Math.max(0, Number(animal.likeCount) || 0),
  };
};
```

## 8. パフォーマンス最適化

### 8.1 データ最適化
```typescript
// 遅延読み込み用の軽量データ
export interface AnimalSummary {
  id: ID;
  name: string;
  species: Species;
  primaryImage: string;
  age: number;
  location: string;
  featured: boolean;
}

// ページネーション用データ
export interface PaginatedAnimals {
  data: AnimalSummary[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

### 8.2 メモリ管理
```typescript
// メモリ効率的な状態管理
export interface OptimizedState {
  // 現在表示中のデータのみ保持
  currentAnimals: Animal[];
  currentIndex: number;
  
  // 軽量な履歴データ
  recentActions: SwipeAction[];
  
  // キャッシュ管理
  cache: {
    images: Map<string, string>;
    animals: Map<ID, Animal>;
    lastCleanup: Timestamp;
  };
}
```