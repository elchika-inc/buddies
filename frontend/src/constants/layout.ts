/**
 * レイアウト関連の定数
 * コンポーネント間で共有されるレイアウト値を一元管理
 */

/**
 * レイアウトの固定値（px）
 */
export const LAYOUT = {
  /**
   * ヘッダーの高さ
   */
  HEADER_HEIGHT: 80,

  /**
   * フッターの高さ
   */
  FOOTER_HEIGHT: 160,

  /**
   * コントロールエリアの高さ
   */
  CONTROLS_HEIGHT: 80,

  /**
   * カードコンテナの固定オフセット合計値
   * (ヘッダー + フッター + コントロール)
   */
  TOTAL_FIXED_HEIGHT: 320,

  /**
   * カードの最小高さ
   */
  CARD_MIN_HEIGHT: 320,

  /**
   * カードの最大高さ（ビューポート高さに対する割合）
   */
  CARD_MAX_HEIGHT_VH: 70,
} as const

/**
 * z-indexの階層定義
 */
export const Z_INDEX = {
  BASE: 0,
  CARD_BACKGROUND: 1,
  CARD_TOP: 10,
  DROPDOWN: 10,
  HEADER: 50,
  MODAL_BACKDROP: 60,
  MODAL: 70,
  TOAST: 100,
} as const

/**
 * ブレークポイント（px）
 * Tailwindのデフォルト値に準拠
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const
