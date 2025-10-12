import { getKeyboardHints } from '@/hooks/useKeyboardSwipe'
import { useState, useEffect } from 'react'

interface KeyboardHintProps {
  showAlways?: boolean
}

export function KeyboardHint({ showAlways = false }: KeyboardHintProps) {
  const [isDesktop, setIsDesktop] = useState(false)
  const hints = getKeyboardHints()

  useEffect(() => {
    // デスクトップ判定（ウィンドウ幅とタッチデバイスかどうか）
    const checkDesktop = () => {
      const isWideScreen = window.innerWidth >= 1024
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      setIsDesktop(isWideScreen && !isTouchDevice)
    }

    checkDesktop()
    window.addEventListener('resize', checkDesktop)

    return () => {
      window.removeEventListener('resize', checkDesktop)
    }
  }, [])

  // モバイルでは非表示（showAlwaysがtrueでない限り）
  if (!showAlways && !isDesktop) return null

  return (
    <div className="fixed bottom-20 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 z-10 hidden lg:block">
      <div className="text-xs text-gray-600 space-y-1">
        <div className="font-semibold mb-1">キーボード操作:</div>
        <div className="flex flex-col space-y-1">
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
              {hints.pass}
            </kbd>
            <span className="ml-1">パス</span>
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
              {hints.like}
            </kbd>
            <span className="ml-1">いいね</span>
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
              {hints.superLike}
            </kbd>
            <span className="ml-1">スーパー</span>
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
              ?
            </kbd>
            <span className="ml-1">ヘルプ</span>
          </span>
        </div>
      </div>
    </div>
  )
}
