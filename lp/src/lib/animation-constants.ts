/**
 * アニメーション設定の統一定義
 *
 * 全てのコンポーネントで一貫したアニメーションタイミングを実現します。
 * 調整時はこのファイルのみ変更すればよいため、保守性が大幅に向上します。
 */

/**
 * アニメーション継続時間（秒）
 */
export const ANIMATION_DURATION = {
  /** 標準速度: ほとんどの要素に使用 */
  STANDARD: 0.6,

  /** 遅い速度: 大きな要素や重要な要素 */
  SLOW: 1.0,

  /** 速い速度: 小さな要素やUI反応 */
  FAST: 0.3,

  /** とても遅い速度: スクロールインジケーターなど */
  VERY_SLOW: 1.5,
} as const

/**
 * アニメーション遅延時間（秒）
 *
 * 順次表示（stagger）のパターン:
 * - 0秒: 即座に表示
 * - 0.2秒: 2番目の要素
 * - 0.4秒: 3番目の要素
 * - 0.6秒: 4番目の要素
 */
export const ANIMATION_DELAY = {
  /** 順次表示の間隔 */
  STAGGER_INTERVAL: 0.2,

  /** 遅延なし */
  NONE: 0,

  /** 短い遅延（2番目の要素） */
  SHORT: 0.2,

  /** 中程度の遅延（3番目の要素） */
  MEDIUM: 0.4,

  /** 長い遅延（4番目の要素） */
  LONG: 0.6,

  /** とても長い遅延（最後の要素や特別な効果） */
  EXTRA_LONG: 1.2,
} as const

/**
 * framer-motion用の標準トランジション設定
 */
export const STANDARD_TRANSITION = {
  duration: ANIMATION_DURATION.STANDARD,
} as const

/**
 * 順次表示用のヘルパー関数
 *
 * @param index - 要素のインデックス（0始まり）
 * @returns トランジション設定オブジェクト
 *
 * @example
 * items.map((item, index) => (
 *   <motion.div transition={staggerTransition(index)} />
 * ))
 */
export function staggerTransition(index: number) {
  return {
    duration: ANIMATION_DURATION.STANDARD,
    delay: index * ANIMATION_DELAY.STAGGER_INTERVAL,
  }
}

/**
 * スクロールインジケーター用のアニメーション設定
 */
export const SCROLL_INDICATOR_ANIMATION = {
  animate: { y: [0, 8, 0] as number[] },
  transition: {
    duration: ANIMATION_DURATION.VERY_SLOW,
    repeat: Infinity,
  },
}

/**
 * フェードインアニメーションのプリセット
 */
export const FADE_IN = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: STANDARD_TRANSITION,
} as const

/**
 * フェードインアニメーション（上から）のプリセット
 */
export const FADE_IN_FROM_TOP = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  transition: STANDARD_TRANSITION,
} as const

/**
 * スケールアニメーションのプリセット
 */
export const SCALE_IN = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1 },
  transition: STANDARD_TRANSITION,
} as const
