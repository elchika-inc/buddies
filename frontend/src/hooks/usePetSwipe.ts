import { useState, useCallback } from 'react'
import { Pet } from '../types/pet'

/** スワイプ方向の定義 */
export type SwipeDirection = 'like' | 'pass' | 'superLike'

/** スワイプ状態の型定義 */
interface SwipeState {
  /** 現在表示中のペットのインデックス */
  currentIndex: number
  /** いいねしたペットのID一覧 */
  likes: string[]
  /** パスしたペットのID一覧 */
  passes: string[]
  /** スーパーライクしたペットのID一覧 */
  superLikes: string[]
}

/**
 * 統合されたペットスワイプHook
 * シンプルな状態管理とスワイプロジックを提供
 */
export function usePetSwipe(pets: Pet[], _petType: 'dog' | 'cat') {
  const [state, setState] = useState<SwipeState>({
    currentIndex: 0,
    likes: [],
    passes: [],
    superLikes: [],
  })

  /** 現在表示中のペット */
  const currentPet = pets[state.currentIndex] || null
  /** 次のペットが存在するかどうか */
  const hasMorePets = state.currentIndex < pets.length - 1

  /**
   * スワイプ処理を実行
   * @param direction スワイプ方向（like/pass/superLike）
   */
  const handleSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (!currentPet) return

      setState((prev) => {
        const newState = { ...prev }

        // スワイプ方向に応じて適切なリストに追加
        switch (direction) {
          case 'like':
            newState.likes = [...prev.likes, currentPet.id]
            break
          case 'pass':
            newState.passes = [...prev.passes, currentPet.id]
            break
          case 'superLike':
            newState.superLikes = [...prev.superLikes, currentPet.id]
            break
        }

        // 次のペットへ進む
        newState.currentIndex = prev.currentIndex + 1
        return newState
      })
    },
    [currentPet]
  )

  /** スワイプ状態を初期化 */
  const reset = useCallback(() => {
    setState({
      currentIndex: 0,
      likes: [],
      passes: [],
      superLikes: [],
    })
  }, [])

  /** 直前のスワイプ操作を取り消し */
  const undo = useCallback(() => {
    setState((prev) => {
      // 最初のペットの場合は何もしない
      if (prev.currentIndex === 0) return prev

      const newState = { ...prev }
      // インデックスを1つ戻す
      newState.currentIndex = prev.currentIndex - 1

      // 最後のアクションを取り消す
      const lastPetId = pets[newState.currentIndex]?.id
      if (lastPetId) {
        // 各リストから該当ペットIDを削除
        newState.likes = prev.likes.filter((id) => id !== lastPetId)
        newState.passes = prev.passes.filter((id) => id !== lastPetId)
        newState.superLikes = prev.superLikes.filter((id) => id !== lastPetId)
      }

      return newState
    })
  }, [pets])

  return {
    currentPet,
    currentIndex: state.currentIndex,
    hasMorePets,
    likes: state.likes,
    passes: state.passes,
    superLikes: state.superLikes,
    handleSwipe,
    reset,
    undo,
  }
}

/**
 * スワイプジェスチャー判定Hook
 * ドラッグ量からスワイプ方向を判定
 */
export function useSwipeGesture() {
  /** 左右スワイプの判定閾値（ピクセル） */
  const SWIPE_THRESHOLD = 100
  /** スーパーライクの判定閾値（ピクセル） */
  const SUPER_LIKE_THRESHOLD = 100

  /**
   * ドラッグ位置からスワイプ方向を判定
   * @param x X軸方向の移動量
   * @param y Y軸方向の移動量
   * @returns スワイプ方向、または閾値未満の場合はnull
   */
  const getSwipeDirection = useCallback((x: number, y: number): SwipeDirection | null => {
    // 上スワイプ（スーパーライク）
    if (y < -SUPER_LIKE_THRESHOLD) {
      return 'superLike'
    }

    // 右スワイプ（ライク）
    if (x > SWIPE_THRESHOLD) {
      return 'like'
    }

    // 左スワイプ（パス）
    if (x < -SWIPE_THRESHOLD) {
      return 'pass'
    }

    return null
  }, [])

  /**
   * スワイプインジケーターの透明度を計算
   * @param x X軸方向の移動量
   * @param y Y軸方向の移動量
   * @returns 各インジケーターの透明度（0〜1）
   */
  const getIndicatorOpacity = useCallback(
    (
      x: number,
      y: number
    ): {
      like: number
      pass: number
      superLike: number
    } => {
      return {
        // 右スワイプ：移動量に比例して不透明に
        like: Math.max(0, Math.min(1, x / SWIPE_THRESHOLD)),
        // 左スワイプ：移動量に比例して不透明に
        pass: Math.max(0, Math.min(1, -x / SWIPE_THRESHOLD)),
        // 上スワイプ：移動量に比例して不透明に
        superLike: Math.max(0, Math.min(1, -y / SUPER_LIKE_THRESHOLD)),
      }
    },
    []
  )

  return {
    getSwipeDirection,
    getIndicatorOpacity,
    SWIPE_THRESHOLD,
    SUPER_LIKE_THRESHOLD,
  }
}

/**
 * ローカルストレージ永続化Hook
 * スワイプ履歴を保存・復元
 */
export function useSwipeHistory(key: string) {
  /** ローカルストレージから履歴を復元、失敗時は初期値を使用 */
  const [history, setHistory] = useState<SwipeState>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved
        ? JSON.parse(saved)
        : {
            currentIndex: 0,
            likes: [],
            passes: [],
            superLikes: [],
          }
    } catch {
      // パースエラー時は初期状態を返す
      return {
        currentIndex: 0,
        likes: [],
        passes: [],
        superLikes: [],
      }
    }
  })

  /**
   * 履歴をローカルストレージに保存
   * @param state 保存するスワイプ状態
   */
  const saveHistory = useCallback(
    (state: SwipeState) => {
      try {
        localStorage.setItem(key, JSON.stringify(state))
        setHistory(state)
      } catch (error) {
        console.error('Failed to save history:', error)
      }
    },
    [key]
  )

  /** 履歴をクリア（初期状態に戻す） */
  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(key)
      setHistory({
        currentIndex: 0,
        likes: [],
        passes: [],
        superLikes: [],
      })
    } catch (error) {
      console.error('Failed to clear history:', error)
    }
  }, [key])

  return {
    history,
    saveHistory,
    clearHistory,
  }
}
