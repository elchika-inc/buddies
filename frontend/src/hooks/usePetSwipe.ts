import { useState, useCallback } from 'react'
import { FrontendPet } from '@/types/pet'
import { SWIPE_CONFIG } from '@/config/swipe'

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

/** 閲覧状態の型定義（軽量版） */
interface BrowsingState {
  /** 最後に閲覧したペットのID */
  lastViewedPetId: string | null
  /** 最後に閲覧したインデックス */
  lastViewedIndex: number
  /** 最終閲覧日時 */
  lastViewedAt: string
  /** 全データ閲覧完了フラグ */
  hasCompletedAll: boolean
}

/**
 * 統合されたペットスワイプHook
 * シンプルな状態管理とスワイプロジックを提供
 */
export function usePetSwipe(pets: FrontendPet[], petType: 'dog' | 'cat') {
  // ローカルストレージのキーを生成（ペットタイプごとに別管理）
  const browsingKey = `${SWIPE_CONFIG.storageKeyPrefix}-${petType}`

  // 初期状態をローカルストレージから復元（軽量版）
  const [state, setState] = useState<SwipeState>(() => {
    try {
      const saved = localStorage.getItem(browsingKey)
      if (saved) {
        const browsingState = JSON.parse(saved) as BrowsingState
        // 全データ閲覧完了していない場合のみ復元
        if (
          !browsingState.hasCompletedAll &&
          browsingState.lastViewedIndex >= 0 &&
          browsingState.lastViewedIndex <= pets.length
        ) {
          return {
            currentIndex: browsingState.lastViewedIndex,
            likes: [],
            passes: [],
            superLikes: [],
          }
        }
      }
    } catch (error) {
      console.error('Failed to load saved state:', error)
    }
    return {
      currentIndex: 0,
      likes: [],
      passes: [],
      superLikes: [],
    }
  })

  /** 現在表示中のペット */
  const currentPet = pets[state.currentIndex] || null
  /** 次のペットが存在するかどうか */
  const hasMorePets = state.currentIndex < pets.length - 1

  /**
   * 閲覧状態を保存（軽量版）
   */
  const saveBrowsingState = useCallback(
    (index: number, petId: string | null, completed: boolean = false) => {
      try {
        const browsingState: BrowsingState = {
          lastViewedPetId: petId,
          lastViewedIndex: index,
          lastViewedAt: new Date().toISOString(),
          hasCompletedAll: completed,
        }
        localStorage.setItem(browsingKey, JSON.stringify(browsingState))
      } catch (error) {
        console.error('Failed to save browsing state:', error)
      }
    },
    [browsingKey]
  )

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

        // 次のペットのIDを取得
        const nextPet = pets[newState.currentIndex]
        const isCompleted = newState.currentIndex >= pets.length

        // 閲覧状態を保存（軽量版）
        saveBrowsingState(newState.currentIndex, nextPet ? nextPet.id : currentPet.id, isCompleted)

        return newState
      })
    },
    [currentPet, pets, saveBrowsingState]
  )

  /** スワイプ状態を初期化 */
  const reset = useCallback(() => {
    const newState = {
      currentIndex: 0,
      likes: [],
      passes: [],
      superLikes: [],
    }
    setState(newState)
    // リセット時は閲覧状態もクリア
    try {
      localStorage.removeItem(browsingKey)
    } catch (error) {
      console.error('Failed to clear saved state:', error)
    }
  }, [browsingKey])

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

// 未使用のuseSwipeHistory関数を削除
