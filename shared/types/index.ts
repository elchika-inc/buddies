/**
 * PawMatch 共通型定義
 * 
 * @description PawMatchアプリケーション全体で使用する共通の型定義
 * api/database/schema/schema.tsのDrizzle ORMスキーマから派生した型
 * @file shared/types/index.ts
 */

// エラーとResult型の再エクスポート
export * from './error';
export * from './result';

// ============== ペット関連型定義 ==============

/**
 * ペット情報の型定義
 * 
 * @interface Pet
 * @description 保護犬・保護猫の情報を表すメインインターフェース
 * フロントエンド表示用のcamelCase形式
 */
export interface Pet {
  /** 基本フィールド */
  /** ペットID（一意識別子） */
  id: string
  /** ペットタイプ（犬または猫） */
  type: 'dog' | 'cat'
  /** ペット名 */
  name: string
  /** 品種 */
  breed?: string | null
  /** 年齢 */
  age?: string | null
  /** 性別 */
  gender?: 'male' | 'female' | 'unknown' | null

  /** 位置情報 */
  /** 都道府県 */
  prefecture?: string | null
  /** 市区町村 */
  city?: string | null
  /** 結合所在地 */
  location?: string | null

  /** 説明情報 */
  /** ペットの説明文 */
  description?: string | null
  /** 性格特徴（JSON配列または文字列） */
  personality?: string[] | string | null
  /** 医療情報 */
  medicalInfo?: string | null
  /** ケア要件（JSON配列または文字列） */
  careRequirements?: string[] | string | null

  /** 拡張ペット情報 */
  /** 他の動物との相性（JSON配列または文字列） */
  goodWith?: string[] | string | null
  /** 健康ノート（JSON配列または文字列） */
  healthNotes?: string[] | string | null

  /** 身体的特徴 */
  /** 毛色 */
  color?: string | null
  /** 体重 */
  weight?: number | null
  /** サイズ */
  size?: string | null
  /** 毛長 */
  coatLength?: string | null

  /** 健康状態 */
  /** 去勢手術済みか */
  isNeutered?: boolean | number | null
  /** ワクチン接種済みか */
  isVaccinated?: boolean | number | null
  /** ワクチン接種状況 */
  vaccinationStatus?: string | null
  /** 猫エイズ・猫白血病検査済みか */
  isFivFelvTested?: boolean | number | null

  /** 行動特性 */
  /** 運動レベル */
  exerciseLevel?: string | null
  /** 訓練レベル */
  trainingLevel?: string | null
  /** 社交レベル */
  socialLevel?: string | null
  /** 室内外飼育適性 */
  indoorOutdoor?: string | null
  /** グルーミング要件 */
  groomingRequirements?: string | null

  /** 相性フラグ */
  /** 子供との相性 */
  goodWithKids?: boolean | number | null
  /** 犬との相性 */
  goodWithDogs?: boolean | number | null
  /** 猫との相性 */
  goodWithCats?: boolean | number | null
  /** アパート適性 */
  apartmentFriendly?: boolean | number | null
  /** 庭が必要か */
  needsYard?: boolean | number | null

  /** 画像管理 */
  /** 画像URL */
  imageUrl?: string | null
  /** JPEG形式の画像を持っているか */
  hasJpeg?: boolean | number | null
  /** WebP形式の画像を持っているか */
  hasWebp?: boolean | number | null
  /** 画像チェック日時 */
  imageCheckedAt?: string | null
  /** スクリーンショットリクエスト日時 */
  screenshotRequestedAt?: string | null
  /** スクリーンショット完了日時 */
  screenshotCompletedAt?: string | null

  /** 保護施設情報 */
  /** 保護施設名 */
  shelterName?: string | null
  /** 保護施設連絡先 */
  shelterContact?: string | null
  /** ソースURL */
  sourceUrl?: string | null
  /** ソースID */
  sourceId?: string | null
  /** 譲渡手数料 */
  adoptionFee?: number | null

  /** タイムスタンプ */
  /** 作成日時 */
  createdAt?: string | null
  /** 更新日時 */
  updatedAt?: string | null
}

/**
 * データベースレコード型（データベース互換性のためsnake_case）
 * 
 * @interface PetRecord
 * @description データベースのペットテーブルと直接マッピングされる型
 * Drizzle ORMで使用されるsnake_case形式
 */
export interface PetRecord {
  id: string
  type: 'dog' | 'cat'
  name: string
  breed?: string | null
  age?: string | null
  gender?: string | null
  prefecture?: string | null
  city?: string | null
  location?: string | null
  description?: string | null
  personality?: string | null
  medical_info?: string | null
  care_requirements?: string | null
  good_with?: string | null
  health_notes?: string | null
  color?: string | null
  weight?: number | null
  size?: string | null
  coat_length?: string | null
  is_neutered?: number | null
  is_vaccinated?: number | null
  vaccination_status?: string | null
  is_fiv_felv_tested?: number | null
  exercise_level?: string | null
  training_level?: string | null
  social_level?: string | null
  indoor_outdoor?: string | null
  grooming_requirements?: string | null
  good_with_kids?: number | null
  good_with_dogs?: number | null
  good_with_cats?: number | null
  apartment_friendly?: number | null
  needs_yard?: number | null
  image_url?: string | null
  has_jpeg?: number | null
  has_webp?: number | null
  image_checked_at?: string | null
  screenshot_requested_at?: string | null
  screenshot_completed_at?: string | null
  shelter_name?: string | null
  shelter_contact?: string | null
  source_url?: string | null
  source_id?: string | null
  adoption_fee?: number | null
  created_at?: string | null
  updated_at?: string | null
}

// ============== クローラー関連型定義 ==============

/**
 * クローラー状態管理型
 * 
 * @interface CrawlerState
 * @description クロール処理の進行状況やチェックポイントを管理
 */
export interface CrawlerState {
  id?: number
  sourceId: string
  petType: 'dog' | 'cat'
  checkpoint?: string | null // JSON string
  totalProcessed?: number | null
  lastCrawlAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface CrawlerStateRecord {
  id?: number
  source_id: string
  pet_type: string
  checkpoint?: string | null
  total_processed?: number | null
  last_crawl_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

// ============== 同期関連型定義 ==============

/**
 * 同期状態管理型
 * 
 * @interface SyncStatus
 * @description データ同期操作の状態や進行状況を記録
 */
export interface SyncStatus {
  id?: number
  syncType: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  totalRecords?: number | null
  processedRecords?: number | null
  failedRecords?: number | null
  metadata?: string | null // JSON string
  startedAt?: string | null
  completedAt?: string | null
  createdAt?: string | null
}

export interface SyncStatusRecord {
  id?: number
  sync_type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  total_records?: number | null
  processed_records?: number | null
  failed_records?: number | null
  metadata?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_at?: string | null
}

export interface SyncMetadata {
  id?: number
  key: string
  value?: string | null
  valueType?: string | null
  description?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface SyncMetadataRecord {
  id?: number
  key: string
  value?: string | null
  value_type?: string | null
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
}

// ============== 検索・フィルター型定義 ==============

/**
 * ペット検索フィルター
 * 
 * @interface PetSearchFilters
 * @description ペット検索時のフィルタリング条件を定義
 */
export interface PetSearchFilters {
  /** ペットタイプ */
  petType?: 'dog' | 'cat';
  /** 都道府県 */
  prefecture?: string;
  /** 市区町村 */
  city?: string;
  /** 最低年齢 */
  minAge?: number;
  /** 最高年齢 */
  maxAge?: number;
  /** 性別 */
  gender?: 'male' | 'female' | 'unknown';
  /** 品種 */
  breed?: string;
  /** 画像ありのみ */
  hasImage?: boolean;
}

// ============== ユーティリティ型定義 ==============

/**
 * クロール結果
 * 
 * @interface CrawlResult
 * @description クロール操作の結果と統計情報
 */
export interface CrawlResult {
  /** 成功フラグ */
  success: boolean
  /** 処理総数 */
  totalPets: number
  /** 新規作成数 */
  newPets: number
  /** 更新数 */
  updatedPets: number
  /** エラーメッセージ一覧 */
  errors: string[]
}

/**
 * クロールチェックポイント
 * 
 * @interface CrawlCheckpoint
 * @description クロールの中断・再開のためのチェックポイント情報
 */
export interface CrawlCheckpoint {
  /** ページ番号 */
  page?: number
  /** 最後に処理したID */
  lastId?: string
  /** タイムスタンプ */
  timestamp?: string
  /** その他のカスタム情報 */
  [key: string]: string | number | undefined
}

// ============== 型ガード ==============

/**
 * Pet型の型ガード
 * 
 * @param obj - チェック対象のオブジェクト
 * @returns Pet型かどうか
 * @description オブジェクトがPetインターフェースに適合しているか検証
 */
export const isPet = (obj: unknown): obj is Pet => {
  return !!obj && typeof (obj as Pet).id === 'string' && ((obj as Pet).type === 'dog' || (obj as Pet).type === 'cat')
}

/**
 * PetRecord型の型ガード
 * 
 * @param obj - チェック対象のオブジェクト
 * @returns PetRecord型かどうか
 * @description オブジェクトがPetRecordインターフェースに適合しているか検証
 */
export const isPetRecord = (obj: unknown): obj is PetRecord => {
  return !!obj && typeof (obj as PetRecord).id === 'string' && ((obj as PetRecord).type === 'dog' || (obj as PetRecord).type === 'cat')
}

// ============== 変換ヘルパー ==============

/**
 * Pet型をPetRecord型に変換
 * 
 * @param pet - 変換元のPetオブジェクト
 * @returns 変換後のPetRecordオブジェクト
 * @description フロントエンド用のcamelCase型をデータベース用のsnake_case型に変換
 * boolean値は0/1の数値に、配列はJSON文字列に変換
 */
export const petToRecord = (pet: Pet): PetRecord => {
  return {
    id: pet.id,
    type: pet.type,
    name: pet.name,
    breed: pet.breed ?? null,
    age: pet.age ?? null,
    gender: pet.gender ?? null,
    prefecture: pet.prefecture ?? null,
    city: pet.city ?? null,
    location: pet.location ?? null,
    description: pet.description ?? null,
    personality: typeof pet.personality === 'string' 
      ? pet.personality 
      : pet.personality ? JSON.stringify(pet.personality) : null,
    medical_info: pet.medicalInfo ?? null,
    care_requirements: typeof pet.careRequirements === 'string'
      ? pet.careRequirements
      : pet.careRequirements ? JSON.stringify(pet.careRequirements) : null,
    good_with: typeof pet.goodWith === 'string'
      ? pet.goodWith
      : pet.goodWith ? JSON.stringify(pet.goodWith) : null,
    health_notes: typeof pet.healthNotes === 'string'
      ? pet.healthNotes
      : pet.healthNotes ? JSON.stringify(pet.healthNotes) : null,
    color: pet.color ?? null,
    weight: pet.weight ?? null,
    size: pet.size ?? null,
    coat_length: pet.coatLength ?? null,
    is_neutered: typeof pet.isNeutered === 'boolean' ? (pet.isNeutered ? 1 : 0) : pet.isNeutered ?? null,
    is_vaccinated: typeof pet.isVaccinated === 'boolean' ? (pet.isVaccinated ? 1 : 0) : pet.isVaccinated ?? null,
    vaccination_status: pet.vaccinationStatus ?? null,
    is_fiv_felv_tested: typeof pet.isFivFelvTested === 'boolean' ? (pet.isFivFelvTested ? 1 : 0) : pet.isFivFelvTested ?? null,
    exercise_level: pet.exerciseLevel ?? null,
    training_level: pet.trainingLevel ?? null,
    social_level: pet.socialLevel ?? null,
    indoor_outdoor: pet.indoorOutdoor ?? null,
    grooming_requirements: pet.groomingRequirements ?? null,
    good_with_kids: typeof pet.goodWithKids === 'boolean' ? (pet.goodWithKids ? 1 : 0) : pet.goodWithKids ?? null,
    good_with_dogs: typeof pet.goodWithDogs === 'boolean' ? (pet.goodWithDogs ? 1 : 0) : pet.goodWithDogs ?? null,
    good_with_cats: typeof pet.goodWithCats === 'boolean' ? (pet.goodWithCats ? 1 : 0) : pet.goodWithCats ?? null,
    apartment_friendly: typeof pet.apartmentFriendly === 'boolean' ? (pet.apartmentFriendly ? 1 : 0) : pet.apartmentFriendly ?? null,
    needs_yard: typeof pet.needsYard === 'boolean' ? (pet.needsYard ? 1 : 0) : pet.needsYard ?? null,
    image_url: pet.imageUrl ?? null,
    has_jpeg: typeof pet.hasJpeg === 'boolean' ? (pet.hasJpeg ? 1 : 0) : pet.hasJpeg ?? null,
    has_webp: typeof pet.hasWebp === 'boolean' ? (pet.hasWebp ? 1 : 0) : pet.hasWebp ?? null,
    image_checked_at: pet.imageCheckedAt ?? null,
    screenshot_requested_at: pet.screenshotRequestedAt ?? null,
    screenshot_completed_at: pet.screenshotCompletedAt ?? null,
    shelter_name: pet.shelterName ?? null,
    shelter_contact: pet.shelterContact ?? null,
    source_url: pet.sourceUrl ?? null,
    source_id: pet.sourceId ?? null,
    adoption_fee: pet.adoptionFee ?? null,
    created_at: pet.createdAt ?? null,
    updated_at: pet.updatedAt ?? null,
  }
}

/**
 * PetRecord型をPet型に変換
 * 
 * @param record - 変換元のPetRecordオブジェクト
 * @returns 変換後のPetオブジェクト
 * @description データベース用のsnake_case型をフロントエンド用のcamelCase型に変換
 * 0/1の数値はboolean値に、JSON文字列は配列に変換
 */
export const recordToPet = (record: PetRecord): Pet => {
  return {
    id: record.id,
    type: record.type,
    name: record.name,
    breed: record.breed ?? null,
    age: record.age ?? null,
    gender: (record.gender as Pet['gender']) ?? null,
    prefecture: record.prefecture ?? null,
    city: record.city ?? null,
    location: record.location ?? null,
    description: record.description ?? null,
    personality: record.personality ? JSON.parse(record.personality) : null,
    medicalInfo: record.medical_info ?? null,
    careRequirements: record.care_requirements ? JSON.parse(record.care_requirements) : null,
    goodWith: record.good_with ? JSON.parse(record.good_with) : null,
    healthNotes: record.health_notes ? JSON.parse(record.health_notes) : null,
    color: record.color ?? null,
    weight: record.weight ?? null,
    size: record.size ?? null,
    coatLength: record.coat_length ?? null,
    isNeutered: record.is_neutered === 1,
    isVaccinated: record.is_vaccinated === 1,
    vaccinationStatus: record.vaccination_status ?? null,
    isFivFelvTested: record.is_fiv_felv_tested === 1,
    exerciseLevel: record.exercise_level ?? null,
    trainingLevel: record.training_level ?? null,
    socialLevel: record.social_level ?? null,
    indoorOutdoor: record.indoor_outdoor ?? null,
    groomingRequirements: record.grooming_requirements ?? null,
    goodWithKids: record.good_with_kids === 1,
    goodWithDogs: record.good_with_dogs === 1,
    goodWithCats: record.good_with_cats === 1,
    apartmentFriendly: record.apartment_friendly === 1,
    needsYard: record.needs_yard === 1,
    imageUrl: record.image_url ?? null,
    hasJpeg: record.has_jpeg === 1,
    hasWebp: record.has_webp === 1,
    imageCheckedAt: record.image_checked_at ?? null,
    screenshotRequestedAt: record.screenshot_requested_at ?? null,
    screenshotCompletedAt: record.screenshot_completed_at ?? null,
    shelterName: record.shelter_name ?? null,
    shelterContact: record.shelter_contact ?? null,
    sourceUrl: record.source_url ?? null,
    sourceId: record.source_id ?? null,
    adoptionFee: record.adoption_fee ?? null,
    createdAt: record.created_at ?? null,
    updatedAt: record.updated_at ?? null,
  }
}