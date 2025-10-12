import { renderHook } from '@testing-library/react'
import { useKeyboardSwipe } from '../useKeyboardSwipe'

describe('useKeyboardSwipe', () => {
  let originalAddEventListener: typeof window.addEventListener
  let originalRemoveEventListener: typeof window.removeEventListener

  beforeEach(() => {
    originalAddEventListener = window.addEventListener
    originalRemoveEventListener = window.removeEventListener

    // モックのイベントリスナー
    window.addEventListener = jest.fn()
    window.removeEventListener = jest.fn()
  })

  afterEach(() => {
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
  })

  it('イベントリスナーが正しく登録される', () => {
    const mockOnSwipe = jest.fn()

    renderHook(() =>
      useKeyboardSwipe({
        onSwipe: mockOnSwipe,
      })
    )

    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('disabled=trueの場合、イベントリスナーが登録されない', () => {
    const mockOnSwipe = jest.fn()

    renderHook(() =>
      useKeyboardSwipe({
        onSwipe: mockOnSwipe,
        disabled: true,
      })
    )

    expect(window.addEventListener).not.toHaveBeenCalled()
  })

  it('クリーンアップ時にイベントリスナーが削除される', () => {
    const mockOnSwipe = jest.fn()

    const { unmount } = renderHook(() =>
      useKeyboardSwipe({
        onSwipe: mockOnSwipe,
      })
    )

    unmount()

    expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  describe('キーボードイベントの処理', () => {
    const simulateKeyDown = (key: string, target?: HTMLElement) => {
      const mockAddEventListener = window.addEventListener as jest.Mock
      const handler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'keydown'
      )?.[1] as EventListener

      if (handler) {
        const event = new KeyboardEvent('keydown', { key })
        if (target) {
          Object.defineProperty(event, 'target', { value: target })
        }
        handler(event)
      }
    }

    it('矢印キーでスワイプが実行される', () => {
      const mockOnSwipe = jest.fn()

      renderHook(() =>
        useKeyboardSwipe({
          onSwipe: mockOnSwipe,
        })
      )

      simulateKeyDown('ArrowLeft')
      expect(mockOnSwipe).toHaveBeenCalledWith('pass')

      simulateKeyDown('ArrowRight')
      expect(mockOnSwipe).toHaveBeenCalledWith('like')

      simulateKeyDown('ArrowUp')
      expect(mockOnSwipe).toHaveBeenCalledWith('superLike')
    })

    it('WASDキーでスワイプが実行される', () => {
      const mockOnSwipe = jest.fn()

      renderHook(() =>
        useKeyboardSwipe({
          onSwipe: mockOnSwipe,
        })
      )

      simulateKeyDown('a')
      expect(mockOnSwipe).toHaveBeenCalledWith('pass')

      simulateKeyDown('d')
      expect(mockOnSwipe).toHaveBeenCalledWith('like')

      simulateKeyDown('w')
      expect(mockOnSwipe).toHaveBeenCalledWith('superLike')
    })

    it('スペースキーで詳細が表示される', () => {
      const mockOnDetail = jest.fn()

      renderHook(() =>
        useKeyboardSwipe({
          onSwipe: jest.fn(),
          onDetail: mockOnDetail,
        })
      )

      simulateKeyDown(' ')
      expect(mockOnDetail).toHaveBeenCalled()
    })

    it('?キーでヘルプが表示される', () => {
      const mockOnHelp = jest.fn()

      renderHook(() =>
        useKeyboardSwipe({
          onSwipe: jest.fn(),
          onHelp: mockOnHelp,
        })
      )

      simulateKeyDown('?')
      expect(mockOnHelp).toHaveBeenCalled()
    })

    it('入力フィールドにフォーカスがある場合はイベントを無視する', () => {
      const mockOnSwipe = jest.fn()

      renderHook(() =>
        useKeyboardSwipe({
          onSwipe: mockOnSwipe,
        })
      )

      const inputElement = document.createElement('input')
      simulateKeyDown('ArrowRight', inputElement)

      expect(mockOnSwipe).not.toHaveBeenCalled()
    })
  })
})
