import { useEffect, useState, useCallback, useRef } from 'react'
import { PetCard } from './PetCard'
import { SwipeIndicator } from './SwipeIndicator'
import { FrontendPet } from '@/types/pet'
import { SwipeDirection, useSwipeGesture } from '@/hooks/usePetSwipe'
import { useDragGesture } from '@/hooks/useDragGesture'
import { getCardStyle, SWIPE_ANIMATION } from './PetSwipeCard/animations'
import type { FavoriteRating } from '@/types/favorites'

type PetSwipeCardProps = {
  pet: FrontendPet
  onSwipe: (direction: SwipeDirection) => void
  isTopCard?: boolean
  /** ボタンやキーボードによるスワイプ指示（petIdで特定のカードを識別） */
  buttonSwipeDirection?: SwipeDirection | null
  onTap?: () => void
  cardIndex?: number
  favoriteRating?: FavoriteRating | null
}

/**
 * スワイプ可能なペットカードコンポーネント
 * ドラッグジェスチャーとアニメーションを管理
 */
export function PetSwipeCard({
  pet,
  onSwipe,
  isTopCard = true,
  buttonSwipeDirection,
  onTap,
  cardIndex = 0,
  favoriteRating,
}: PetSwipeCardProps) {
  const [exitState, setExitState] = useState<{
    isExiting: boolean
    direction: SwipeDirection | null
  }>({
    isExiting: false,
    direction: null,
  })

  // onSwipeコールバックの最新値を保持
  const onSwipeRef = useRef(onSwipe)
  useEffect(() => {
    onSwipeRef.current = onSwipe
  }, [onSwipe])

  const { getSwipeDirection, getIndicatorOpacity } = useSwipeGesture()

  // ドラッグ終了時の処理
  const handleDragEnd = useCallback(
    (offset: { x: number; y: number }) => {
      const direction = getSwipeDirection(offset.x, offset.y)
      if (direction) {
        setExitState({ isExiting: true, direction })
        setTimeout(() => {
          onSwipeRef.current(direction)
          setExitState({ isExiting: false, direction: null })
        }, SWIPE_ANIMATION.duration)
      }
    },
    [getSwipeDirection]
  )

  // ドラッグジェスチャーフックを使用
  const { dragState, handlers, reset } = useDragGesture({
    onDragEnd: handleDragEnd,
    onTap,
    disabled: !isTopCard,
  })

  // ペットが変更されたときに状態をリセット
  useEffect(() => {
    reset()
    setExitState({ isExiting: false, direction: null })
  }, [pet.id, reset])

  // ボタン/キーボードによるスワイプ指示を処理
  useEffect(() => {
    if (buttonSwipeDirection && isTopCard) {
      setExitState({ isExiting: true, direction: buttonSwipeDirection })
      setTimeout(() => {
        onSwipeRef.current(buttonSwipeDirection)
        setExitState({ isExiting: false, direction: null })
      }, SWIPE_ANIMATION.duration)
    }
  }, [buttonSwipeDirection, isTopCard])

  // カードのスタイル生成
  const cardStyle = getCardStyle({
    isExiting: exitState.isExiting,
    exitDirection: exitState.direction,
    dragOffset: dragState.offset,
    isDragging: dragState.isDragging,
    isTopCard,
  })

  // インジケーターの表示制御
  const opacity = getIndicatorOpacity(dragState.offset.x, dragState.offset.y)
  const showIndicator =
    isTopCard &&
    (dragState.isDragging || exitState.isExiting) &&
    (opacity.like > 0 || opacity.pass > 0 || opacity.superLike > 0)

  const indicatorStyle = {
    like: { opacity: opacity.like, color: '#22c55e' },
    pass: { opacity: opacity.pass, color: '#ef4444' },
    superLike: { opacity: opacity.superLike, color: '#3b82f6' },
  }

  const indicatorText = {
    like: 'LIKE',
    pass: 'PASS',
    superLike: 'SUPER LIKE',
  }

  return (
    <div
      style={cardStyle}
      {...handlers}
      className="select-none touch-none w-[90vw] max-w-sm sm:max-w-md md:max-w-lg h-full"
    >
      <PetCard pet={pet} priority={cardIndex < 5} favoriteRating={favoriteRating} />

      {showIndicator && (
        <SwipeIndicator
          dragOffset={dragState.offset}
          isExiting={exitState.isExiting}
          exitDirection={exitState.direction}
          indicatorStyle={indicatorStyle}
          indicatorText={indicatorText}
        />
      )}
    </div>
  )
}
