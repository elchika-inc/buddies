/**
 * Frontend用ペット型定義
 *
 * shared/types/pet.tsから型をインポートし、
 * Frontend固有の拡張を追加
 */

// 共通の型定義から再エクスポート
export type {
  Pet,
  Dog,
  Cat,
  FrontendPet,
  PetType,
  PetGender,
  PetSize,
  ExerciseLevel,
  TrainingLevel,
  SocialLevel,
  IndoorOutdoor,
  PetWithImages,
  Image,
  PetFilter,
  PetSort,
  PetResponse,
  PetsListResponse,
} from '../../../shared/types/pet'

// ユーティリティ関数も共通型から再エクスポート
export {
  isPet,
  isDog,
  isCat,
  isPetWithImages,
  isImage,
  toBool,
  toFlag,
  createPet,
  fromDBRecord,
} from '../../../shared/types/pet'

// Frontend固有の拡張型（必要に応じて使用）
export interface LocalPetExtensions {
  localImagePath?: string // ローカル開発用画像パス
  displayOrder?: number // UI表示順
  isBookmarked?: boolean // ブックマーク状態
}

// Frontend用の拡張ペット型
export type ExtendedPet = import('../../../shared/types/pet').FrontendPet & LocalPetExtensions
