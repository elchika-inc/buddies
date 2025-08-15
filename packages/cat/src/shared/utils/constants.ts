// Layout constants
export const LAYOUT_CONSTANTS = {
  // ヘッダー + フッターの高さ（px）
  HEADER_FOOTER_HEIGHT: 280,
  // カード表示の最小高さ（px）
  MIN_CARD_HEIGHT: 320,
  // ビューポートの最大使用率
  MAX_VIEWPORT_RATIO: 0.7,
  // カードコンテナのデフォルト高さ（vh）
  DEFAULT_CARD_HEIGHT: 70,
} as const

// Animation constants
export const ANIMATION = {
  // スワイプアニメーションの遅延（ms）
  SWIPE_DELAY: 500,
  // モーダル表示のアニメーション時間（ms）
  MODAL_TRANSITION: 300,
} as const

// Theme constants
export const THEME = {
  cat: {
    primary: 'purple',
    secondary: 'pink',
    emoji: '🐱',
    title: 'PawMatch for Cats',
    subtitle: '運命のネコちゃんを見つけよう',
  },
  dog: {
    primary: 'orange',
    secondary: 'yellow',
    emoji: '🐶',
    title: 'PawMatch for Dogs',
    subtitle: '運命のワンちゃんを見つけよう',
  },
} as const

// UI Text constants
export const UI_TEXT = {
  LOCATION_ALL: '全域',
  NO_MORE_ITEMS: {
    cat: 'ネコちゃん',
    dog: 'ワンちゃん',
  },
  COMPLETION_MESSAGES: {
    cat: {
      title: 'すべてのネコちゃんを確認しました！',
      subtitle: '新しいネコちゃんをチェックするには、リセットしてください。',
    },
    dog: {
      title: 'すべてのワンちゃんを確認しました！',
      subtitle: '新しいワンちゃんをチェックするには、リセットしてください。',
    },
  },
} as const

// Storage keys
export const STORAGE_KEYS = {
  CAT_LIKES: 'cat_liked_pets',
  CAT_SUPER_LIKES: 'cat_super_liked_pets',
  CAT_PASSED: 'cat_passed_pets',
  DOG_LIKES: 'dog_liked_pets',
  DOG_SUPER_LIKES: 'dog_super_liked_pets',
  DOG_PASSED: 'dog_passed_pets',
} as const

export type AnimalTheme = keyof typeof THEME
