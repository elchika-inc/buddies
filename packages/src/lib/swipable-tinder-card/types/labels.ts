/**
 * ラベルとテキスト設定の型定義
 */

export interface ModalLabels {
  title?: string
  message?: (itemName?: string) => string
  confirmButton?: string
  cancelButton?: string
}

export interface ActionButtonLabels {
  pass?: string
  like?: string
  superlike?: string
}

export interface IndicatorLabels {
  like?: string
  pass?: string
  superlike?: string
}

export interface SwipeLabels {
  modal?: ModalLabels
  buttons?: ActionButtonLabels
  indicator?: IndicatorLabels
}

export type { ModalLabels as SuperLikeModalLabels }
export type { IndicatorLabels as SwipeIndicatorLabels }

// デフォルトのラベル設定（英語）
export const DEFAULT_LABELS_EN: Required<SwipeLabels> = {
  modal: {
    title: 'SUPER LIKE',
    message: (itemName?: string) => `Send SUPER LIKE to ${itemName || 'this item'}?`,
    confirmButton: 'Send',
    cancelButton: 'Cancel'
  },
  buttons: {
    pass: 'Pass',
    like: 'Like',
    superlike: 'Super Like'
  },
  indicator: {
    like: 'LIKE',
    pass: 'PASS',
    superlike: 'SUPER LIKE'
  }
}

// デフォルトのラベル設定（日本語）
export const DEFAULT_LABELS_JA: Required<SwipeLabels> = {
  modal: {
    title: 'スーパーライク',
    message: (itemName?: string) => `${itemName || 'この項目'}にスーパーライクを送りますか？`,
    confirmButton: '送信',
    cancelButton: 'キャンセル'
  },
  buttons: {
    pass: 'パス',
    like: 'いいね',
    superlike: 'スーパーライク'
  },
  indicator: {
    like: 'いいね',
    pass: 'パス',
    superlike: 'スーパーライク'
  }
}