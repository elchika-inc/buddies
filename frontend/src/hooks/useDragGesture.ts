import { useState, useCallback, useRef } from 'react'
import { TAP } from '@/constants/gesture'

export interface DragState {
  isDragging: boolean
  offset: { x: number; y: number }
}

interface DragGestureOptions {
  onDragEnd: (offset: { x: number; y: number }) => void
  onTap?: () => void
  disabled?: boolean
}

/**
 * シンプルなドラッグジェスチャーを管理するフック
 * PointerEventsを使用してマウスとタッチの両方に対応
 */
export function useDragGesture({ onDragEnd, onTap, disabled = false }: DragGestureOptions) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    offset: { x: 0, y: 0 },
  })

  const dragStartRef = useRef({ x: 0, y: 0, time: 0 })

  // PointerEventsで統一（マウス＋タッチ両対応）
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()

      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
      }

      setDragState({ isDragging: true, offset: { x: 0, y: 0 } })

      // ポインターキャプチャを設定（ドラッグ中にポインターが要素から外れても追跡）
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [disabled]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || disabled) return

      const offset = {
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      }

      setDragState((prev) => ({ ...prev, offset }))
    },
    [dragState.isDragging, disabled]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || disabled) return

      const duration = Date.now() - dragStartRef.current.time
      const distance = Math.hypot(dragState.offset.x, dragState.offset.y)

      // シンプルな判定: TAP.MAX_DISTANCE以下 & TAP.MAX_DURATION以下ならタップ
      if (distance < TAP.MAX_DISTANCE && duration < TAP.MAX_DURATION && onTap) {
        onTap()
      } else {
        onDragEnd(dragState.offset)
      }

      setDragState({ isDragging: false, offset: { x: 0, y: 0 } })

      // ポインターキャプチャを解放
      e.currentTarget.releasePointerCapture(e.pointerId)
    },
    [dragState.isDragging, dragState.offset, disabled, onDragEnd, onTap]
  )

  // カードが変わったらリセット
  const reset = useCallback(() => {
    setDragState({ isDragging: false, offset: { x: 0, y: 0 } })
  }, [])

  return {
    dragState,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp, // キャンセル時も同じ処理
    },
    reset,
  }
}
