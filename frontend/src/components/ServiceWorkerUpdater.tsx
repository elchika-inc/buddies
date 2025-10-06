'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, X } from 'lucide-react'

export default function ServiceWorkerUpdater() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Service Worker のサポートチェック
    if (!('serviceWorker' in navigator)) {
      return
    }

    // Service Worker の登録を取得
    const setupServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg) {
          setRegistration(reg)

          // 既に待機中のワーカーがあるかチェック
          if (reg.waiting) {
            setWaitingWorker(reg.waiting)
            setShowUpdateBanner(true)
          }

          // 新しい Service Worker が見つかった時
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 新しいバージョンが利用可能
                  setWaitingWorker(newWorker)
                  setShowUpdateBanner(true)
                }
              })
            }
          })
        }
      } catch (error) {
        console.error('Service Worker 登録の取得に失敗:', error)
      }
    }

    setupServiceWorker()

    // ページがフォーカスを得た時に更新をチェック
    const handleFocus = () => {
      if (registration) {
        registration.update()
      }
    }

    // controllerchange イベントの処理（Service Worker が更新された時）
    const handleControllerChange = () => {
      // 自動リロード（バナーを表示せずに即座に更新）
      window.location.reload()
    }

    window.addEventListener('focus', handleFocus)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // 定期的な更新チェック（1時間ごと）
    const intervalId = setInterval(
      () => {
        if (registration) {
          registration.update()
        }
      },
      60 * 60 * 1000
    )

    return () => {
      window.removeEventListener('focus', handleFocus)
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      clearInterval(intervalId)
    }
  }, [registration])

  const handleUpdate = () => {
    if (!waitingWorker) return

    // 待機中の Service Worker にスキップ待ちメッセージを送信
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })

    // Service Worker の更新を待つ
    waitingWorker.addEventListener('statechange', () => {
      if (waitingWorker.state === 'activated') {
        // ページをリロード
        window.location.reload()
      }
    })
  }

  const dismissBanner = () => {
    setShowUpdateBanner(false)
    // 24時間は再表示しない
    localStorage.setItem('update-dismissed', Date.now().toString())
  }

  // 更新バナーを表示するかどうかの判定
  useEffect(() => {
    if (showUpdateBanner) {
      const dismissed = localStorage.getItem('update-dismissed')
      if (dismissed) {
        const dismissedTime = parseInt(dismissed)
        const now = Date.now()
        const dayInMs = 24 * 60 * 60 * 1000

        if (now - dismissedTime < dayInMs) {
          setShowUpdateBanner(false)
        }
      }
    }
  }, [showUpdateBanner])

  if (!showUpdateBanner) {
    return null
  }

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-xl p-4 z-50 animate-slide-down">
      <button
        onClick={dismissBanner}
        className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
        aria-label="閉じる"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <RefreshCw className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white mb-1">アップデートがあります</h3>
          <p className="text-sm text-white/90 mb-3">
            新しいバージョンが利用可能です。今すぐ更新して最新機能をお楽しみください。
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleUpdate}
              className="flex-1 bg-white text-blue-600 font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
            >
              今すぐ更新
            </button>
            <button
              onClick={dismissBanner}
              className="flex-1 bg-white/20 text-white font-medium py-2 px-4 rounded-lg hover:bg-white/30 transition-colors"
            >
              後で
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
