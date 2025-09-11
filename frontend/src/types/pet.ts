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
} from '../../../shared/types/unified'

// 型ガード関数も共通型から再エクスポート
export {
  isPet,
  isDog,
  isCat,
  isPetWithImages,
  isImage,
  validatePet,
  validateDog,
  validateCat,
  toBooleanFlag,
  toNumberFlag,
  createDefaultPet,
} from '../../../shared/types/unified'

// Frontend固有の拡張が必要な場合はここに追加
export interface LocalPetExtensions {
  localImagePath?: string // ローカル開発用画像パス
  displayOrder?: number // UI表示順
  isBookmarked?: boolean // ブックマーク状態
}

// Frontend用の拡張型（必要に応じて使用）
export type ExtendedPet = import('../../../shared/types/unified').FrontendPet & LocalPetExtensions
