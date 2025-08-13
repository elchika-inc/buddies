import { useState, useRef, useEffect } from 'react'
import { DogCard } from './DogCard'
import { Dog } from '@/types/dog'

type DogSwipeCardProps = {
  dog: Dog
  onSwipe: (direction: 'like' | 'pass' | 'super_like') => void
  isTopCard?: boolean
}

export function DogSwipeCard({ dog, onSwipe, isTopCard = true }: DogSwipeCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [isExiting, setIsExiting] = useState(false)
  const [exitDirection, setExitDirection] = useState<'like' | 'pass' | 'super_like' | null>(null)
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
    
    const threshold = 100
    if (Math.abs(dragOffset.y) > threshold && dragOffset.y < 0) {
      triggerExit('super_like')
    } else if (Math.abs(dragOffset.x) > threshold) {
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
    
    const threshold = 100
    if (Math.abs(dragOffset.y) > threshold && dragOffset.y < 0) {
      triggerExit('super_like')
    } else if (Math.abs(dragOffset.x) > threshold) {
      const direction = dragOffset.x > 0 ? 'like' : 'pass'
      triggerExit(direction)
    } else {
      setIsDragging(false)
      setDragOffset({ x: 0, y: 0 })
    }
  }

  const triggerExit = (direction: 'like' | 'pass' | 'super_like') => {
    setIsExiting(true)
    setExitDirection(direction)
    setIsDragging(false)
    
    setTimeout(() => {
      onSwipe(direction)
    }, 300)
  }

  useEffect(() => {
    setIsExiting(false)
    setExitDirection(null)
    setDragOffset({ x: 0, y: 0 })
    setIsDragging(false)
  }, [dog.id, isTopCard])

  const rotation = isExiting 
    ? (exitDirection === 'like' ? 30 : exitDirection === 'pass' ? -30 : 0)
    : dragOffset.x * 0.1
  
  const translateX = isExiting 
    ? (exitDirection === 'like' ? window.innerWidth : exitDirection === 'pass' ? -window.innerWidth : dragOffset.x)
    : dragOffset.x
  
  const translateY = isExiting 
    ? (exitDirection === 'super_like' ? -window.innerHeight : dragOffset.y + 50)
    : dragOffset.y
  
  const opacity = isExiting 
    ? 0 
    : Math.max(0.3, 1 - Math.abs(dragOffset.x) / 200)

  const cardStyle = {
    transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`,
    opacity: opacity,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
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
      className="select-none"
    >
      <DogCard dog={dog} />
      
      {isTopCard && (Math.abs(dragOffset.x) > 50 || Math.abs(dragOffset.y) > 50) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`
              px-4 py-2 rounded-lg font-bold text-lg border-2 
              ${Math.abs(dragOffset.y) > 50 && dragOffset.y < 0
                ? 'bg-blue-500/20 border-blue-500 text-blue-500'
                : dragOffset.x > 0 
                ? 'bg-green-500/20 border-green-500 text-green-500' 
                : 'bg-red-500/20 border-red-500 text-red-500'
              }
            `}
          >
            {Math.abs(dragOffset.y) > 50 && dragOffset.y < 0 
              ? '⭐ スーパーライク' 
              : dragOffset.x > 0 ? '❤️ いいね' : '❌ パス'
            }
          </div>
        </div>
      )}
    </div>
  )
}