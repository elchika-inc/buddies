// アニメーション関連の定数定義

// アニメーション持続時間（ミリ秒）
export const ANIMATION_DURATIONS = {
  CARD_EXIT: 400,
  CARD_TRANSITION: 300,
  FADE_TRANSITION: 300,
  BOUNCE_ANIMATION: 200,
} as const;

// アニメーション関数
export const ANIMATION_EASINGS = {
  EASE_OUT: 'ease-out',
  EASE_IN_OUT: 'ease-in-out',
  BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// デフォルト表示サイズ（フォールバック値）
export const DEFAULT_VIEWPORT_DIMENSIONS = {
  WIDTH: 1000,
  HEIGHT: 1000,
} as const;

// 計算係数
export const ANIMATION_COEFFICIENTS = {
  ROTATION_FACTOR: 0.1, // ドラッグによる回転の係数
  EXIT_ROTATION_LIKE: 30, // Like時の回転角度
  EXIT_ROTATION_PASS: -30, // Pass時の回転角度
  EXIT_Y_OFFSET: 50, // 退場時のY軸オフセット
} as const;

// Z-index値
export const Z_INDEX_VALUES = {
  TOP_CARD: 10,
  BACKGROUND_CARD: 1,
  MODAL: 1000,
  OVERLAY: 900,
} as const;