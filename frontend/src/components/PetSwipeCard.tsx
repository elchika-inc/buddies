import { useRef, useEffect, useState, useCallback } from 'react'
import { PetCard } from './PetCard'
import { SwipeIndicator } from './SwipeIndicator'
import { FrontendPet } from '@/types/pet'
import { SwipeDirection, useSwipeGesture } from '@/hooks/usePetSwipe'
import type { FavoriteRating } from '@/types/favorites'

type PetSwipeCardProps = {
  pet: FrontendPet
  onSwipe: (direction: SwipeDirection) => void
  isTopCard?: boolean
  buttonSwipeDirection?: SwipeDirection | null
  onTap?: () => void
  cardIndex?: number // カードのインデックス（プリロード判定用）
  favoriteRating?: FavoriteRating | null // お気に入りの評価レベル
}

export function PetSwipeCard({
  pet,
  onSwipe,
  isTopCard = true,
  buttonSwipeDirection,
  onTap,
  cardIndex = 0,
  favoriteRating,
}: PetSwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isExiting, setIsExiting] = useState(false)
  const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null)

  const { getSwipeDirection, getIndicatorOpacity } = useSwipeGesture()

  // ドラッグ操作のハンドラー
  const handleDragStart = useCallback(
    (_clientX: number, _clientY: number) => {
      if (!isTopCard) return
      setIsDragging(true)
    },
    [isTopCard]
  )

  const handleDragMove = useCallback(
    (clientX: number, clientY: number, startX: number, startY: number) => {
      if (!isDragging || !isTopCard) return

      const newOffset = {
        x: clientX - startX,
        y: clientY - startY,
      }
      setDragOffset(newOffset)
    },
    [isDragging, isTopCard]
  )

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !isTopCard) return

    setIsDragging(false)

    const direction = getSwipeDirection(dragOffset.x, dragOffset.y)
    if (direction) {
      setIsExiting(true)
      setExitDirection(direction)
      setTimeout(() => {
        onSwipe(direction)
        setIsExiting(false)
        setExitDirection(null)
        setDragOffset({ x: 0, y: 0 })
      }, 300)
    } else {
      // スワイプ閾値未満の場合は元に戻す
      setDragOffset({ x: 0, y: 0 })
    }
  }, [isDragging, isTopCard, dragOffset, getSwipeDirection, onSwipe])

  // マウスイベント
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const startX = e.clientX
      const startY = e.clientY
      setStartPos({ x: startX, y: startY })
      handleDragStart(startX, startY)

      const handleMouseMove = (e: MouseEvent) => {
        handleDragMove(e.clientX, e.clientY, startX, startY)
      }

      const handleMouseUp = () => {
        handleDragEnd()
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [handleDragStart, handleDragMove, handleDragEnd]
  )

  // タッチイベント
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      const startX = touch.clientX
      const startY = touch.clientY
      setStartPos({ x: startX, y: startY })
      handleDragStart(startX, startY)
    },
    [handleDragStart]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      handleDragMove(touch.clientX, touch.clientY, startPos.x, startPos.y)
    },
    [handleDragMove, startPos]
  )

  const handleTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // ペットが変更されたときに状態をリセット
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 })
    setIsDragging(false)
    setIsExiting(false)
    setExitDirection(null)
  }, [pet.id, isTopCard])

  // ボタンスワイプの処理
  useEffect(() => {
    if (buttonSwipeDirection && isTopCard) {
      setIsExiting(true)
      setExitDirection(buttonSwipeDirection)
      setTimeout(() => {
        onSwipe(buttonSwipeDirection)
        setIsExiting(false)
        setExitDirection(null)
        setDragOffset({ x: 0, y: 0 })
      }, 300)
    }
  }, [buttonSwipeDirection, isTopCard, onSwipe])

  // カードのスタイル
  const cardStyle: React.CSSProperties = {
    transform: isExiting
      ? `translate(${exitDirection === 'like' ? '100vw' : exitDirection === 'pass' ? '-100vw' : '0'}, ${exitDirection === 'superLike' ? '-100vh' : '0'}) rotate(${exitDirection === 'like' ? '30deg' : exitDirection === 'pass' ? '-30deg' : '0'})`
      : `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg)`,
    transition: isExiting
      ? 'transform 0.3s ease-out'
      : isDragging
        ? 'none'
        : 'transform 0.3s ease-out',
    position: 'absolute' as const,
    zIndex: isTopCard ? 10 : 1,
  }

  // インジケーターの表示判定とスタイル
  const opacity = getIndicatorOpacity(dragOffset.x, dragOffset.y)
  const showIndicator =
    isTopCard &&
    (isDragging || isExiting) &&
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
      ref={cardRef}
      style={cardStyle}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="select-none touch-none w-[90vw] max-w-sm sm:max-w-md md:max-w-lg h-full"
    >
      <PetCard
        pet={pet}
        onTap={onTap}
        priority={cardIndex < 5} // 最初の5枚のカードを優先読み込み（プリロード）
        favoriteRating={favoriteRating} // 評価レベルを渡す
      />

      {showIndicator && (
        <SwipeIndicator
          dragOffset={dragOffset}
          isExiting={isExiting}
          exitDirection={exitDirection}
          indicatorStyle={indicatorStyle}
          indicatorText={indicatorText}
        />
      )}
    </div>
  )
}
