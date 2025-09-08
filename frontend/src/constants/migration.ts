// データ移行処理で使用される定数定義

// デフォルトURL
export const DEFAULT_PET_HOME_URLS = {
  DOGS: 'https://www.pet-home.jp/dogs/',
  CATS: 'https://www.pet-home.jp/cats/',
} as const

// 不明な値を表す定数
export const UNKNOWN_VALUES = {
  LOCATION: '不明',
  PREFECTURE: '不明',
  CITY: '不明',
} as const

// グルーピング用のキー
export const GROUPING_KEYS = {
  UNKNOWN: '不明',
} as const

// データ移行のデフォルト設定
export const MIGRATION_DEFAULTS = {
  PRESERVE_LEGACY_LOCATION: true, // 後方互換性のため既存のlocationフィールドを保持
} as const
