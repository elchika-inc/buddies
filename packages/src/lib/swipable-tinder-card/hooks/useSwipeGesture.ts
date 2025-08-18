import { useState, useRef } from 'react'
import { SWIPE_THRESHOLDS } from '../config/swipeConfig'
import { SwipeGestureOptions, SwipeAction } from '../types/swipe'

export function useSwipeGesture(props: SwipeGestureOptions) {
  const {
    onSwipe,
    horizontalThreshold = SWIPE_THRESHOLDS.STRONG.HORIZONTAL,
    verticalThreshold = SWIPE_THRESHOLDS.STRONG.VERTICAL,
    enableVerticalSwipe = true,
    disabled = false
  } = props

  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const startPos = useRef({ x: 0, y: 0 })

  const handleStart = (clientX: number, clientY: number) => {
    if (disabled) return
    setIsDragging(true)
    startPos.current = { x: clientX, y: clientY }
  }

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || disabled) return
    const deltaX = clientX - startPos.current.x
    const deltaY = clientY - startPos.current.y
    setDragOffset({ x: deltaX, y: deltaY })
  }

  const handleEnd = () => {
    if (!isDragging || disabled) return

    const absX = Math.abs(dragOffset.x)
    const absY = Math.abs(dragOffset.y)

    // 上方向スワイプ優先ロジック：上向きの動きがあればLIKE/PASSを無視
    let action: SwipeAction | null = null

    // 上方向の動きがある場合は、LIKE/PASSを完全に無効化
    const isUpwardSwipe = dragOffset.y < SWIPE_THRESHOLDS.STRONG.UPWARD

    if (isUpwardSwipe) {
      // 上方向のスワイプ：SUPER LIKEの条件を満たす場合のみ実行
      if (
        enableVerticalSwipe &&
        dragOffset.y < -verticalThreshold &&
        absY > absX * SWIPE_THRESHOLDS.RATIO.VERTICAL_DOMINANT
      ) {
        action = 'superlike'
      }
      // 上向きだがSUPER LIKEの条件を満たさない場合は何もしない
    } else {
      // 下方向または水平：LIKE/PASSのみ判定
      if (
        absX > horizontalThreshold &&
        absX > absY * SWIPE_THRESHOLDS.RATIO.HORIZONTAL_DOMINANT
      ) {
        action = dragOffset.x > 0 ? 'like' : 'pass'
      }
    }

    // アクション実行（1つだけ）
    if (action) {
      onSwipe(action)
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