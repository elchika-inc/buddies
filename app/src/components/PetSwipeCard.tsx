import { useState, useRef, useEffect, useCallback } from 'react'
import { PetCard } from './PetCard'
import { Pet } from '@/types/pet'
import { SwipeDirection } from '@/hooks/usePetSwipeState'

// スワイプ判定の定数
const SWIPE_THRESHOLD = 100
const SUPER_LIKE_THRESHOLD = 100
const CARD_EXIT_ANIMATION_DURATION = 400

type PetSwipeCardProps = {
  pet: Pet
  onSwipe: (direction: SwipeDirection) => void
  isTopCard?: boolean
  buttonSwipeDirection?: SwipeDirection | null
}

export function PetSwipeCard({
  pet,
  onSwipe,
  isTopCard = true,
  buttonSwipeDirection,
}: PetSwipeCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [isExiting, setIsExiting] = useState(false)
  const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isTopCard) return
    setIsDragging(true)
    setStartPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isTopCard) return
    const deltaX = e.clientX - startPos.x
    const deltaY = e.clientY - startPos.y
    setDragOffset({ x: deltaX, y: deltaY })
  }

  const handleMouseUp = () => {
    if (!isDragging || !isTopCard) return

    if (Math.abs(dragOffset.y) > SUPER_LIKE_THRESHOLD && dragOffset.y < 0) {
      triggerExit('superLike')
    } else if (Math.abs(dragOffset.x) > SWIPE_THRESHOLD) {
      const direction = dragOffset.x > 0 ? 'like' : 'pass'
      triggerExit(direction)
    } else {
      setIsDragging(false)
      setDragOffset({ x: 0, y: 0 })
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTopCard) return
    setIsDragging(true)
    const touch = e.touches[0]
    setStartPos({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isTopCard) return
    const touch = e.touches[0]
    const deltaX = touch.clientX - startPos.x
    const deltaY = touch.clientY - startPos.y
    setDragOffset({ x: deltaX, y: deltaY })
  }

  const handleTouchEnd = () => {
    if (!isDragging || !isTopCard) return

    if (Math.abs(dragOffset.y) > SUPER_LIKE_THRESHOLD && dragOffset.y < 0) {
      triggerExit('superLike')
    } else if (Math.abs(dragOffset.x) > SWIPE_THRESHOLD) {
      const direction = dragOffset.x > 0 ? 'like' : 'pass'
      triggerExit(direction)
    } else {
      setIsDragging(false)
      setDragOffset({ x: 0, y: 0 })
    }
  }

  const triggerExit = useCallback(
    (direction: SwipeDirection) => {
      setIsExiting(true)
      setExitDirection(direction)
      setIsDragging(false)

      setTimeout(() => {
        onSwipe(direction)
      }, CARD_EXIT_ANIMATION_DURATION)
    },
    [onSwipe]
  )

  useEffect(() => {
    setIsExiting(false)
    setExitDirection(null)
    setDragOffset({ x: 0, y: 0 })
    setIsDragging(false)
  }, [pet.id, isTopCard])

  useEffect(() => () => {
    if (buttonSwipeDirection) {
      setTimeout(() => {
        setIsExiting(false)
        setExitDirection(null)
      }, 0)
    }
  }, [pet.id, buttonSwipeDirection])

  useEffect(() => {
    if (buttonSwipeDirection && isTopCard) {
      triggerExit(buttonSwipeDirection)
    }
  }, [buttonSwipeDirection, isTopCard, triggerExit])

  const rotation = isExiting
    ? exitDirection === 'like'
      ? 30
      : exitDirection === 'pass'
        ? -30
        : 0
    : dragOffset.x * 0.1

  const translateX = isExiting
    ? exitDirection === 'like'
      ? window.innerWidth
      : exitDirection === 'pass'
        ? -window.innerWidth
        : dragOffset.x
    : dragOffset.x

  const translateY = isExiting
    ? exitDirection === 'superLike'
      ? -window.innerHeight
      : dragOffset.y + 50
    : dragOffset.y

  const opacity = 1

  const cardStyle = {
    transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`,
    opacity,
    transition: isDragging
      ? 'none'
      : isExiting
        ? 'transform 0.4s ease-out'
        : 'transform 0.3s ease-out, opacity 0.3s ease-out',
    zIndex: isTopCard ? 10 : 1,
    position: 'absolute' as const,
    cursor: isTopCard ? 'grab' : 'default',
  }

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="select-none w-[90vw] max-w-sm sm:max-w-md md:max-w-lg h-full"
    >
      <PetCard pet={pet} />

      {isTopCard && (Math.abs(dragOffset.x) > 50 || Math.abs(dragOffset.y) > 50 || isExiting) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`
              px-6 py-3 sm:px-12 sm:py-6 rounded-2xl font-bold text-xl sm:text-4xl shadow-lg backdrop-blur-sm text-white
              ${
                (isExiting && exitDirection === 'superLike') || 
                (Math.abs(dragOffset.y) > 50 && dragOffset.y < 0)
                  ? 'bg-blue-500/80'
                  : (isExiting && exitDirection === 'like') || dragOffset.x > 0
                    ? 'bg-green-500/80'
                    : 'bg-red-500/80'
              }
            `}
          >
            {isExiting && exitDirection === 'superLike'
              ? 'めっちゃいいね'
              : isExiting && exitDirection === 'like'
                ? 'いいね'
                : isExiting && exitDirection === 'pass'
                  ? 'パス'
                  : Math.abs(dragOffset.y) > 50 && dragOffset.y < 0
                    ? 'めっちゃいいね'
                    : dragOffset.x > 0
                      ? 'いいね'
                      : 'パス'}
          </div>
        </div>
      )}
    </div>
  )
}