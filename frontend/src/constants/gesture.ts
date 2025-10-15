/**
 * ジェスチャー・スワイプ関連の定数
 * タップ、スワイプ、ドラッグの判定閾値を一元管理
 */

/**
 * タップ判定の閾値
 */
export const TAP = {
  /**
   * タップと判定される最大移動距離（px）
   */
  MAX_DISTANCE: 5,

  /**
   * タップと判定される最大継続時間（ミリ秒）
   */
  MAX_DURATION: 200,
} as const

/**
 * スワイプ判定の閾値
 */
export const SWIPE = {
  /**
   * 水平方向のスワイプと判定される最小距離（px）
   */
  HORIZONTAL_THRESHOLD: 100,

  /**
   * 垂直方向のスワイプと判定される最小距離（px）
   */
  VERTICAL_THRESHOLD: 100,

  /**
   * スーパーライク（上スワイプ）と判定される最小距離（px）
   */
  SUPER_LIKE_THRESHOLD: 100,

  /**
   * スワイプアニメーションの継続時間（ミリ秒）
   */
  ANIMATION_DURATION: 300,
} as const

/**
 * ドラッグ中の回転角度の最大値（度）
 */
export const ROTATION = {
  /**
   * 最大回転角度
   */
  MAX_ANGLE: 15,

  /**
   * 回転が開始される距離（px）
   */
  START_DISTANCE: 50,

  /**
   * X方向の移動量から回転角度を計算する係数
   */
  ROTATION_FACTOR: 0.1,
} as const

/**
 * インジケーターの表示閾値
 */
export const INDICATOR = {
  /**
   * インジケーターを表示する最小不透明度
   */
  MIN_OPACITY: 0.3,

  /**
   * インジケーターの最大不透明度
   */
  MAX_OPACITY: 1.0,
} as const
