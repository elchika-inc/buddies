import { useState, useCallback } from 'react'

interface ImageLoaderOptions {
  src: string
  fallbackSrc: string
  priority?: boolean
}

/**
 * 画像の読み込み状態を管理するシンプルなフック
 * Next.js Image コンポーネントと連携
 */
export function useImageLoader({ src, fallbackSrc, priority = false }: ImageLoaderOptions) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [isLoading, setIsLoading] = useState(true)

  const handleLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handleError = useCallback(() => {
    // エラー時はフォールバック画像を使用
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
    }
    setIsLoading(false)
  }, [currentSrc, fallbackSrc])

  return {
    src: currentSrc,
    isLoading,
    quality: priority ? 85 : 75,
    onLoad: handleLoad,
    onError: handleError,
  }
}
