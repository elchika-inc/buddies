import { useEffect } from 'react'

/** キーボードショートカットの定義 */
const KEYBOARD_SHORTCUTS = {
  // 矢印キー
  ArrowLeft: 'pass',
  ArrowRight: 'like',
  ArrowUp: 'superLike',

  // WASDキー（ゲーマー向け）
  a: 'pass',
  A: 'pass',
  d: 'like',
  D: 'like',
  w: 'superLike',
  W: 'superLike',

  // JKLキー（Vim風）
  h: 'pass',
  H: 'pass',
  l: 'like',
  L: 'like',
  k: 'superLike',
  K: 'superLike',

  // 数字キー
  '1': 'pass',
  '2': 'like',
  '3': 'superLike',

  // スペースキー（詳細表示）
  ' ': 'detail',

  // その他
  '?': 'help', // ヘルプ表示
} as const

interface UseKeyboardSwipeProps {
  onSwipe: (action: 'pass' | 'like' | 'superLike') => void
  onDetail?: () => void
  onHelp?: () => void
  disabled?: boolean
}

/**
 * キーボード操作でスワイプを制御するカスタムフック
 * @param onSwipe スワイプアクションのコールバック
 * @param onDetail 詳細表示のコールバック
 * @param onHelp ヘルプ表示のコールバック
 * @param disabled キーボード操作を無効化するかどうか
 */
export function useKeyboardSwipe({
  onSwipe,
  onDetail,
  onHelp,
  disabled = false,
}: UseKeyboardSwipeProps) {
  useEffect(() => {
    if (disabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // 入力フィールドにフォーカスがある場合は無視
      const target = event.target as HTMLElement
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true')
      ) {
        return
      }

      // モーダルが開いている場合は無視（ESCキーを除く）
      const hasOpenModal = document.querySelector('[role="dialog"]')
      if (hasOpenModal && event.key !== 'Escape') {
        return
      }

      const key = event.key
      const action = KEYBOARD_SHORTCUTS[key as keyof typeof KEYBOARD_SHORTCUTS]

      if (!action) return

      // デフォルトの動作を防ぐ（スペースキーのスクロールなど）
      event.preventDefault()

      switch (action) {
        case 'pass':
        case 'like':
        case 'superLike':
          onSwipe(action)
          break
        case 'detail':
          if (onDetail) {
            onDetail()
          }
          break
        case 'help':
          if (onHelp) {
            onHelp()
          }
          break
      }
    }

    // イベントリスナーを登録
    window.addEventListener('keydown', handleKeyDown)

    // クリーンアップ
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onSwipe, onDetail, onHelp, disabled])

  return {
    shortcuts: KEYBOARD_SHORTCUTS,
  }
}

/**
 * キーボードショートカットのヘルプテキストを生成
 */
export function getKeyboardHelp(): string[] {
  return [
    '⌨️ キーボードショートカット:',
    '',
    '【スワイプ操作】',
    '← / A / H / 1 : パス',
    '→ / D / L / 2 : いいね',
    '↑ / W / K / 3 : スーパーライク',
    '',
    '【その他】',
    'Space : 詳細を表示',
    '? : ヘルプを表示',
  ]
}

/**
 * キーボードショートカットの簡易表示用
 */
export function getKeyboardHints() {
  return {
    pass: '← / A',
    like: '→ / D',
    superLike: '↑ / W',
    detail: 'Space',
  }
}
