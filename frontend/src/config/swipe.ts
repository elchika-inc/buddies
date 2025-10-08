/**
 * スワイプ機能の設定値
 *
 * マジックナンバーを排除し、設定を一元管理
 */

export const SWIPE_CONFIG = {
  /** スワイプ閾値（px）- この距離を超えるとスワイプと判定 */
  threshold: 100,

  /** プリロードオフセット - 残りこの数のペットになったら次をロード */
  preloadOffset: 5,

  /** 最大スワイプ履歴数 - メモリ効率のため */
  maxHistorySize: 50,

  /** ローカルストレージキープレフィックス */
  storageKeyPrefix: 'pet-browsing-state',

  /** アニメーション時間（ms） */
  animationDuration: 300,
} as const

export const SWIPE_GESTURE = {
  /** スワイプと判定する最小距離（px） */
  minSwipeDistance: 50,

  /** スワイプと判定する最小速度（px/ms） */
  minSwipeVelocity: 0.3,

  /** 垂直スワイプを無視する閾値（縦横比） */
  verticalThreshold: 0.5,
} as const
