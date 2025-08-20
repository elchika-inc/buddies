import { useState, useCallback, useRef } from 'react'

export interface DragState {
  isDragging: boolean
  dragOffset: { x: number; y: number }
  startPos: { x: number; y: number }
}

export interface DragGestureResult {
  dragState: DragState
  dragHandlers: {
    onMouseDown: (e: React.MouseEvent) => void
    onMouseMove: (e: React.MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
  resetDrag: () => void
}

export function useDragGesture(
  isEnabled: boolean = true,
  onDragEnd?: (offset: { x: number; y: number }) => void
): DragGestureResult {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })

  const resetDrag = useCallback(() => {
    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })
    setStartPos({ x: 0, y: 0 })
  }, [])

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !isEnabled) return
    
    const finalOffset = { ...dragOffset }
    resetDrag()
    
    if (onDragEnd) {
      onDragEnd(finalOffset)
    }
  }, [isDragging, isEnabled, dragOffset, resetDrag, onDragEnd])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEnabled) return
    setIsDragging(true)
    setStartPos({ x: e.clientX, y: e.clientY })
  }, [isEnabled])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !isEnabled) return
    const deltaX = e.clientX - startPos.x
    const deltaY = e.clientY - startPos.y
    setDragOffset({ x: deltaX, y: deltaY })
  }, [isDragging, isEnabled, startPos])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isEnabled) return
    setIsDragging(true)
    const touch = e.touches[0]
    setStartPos({ x: touch.clientX, y: touch.clientY })
  }, [isEnabled])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !isEnabled) return
    const touch = e.touches[0]
    const deltaX = touch.clientX - startPos.x
    const deltaY = touch.clientY - startPos.y
    setDragOffset({ x: deltaX, y: deltaY })
  }, [isDragging, isEnabled, startPos])

  return {
    dragState: {
      isDragging,
      dragOffset,
      startPos,
    },
    dragHandlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleDragEnd,
      onMouseLeave: handleDragEnd,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleDragEnd,
    },
    resetDrag,
  }
}