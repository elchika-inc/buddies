import { useState, useRef } from 'react'

type SwipeDirection = 'like' | 'pass' | 'superlike'

type SwipeGestureProps = {
  onSwipe: (direction: SwipeDirection) => void
  horizontalThreshold?: number
  verticalThreshold?: number
  enableVerticalSwipe?: boolean
}

type SwipeGestureState = {
  isDragging: boolean
  dragOffset: { x: number; y: number }
  rotation: number
  opacity: number
  transform: string
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void
    onMouseMove: (e: React.MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

export function useSwipeGesture(props: SwipeGestureProps): SwipeGestureState {
  const { 
    onSwipe, 
    horizontalThreshold = 100, 
    verticalThreshold = 120,
    enableVerticalSwipe = true 
  } = props

  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const startPos = useRef({ x: 0, y: 0 })

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true)
    startPos.current = { x: clientX, y: clientY }
  }

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return

    const deltaX = clientX - startPos.current.x
    const deltaY = clientY - startPos.current.y
    
    setDragOffset({ x: deltaX, y: deltaY })
  }

  const handleEnd = () => {
    if (!isDragging) return

    if (Math.abs(dragOffset.x) > horizontalThreshold) {
      onSwipe(dragOffset.x > 0 ? 'like' : 'pass')
    } else if (enableVerticalSwipe && dragOffset.y < -verticalThreshold) {
      onSwipe('superlike')
    }
    
    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })
  }

  const rotation = dragOffset.x * 0.1
  const opacity = Math.max(0.7, 1 - Math.abs(dragOffset.x) / 300)
  const transform = isDragging 
    ? `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`
    : ''

  const handlers = {
    onMouseDown: (e: React.MouseEvent) => handleStart(e.clientX, e.clientY),
    onMouseMove: (e: React.MouseEvent) => handleMove(e.clientX, e.clientY),
    onMouseUp: handleEnd,
    onMouseLeave: handleEnd,
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0]
      handleStart(touch.clientX, touch.clientY)
    },
    onTouchMove: (e: React.TouchEvent) => {
      const touch = e.touches[0]
      handleMove(touch.clientX, touch.clientY)
    },
    onTouchEnd: handleEnd
  }

  return {
    isDragging,
    dragOffset,
    rotation,
    opacity,
    transform,
    handlers
  }
}