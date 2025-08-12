/**
 * スワイプ機能に関する設定値の一元管理
 */

// スワイプ判定の閾値
export const SWIPE_THRESHOLDS = {
  // 最小移動距離（これ以下は無視）
  MIN_DISTANCE: 50,
  
  // 強い判定の閾値
  STRONG: {
    HORIZONTAL: 60,  // 横方向の強い判定
    VERTICAL: 60,     // 縦方向の強い判定
    UPWARD: -120,     // 上方向スワイプの開始判定
  },
  
  // 弱い判定の閾値
  WEAK: {
    HORIZONTAL: 30,   // 横方向の弱い判定
    VERTICAL: 40,     // 縦方向の弱い判定
  },
  
  // 比率による判定
  RATIO: {
    HORIZONTAL_DOMINANT: 2,    // 横方向が縦の2倍以上で横スワイプ
    VERTICAL_DOMINANT: 1.5,    // 縦方向が横の1.5倍以上で縦スワイプ
  }
} as const

// スワイプインジケーターのスタイル設定
export const SWIPE_INDICATOR_STYLES = {
  // 共通スタイル
  BASE: "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center whitespace-nowrap",
  
  // 強い判定のスタイル
  STRONG: {
    LIKE: "px-6 py-3 rounded-xl font-bold text-white text-2xl shadow-2xl border-2 border-white bg-green-500 rotate-12",
    PASS: "px-6 py-3 rounded-xl font-bold text-white text-2xl shadow-2xl border-2 border-white bg-red-500 -rotate-12",
    SUPERLIKE: "px-6 py-3 rounded-xl font-bold text-white text-2xl shadow-2xl border-2 border-white bg-purple-500",
  },
  
  // 弱い判定のスタイル
  WEAK: {
    LIKE: "px-4 py-2 rounded-lg font-medium text-white text-lg shadow-lg border border-white bg-green-400 opacity-70 rotate-6",
    PASS: "px-4 py-2 rounded-lg font-medium text-white text-lg shadow-lg border border-white bg-red-400 opacity-70 -rotate-6",
    SUPERLIKE: "px-4 py-2 rounded-lg font-medium text-white text-lg shadow-lg border border-white bg-purple-400 opacity-70",
  }
} as const

// スワイプインジケーターのテキスト
export const SWIPE_INDICATOR_TEXT = {
  LIKE: "❤️ LIKE",
  PASS: "❌ PASS",
  SUPERLIKE: "⭐ SUPER LIKE"
} as const

// スワイプタイプの定義
export type SwipeType = 
  | 'like' 
  | 'pass' 
  | 'superlike' 
  | 'like-weak' 
  | 'pass-weak' 
  | 'superlike-weak' 
  | null