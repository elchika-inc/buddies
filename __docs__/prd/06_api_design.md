# PawMatch API設計書

## 1. API概要

### 1.1 API方針
- **現在**: 静的データ（JSON）による実装
- **将来**: RESTful API への移行対応
- **互換性**: 段階的な移行を可能にする設計
- **型安全**: TypeScript型定義と完全同期

### 1.2 現在の実装方式
```typescript
// 静的データファイル構造
src/data/
├── animals.ts          # 全動物データ
├── dogs.ts            # 犬データ
├── cats.ts            # 猫データ
├── breeds.ts          # 犬種・猫種データ
├── organizations.ts   # 保護団体データ
└── locations.ts       # 地域データ
```

## 2. データ提供API

### 2.1 動物データAPI
```typescript
// 現在の実装
export interface AnimalDataAPI {
  // 全動物取得
  getAllAnimals(): Promise<Animal[]>;
  
  // 動物種別取得
  getDogs(): Promise<Dog[]>;
  getCats(): Promise<Cat[]>;
  
  // 個別動物取得
  getAnimalById(id: string): Promise<Animal | null>;
  
  // フィルター付き検索
  searchAnimals(filter: AnimalFilter): Promise<Animal[]>;
  
  // ページネーション
  getAnimalsPage(page: number, limit: number): Promise<PaginatedAnimals>;
}

// 具体的な実装例
export const animalAPI: AnimalDataAPI = {
  async getAllAnimals(): Promise<Animal[]> {
    // 静的データから取得
    return [...dogsData, ...catsData];
  },
  
  async getDogs(): Promise<Dog[]> {
    return dogsData;
  },
  
  async getCats(): Promise<Cat[]> {
    return catsData;
  },
  
  async getAnimalById(id: string): Promise<Animal | null> {
    const allAnimals = await this.getAllAnimals();
    return allAnimals.find(animal => animal.id === id) || null;
  },
  
  async searchAnimals(filter: AnimalFilter): Promise<Animal[]> {
    const allAnimals = await this.getAllAnimals();
    return filterAnimals(allAnimals, filter);
  },
  
  async getAnimalsPage(page: number, limit: number): Promise<PaginatedAnimals> {
    const allAnimals = await this.getAllAnimals();
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      data: allAnimals.slice(startIndex, endIndex),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(allAnimals.length / limit),
        totalItems: allAnimals.length,
        itemsPerPage: limit,
        hasNext: endIndex < allAnimals.length,
        hasPrevious: page > 1
      }
    };
  }
};
```

### 2.2 犬種・猫種データAPI
```typescript
export interface BreedDataAPI {
  // 全犬種取得
  getAllDogBreeds(): Promise<DogBreed[]>;
  
  // 全猫種取得
  getAllCatBreeds(): Promise<CatBreed[]>;
  
  // 犬種検索
  searchDogBreeds(query: string): Promise<DogBreed[]>;
  
  // 猫種検索
  searchCatBreeds(query: string): Promise<CatBreed[]>;
  
  // 人気犬種取得
  getPopularDogBreeds(): Promise<DogBreed[]>;
  
  // 人気猫種取得
  getPopularCatBreeds(): Promise<CatBreed[]>;
}

// 実装例
export const breedAPI: BreedDataAPI = {
  async getAllDogBreeds(): Promise<DogBreed[]> {
    return dogBreedsData;
  },
  
  async getAllCatBreeds(): Promise<CatBreed[]> {
    return catBreedsData;
  },
  
  async searchDogBreeds(query: string): Promise<DogBreed[]> {
    return dogBreedsData.filter(breed =>
      breed.name.toLowerCase().includes(query.toLowerCase()) ||
      breed.alternativeNames?.some(name =>
        name.toLowerCase().includes(query.toLowerCase())
      )
    );
  },
  
  async searchCatBreeds(query: string): Promise<CatBreed[]> {
    return catBreedsData.filter(breed =>
      breed.name.toLowerCase().includes(query.toLowerCase()) ||
      breed.alternativeNames?.some(name =>
        name.toLowerCase().includes(query.toLowerCase())
      )
    );
  },
  
  async getPopularDogBreeds(): Promise<DogBreed[]> {
    return dogBreedsData
      .filter(breed => breed.popularity > 7)
      .sort((a, b) => b.popularity - a.popularity);
  },
  
  async getPopularCatBreeds(): Promise<CatBreed[]> {
    return catBreedsData
      .filter(breed => breed.popularity > 7)
      .sort((a, b) => b.popularity - a.popularity);
  }
};
```

### 2.3 地域データAPI
```typescript
export interface LocationDataAPI {
  // 全都道府県取得
  getPrefectures(): Promise<Prefecture[]>;
  
  // 都道府県の市区町村取得
  getCities(prefectureId: string): Promise<City[]>;
  
  // 地域検索
  searchLocations(query: string): Promise<Location[]>;
  
  // 近隣地域取得
  getNearbyLocations(latitude: number, longitude: number, radius: number): Promise<Location[]>;
}
```

## 3. 将来のRESTful API設計

### 3.1 エンドポイント設計
```typescript
// 基本URL
const BASE_URL = 'https://api.pawmatch.jp/v1';

// 動物関連エンドポイント
export const ANIMAL_ENDPOINTS = {
  // 動物一覧
  ANIMALS: '/animals',
  // 個別動物
  ANIMAL_BY_ID: (id: string) => `/animals/${id}`,
  // 犬一覧
  DOGS: '/animals/dogs',
  // 猫一覧
  CATS: '/animals/cats',
  // 検索
  SEARCH: '/animals/search',
  // フィルター
  FILTER: '/animals/filter',
  // 人気動物
  POPULAR: '/animals/popular',
  // 新着動物
  RECENT: '/animals/recent',
  // 動物統計
  STATS: '/animals/stats',
} as const;

// 犬種・猫種関連エンドポイント
export const BREED_ENDPOINTS = {
  // 犬種一覧
  DOG_BREEDS: '/breeds/dogs',
  // 猫種一覧
  CAT_BREEDS: '/breeds/cats',
  // 犬種検索
  DOG_BREED_SEARCH: '/breeds/dogs/search',
  // 猫種検索
  CAT_BREED_SEARCH: '/breeds/cats/search',
  // 人気犬種
  POPULAR_DOG_BREEDS: '/breeds/dogs/popular',
  // 人気猫種
  POPULAR_CAT_BREEDS: '/breeds/cats/popular',
} as const;

// 保護団体関連エンドポイント
export const ORGANIZATION_ENDPOINTS = {
  // 保護団体一覧
  ORGANIZATIONS: '/organizations',
  // 個別保護団体
  ORGANIZATION_BY_ID: (id: string) => `/organizations/${id}`,
  // 保護団体検索
  SEARCH: '/organizations/search',
  // 地域別保護団体
  BY_LOCATION: '/organizations/by-location',
} as const;
```

### 3.2 リクエスト・レスポンス仕様
```typescript
// 共通レスポンス形式
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationInfo;
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

// エラーレスポンス形式
export interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// 動物検索リクエスト
export interface AnimalSearchRequest {
  species?: 'dog' | 'cat';
  breed?: string;
  age?: {
    min?: number;
    max?: number;
  };
  gender?: 'male' | 'female';
  size?: 'small' | 'medium' | 'large';
  location?: {
    prefecture?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    radius?: number; // km
  };
  healthStatus?: 'healthy' | 'special_needs' | 'medical_attention';
  
  // ページネーション
  page?: number;
  limit?: number;
  
  // ソート
  sort?: 'created_at' | 'updated_at' | 'popularity' | 'distance';
  order?: 'asc' | 'desc';
}

// 動物検索レスポンス
export interface AnimalSearchResponse extends APIResponse<Animal[]> {
  pagination: PaginationInfo;
  filters: {
    applied: AnimalSearchRequest;
    available: {
      breeds: string[];
      locations: string[];
      ageRange: { min: number; max: number };
    };
  };
}
```

### 3.3 認証・認可設計
```typescript
// 認証トークン
export interface AuthToken {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string[];
}

// ユーザー情報
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

// ユーザー設定
export interface UserPreferences {
  species: 'dog' | 'cat' | 'both';
  location: Location;
  notifications: {
    newAnimals: boolean;
    favorites: boolean;
    system: boolean;
  };
  privacy: {
    shareActivity: boolean;
    allowMarketing: boolean;
  };
}
```

## 4. データ変換・適応レイヤー

### 4.1 静的データ→API変換
```typescript
// 静的データからAPI形式への変換
export class StaticDataAdapter {
  // 動物データ変換
  static toAPIFormat(animal: Animal): APIAnimal {
    return {
      id: animal.id,
      name: animal.name,
      species: animal.species,
      breed: animal.breed,
      age: animal.age,
      gender: animal.gender,
      size: animal.size,
      images: animal.images.map(img => ({
        url: img.url,
        alt: img.alt,
        thumbnail: img.thumbnail
      })),
      location: {
        prefecture: animal.location.prefecture,
        city: animal.location.city,
        coordinates: {
          latitude: animal.location.latitude,
          longitude: animal.location.longitude
        }
      },
      organization: {
        id: animal.organization.id,
        name: animal.organization.name,
        contact: animal.organization.contact
      },
      createdAt: animal.createdAt.toISOString(),
      updatedAt: animal.updatedAt.toISOString()
    };
  }
  
  // API形式から内部形式への変換
  static fromAPIFormat(apiAnimal: APIAnimal): Animal {
    return {
      id: apiAnimal.id,
      name: apiAnimal.name,
      species: apiAnimal.species,
      breed: apiAnimal.breed,
      age: apiAnimal.age,
      gender: apiAnimal.gender,
      size: apiAnimal.size,
      images: apiAnimal.images.map(img => ({
        id: generateId(),
        url: img.url,
        alt: img.alt,
        thumbnail: img.thumbnail,
        width: 400,
        height: 300
      })),
      location: {
        prefecture: apiAnimal.location.prefecture,
        city: apiAnimal.location.city,
        latitude: apiAnimal.location.coordinates?.latitude,
        longitude: apiAnimal.location.coordinates?.longitude
      },
      organization: {
        id: apiAnimal.organization.id,
        name: apiAnimal.organization.name,
        type: 'shelter',
        contact: apiAnimal.organization.contact,
        location: apiAnimal.location,
        verified: true,
        createdAt: new Date()
      },
      createdAt: new Date(apiAnimal.createdAt),
      updatedAt: new Date(apiAnimal.updatedAt)
    } as Animal;
  }
}
```

### 4.2 キャッシュ戦略
```typescript
// APIキャッシュ管理
export class APICache {
  private cache = new Map<string, CacheEntry>();
  
  // キャッシュキー生成
  private generateKey(endpoint: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramString}`;
  }
  
  // キャッシュ取得
  get<T>(endpoint: string, params?: any): T | null {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // 有効期限チェック
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  // キャッシュ設定
  set<T>(endpoint: string, data: T, ttl: number = 300000, params?: any): void {
    const key = this.generateKey(endpoint, params);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };
    
    this.cache.set(key, entry);
  }
  
  // キャッシュクリア
  clear(): void {
    this.cache.clear();
  }
  
  // 期限切れキャッシュ削除
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}
```

## 5. エラーハンドリング

### 5.1 エラー分類
```typescript
// APIエラータイプ
export enum APIErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN'
}

// APIエラークラス
export class APIError extends Error {
  constructor(
    public type: APIErrorType,
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// エラーハンドラー
export class ErrorHandler {
  static handle(error: any): APIError {
    // ネットワークエラー
    if (error.code === 'NETWORK_ERROR') {
      return new APIError(
        APIErrorType.NETWORK_ERROR,
        'ネットワークに接続できません',
        0,
        error
      );
    }
    
    // タイムアウト
    if (error.code === 'TIMEOUT') {
      return new APIError(
        APIErrorType.TIMEOUT,
        'リクエストがタイムアウトしました',
        408,
        error
      );
    }
    
    // HTTPエラー
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 404:
          return new APIError(
            APIErrorType.NOT_FOUND,
            'リソースが見つかりません',
            404,
            data
          );
        case 422:
          return new APIError(
            APIErrorType.VALIDATION_ERROR,
            '入力データに問題があります',
            422,
            data
          );
        case 429:
          return new APIError(
            APIErrorType.RATE_LIMIT,
            'リクエストが多すぎます',
            429,
            data
          );
        case 500:
          return new APIError(
            APIErrorType.SERVER_ERROR,
            'サーバーエラーが発生しました',
            500,
            data
          );
        default:
          return new APIError(
            APIErrorType.UNKNOWN,
            '予期しないエラーが発生しました',
            status,
            data
          );
      }
    }
    
    // その他のエラー
    return new APIError(
      APIErrorType.UNKNOWN,
      error.message || '予期しないエラーが発生しました',
      undefined,
      error
    );
  }
}
```

### 5.2 リトライ機構
```typescript
// リトライ設定
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: APIErrorType[];
}

// リトライ機能付きAPIクライアント
export class RetryableAPIClient {
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryableErrors: [
      APIErrorType.NETWORK_ERROR,
      APIErrorType.TIMEOUT,
      APIErrorType.SERVER_ERROR
    ]
  };
  
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    let lastError: APIError;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await this.makeRequest<T>(endpoint, options);
      } catch (error) {
        lastError = ErrorHandler.handle(error);
        
        // リトライ不可能なエラー
        if (!this.retryConfig.retryableErrors.includes(lastError.type)) {
          throw lastError;
        }
        
        // 最後の試行
        if (attempt === this.retryConfig.maxRetries) {
          throw lastError;
        }
        
        // 待機時間計算（指数バックオフ）
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt),
          this.retryConfig.maxDelay
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
  
  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<T> {
    // 実際のHTTPリクエスト実装
    // 現在は静的データを返す
    return this.getStaticData<T>(endpoint, options);
  }
  
  private async getStaticData<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<T> {
    // 静的データアクセス
    switch (endpoint) {
      case ANIMAL_ENDPOINTS.ANIMALS:
        return animalAPI.getAllAnimals() as Promise<T>;
      case ANIMAL_ENDPOINTS.DOGS:
        return animalAPI.getDogs() as Promise<T>;
      case ANIMAL_ENDPOINTS.CATS:
        return animalAPI.getCats() as Promise<T>;
      default:
        throw new APIError(
          APIErrorType.NOT_FOUND,
          `エンドポイント ${endpoint} は存在しません`
        );
    }
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}
```

## 6. テスト用モックAPI

### 6.1 モックデータ生成
```typescript
// モックデータ生成器
export class MockDataGenerator {
  // ランダム動物生成
  static generateRandomAnimal(species: Species): Animal {
    const baseAnimal = {
      id: generateId(),
      name: this.generateRandomName(),
      species,
      age: Math.floor(Math.random() * 120) + 1,
      gender: Math.random() > 0.5 ? 'male' : 'female',
      size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
      images: [
        {
          id: generateId(),
          url: `https://example.com/animal-${generateId()}.jpg`,
          alt: '動物の写真',
          width: 400,
          height: 300
        }
      ],
      description: 'Generated mock animal',
      personality: ['friendly', 'playful'],
      specialNeeds: [],
      healthStatus: 'healthy',
      location: {
        prefecture: '東京都',
        city: '渋谷区'
      },
      organization: {
        id: generateId(),
        name: 'テスト保護団体',
        type: 'shelter',
        contact: { email: 'test@example.com' },
        location: { prefecture: '東京都', city: '渋谷区' },
        verified: true,
        createdAt: new Date()
      },
      isActive: true,
      featured: false,
      viewCount: 0,
      likeCount: 0,
      adoptionStatus: 'available',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (species === 'dog') {
      return {
        ...baseAnimal,
        dogInfo: {
          breed: 'MIX',
          isMixed: true,
          exerciseNeeds: 'moderate',
          walkFrequency: 2,
          walkDuration: 30,
          playfulness: 3,
          energyLevel: 3,
          trainingLevel: 'basic',
          housebroken: true,
          leashTrained: true,
          commands: ['sit', 'stay'],
          behaviorIssues: [],
          goodWithChildren: true,
          goodWithDogs: true,
          goodWithCats: false,
          goodWithStrangers: true,
          apartmentSuitable: true,
          yardRequired: false,
          climatePreference: ['temperate'],
          guardDog: false,
          huntingInstinct: false,
          swimmingAbility: false,
          noiseLevel: 'moderate'
        }
      } as Dog;
    } else {
      return {
        ...baseAnimal,
        catInfo: {
          breed: 'MIX',
          isMixed: true,
          coatLength: 'short',
          coatPattern: ['solid'],
          eyeColor: 'green',
          activityLevel: 3,
          affectionLevel: 3,
          socialLevel: 'moderate',
          playfulness: 3,
          indoorOutdoor: 'indoor_only',
          apartmentSuitable: true,
          climatePreference: ['temperate'],
          goodWithChildren: true,
          goodWithCats: true,
          goodWithDogs: false,
          goodWithStrangers: false,
          litterBoxTrained: true,
          scratchingPostUse: true,
          vocalization: 'moderate',
          nightActivity: false,
          groomingNeeds: 'low',
          specialDiet: [],
          allergies: [],
          declawed: false,
          multiCatCompatible: true,
          preferredCompanionType: 'alone'
        }
      } as Cat;
    }
  }
  
  private static generateRandomName(): string {
    const names = [
      'ポチ', 'タマ', 'ハチ', 'ミケ', 'クロ', 'シロ',
      'チョコ', 'ミルク', 'ココア', 'モモ', 'サクラ', 'ユキ'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }
}
```

### 6.2 モックAPIサーバー
```typescript
// 開発用モックAPIサーバー
export class MockAPIServer {
  private animals: Animal[] = [];
  
  constructor() {
    // 初期データ生成
    this.generateInitialData();
  }
  
  private generateInitialData(): void {
    // 犬100匹、猫100匹を生成
    for (let i = 0; i < 100; i++) {
      this.animals.push(MockDataGenerator.generateRandomAnimal('dog'));
      this.animals.push(MockDataGenerator.generateRandomAnimal('cat'));
    }
  }
  
  // 動物一覧取得
  async getAnimals(
    species?: Species,
    page = 1,
    limit = 20
  ): Promise<PaginatedAnimals> {
    let filteredAnimals = this.animals;
    
    if (species) {
      filteredAnimals = filteredAnimals.filter(animal => 
        animal.species === species
      );
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredAnimals.slice(startIndex, endIndex);
    
    return {
      data: paginatedData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredAnimals.length / limit),
        totalItems: filteredAnimals.length,
        itemsPerPage: limit,
        hasNext: endIndex < filteredAnimals.length,
        hasPrevious: page > 1
      }
    };
  }
  
  // 動物検索
  async searchAnimals(query: string): Promise<Animal[]> {
    return this.animals.filter(animal =>
      animal.name.toLowerCase().includes(query.toLowerCase()) ||
      animal.breed.toLowerCase().includes(query.toLowerCase())
    );
  }
}
```