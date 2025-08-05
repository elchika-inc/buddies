// アプリケーション関連の定数

// アプリモード
export const APP_MODES = {
  SELECTOR: 'selector',
  DOG: 'dog',
  CAT: 'cat'
} as const

// 画面タイプ
export const SCREEN_TYPES = {
  SWIPE: 'swipe',
  LIKED: 'liked',
  SUPERLIKED: 'superliked'
} as const

// スワイプアクション
export const SWIPE_ACTIONS = {
  LIKE: 'like',
  PASS: 'pass',
  SUPERLIKE: 'superlike'
} as const

// 犬のサイズカラーマッピング
export const DOG_SIZE_COLORS = {
  '小型犬': 'bg-green-100 text-green-800',
  '中型犬': 'bg-blue-100 text-blue-800',
  '大型犬': 'bg-orange-100 text-orange-800',
  '超大型犬': 'bg-red-100 text-red-800'
} as const

// 運動レベルカラーマッピング
export const EXERCISE_LEVEL_COLORS = {
  '低': 'bg-green-500',
  '中': 'bg-yellow-500',
  '高': 'bg-red-500'
} as const

// 猫の毛の長さカラーマッピング
export const CAT_COAT_COLORS = {
  '短毛': 'bg-blue-500',
  '長毛': 'bg-purple-500'
} as const

// 社交レベルカラーマッピング
export const SOCIAL_LEVEL_COLORS = {
  '人懐っこい': 'bg-green-500',
  'シャイ': 'bg-yellow-500',
  '警戒心強い': 'bg-red-500',
  '普通': 'bg-gray-500'
} as const

// アクティビティアイコンマッピング
export const ACTIVITY_ICONS = {
  '昼型': 'sun',
  '夜型': 'moon',
  'どちらでも': 'sun'
} as const

// スワイプアクション処理マッピング
export const SWIPE_ACTION_HANDLERS = {
  like: <T>(state: { liked: T[]; passed: T[]; superLiked: T[] }, target: T) => ({
    ...state,
    liked: [...state.liked, target]
  }),
  pass: <T>(state: { liked: T[]; passed: T[]; superLiked: T[] }, target: T) => ({
    ...state,
    passed: [...state.passed, target]
  }),
  superlike: <T>(state: { liked: T[]; passed: T[]; superLiked: T[] }, target: T) => ({
    ...state,
    superLiked: [...state.superLiked, target]
  })
} as const

// デフォルト値
export const DEFAULT_VALUES = {
  DOG_SIZE_COLOR: 'bg-gray-100 text-gray-800',
  EXERCISE_LEVEL_COLOR: 'bg-gray-500',
  CAT_COAT_COLOR: 'bg-gray-500',
  SOCIAL_LEVEL_COLOR: 'bg-gray-500'
} as const

// UI関連定数
export const UI_CONSTANTS = {
  ANIMATION_DURATION: 300,
  SWIPE_THRESHOLD: 100,
  CARD_STACK_SCALE: 0.95,
  CARD_ROTATION: 2,
  CARD_HEIGHT: 650,
  CARD_OPACITY_BACKGROUND: 0.5,
  EMOJI_SIZE: '6xl',
  HOVER_SCALE: 1.1,
  MAX_PERSONALITY_TAGS: 3,
  MAX_CARD_WIDTH: 'max-w-sm'
} as const

// レイアウト関連定数
export const LAYOUT_CONSTANTS = {
  HEADER_HEIGHT: 'h-16',
  CARD_HEIGHT_RATIO: 'h-2/3',
  CONTENT_HEIGHT_RATIO: 'h-1/3',
  FULL_HEIGHT: 'min-h-screen',
  PADDING_STANDARD: 'p-4',
  MARGIN_BOTTOM: 'mb-4',
  GAP_STANDARD: 'gap-2',
  GAP_LARGE: 'gap-4'
} as const

// アニメーション関連定数
export const ANIMATION_CONSTANTS = {
  TRANSITION_DURATION: 'duration-300',
  HOVER_TRANSFORM: 'hover:scale-110',
  CARD_SHADOW: 'shadow-xl',
  BACKDROP_BLUR: 'backdrop-blur-sm',
  TRANSFORM_ROTATE: 'rotate-2'
} as const