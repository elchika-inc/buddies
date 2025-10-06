'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share, RefreshCw } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [showUpdateNotification, setShowUpdateNotification] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    // PWAがすでにインストールされているかチェック
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
      const iosStandalone = (window.navigator as any).standalone === true
      setIsStandalone(standalone || iosStandalone)
    }

    // iOSデバイスかチェック
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase()
      const ios = /iphone|ipad|ipod/.test(userAgent)
      const notAndroid = !/android/.test(userAgent)
      setIsIOS(ios && notAndroid)
    }

    checkStandalone()
    checkIOS()

    // インストールプロンプトイベントをキャッチ
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // インストール未完了の場合、3秒後にバナー表示
      if (!localStorage.getItem('pwa-install-dismissed')) {
        setTimeout(() => setShowInstallBanner(true), 3000)
      }
    }

    // アプリインストール成功時
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setShowInstallBanner(false)
      localStorage.setItem('pwa-installed', 'true')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // iOSで未インストールの場合、初回訪問から10秒後にガイド表示
    if (isIOS && !isStandalone && !localStorage.getItem('ios-install-guide-shown')) {
      setTimeout(() => {
        setShowIOSModal(true)
        localStorage.setItem('ios-install-guide-shown', 'true')
      }, 10000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isIOS, isStandalone])

  // Service Worker 更新検知の処理
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    // Service Worker の登録を監視
    const setupUpdateDetection = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          // 既に待機中のワーカーがあるかチェック
          if (registration.waiting) {
            setWaitingWorker(registration.waiting)
            setShowUpdateNotification(true)
          }

          // 新しい Service Worker が見つかった時
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setWaitingWorker(newWorker)
                  setShowUpdateNotification(true)
                }
              })
            }
          })

          // 定期的な更新チェック（1時間ごと）
          const intervalId = setInterval(
            () => {
              registration.update()
            },
            60 * 60 * 1000
          )

          // ページフォーカス時の更新チェック
          const handleFocus = () => {
            registration.update()
          }
          window.addEventListener('focus', handleFocus)

          return () => {
            clearInterval(intervalId)
            window.removeEventListener('focus', handleFocus)
          }
        }
      } catch (error) {
        console.error('Service Worker 更新検知の設定に失敗:', error)
      }

      // すべてのパスで undefined を返すようにする
      return undefined
    }

    setupUpdateDetection()

    // Service Worker が更新されて制御が移った時
    const handleControllerChange = () => {
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // iOSの場合はガイドモーダルを表示
      if (isIOS) {
        setShowIOSModal(true)
      }
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('PWAがインストールされました')
      } else {
        localStorage.setItem('pwa-install-dismissed', 'true')
      }
    } catch (error) {
      console.error('インストールエラー:', error)
    }

    setDeferredPrompt(null)
    setShowInstallBanner(false)
  }

  const dismissBanner = () => {
    setShowInstallBanner(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // アップデート処理
  const handleUpdate = () => {
    if (!waitingWorker) return

    // 待機中の Service Worker にスキップ待ちメッセージを送信
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })

    // Service Worker の更新を待つ
    waitingWorker.addEventListener('statechange', () => {
      if (waitingWorker.state === 'activated') {
        window.location.reload()
      }
    })
  }

  // 更新通知を閉じる
  const dismissUpdateNotification = () => {
    setShowUpdateNotification(false)
    // 24時間は再表示しない
    localStorage.setItem('update-notification-dismissed', Date.now().toString())
  }

  // すでにPWAとして実行中の場合は、更新通知のみ表示可能
  if (isStandalone && !showUpdateNotification) {
    return null
  }

  return (
    <>
      {/* 更新通知バナー */}
      {showUpdateNotification && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-xl p-4 z-50 animate-slide-down">
          <button
            onClick={dismissUpdateNotification}
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
                  onClick={dismissUpdateNotification}
                  className="flex-1 bg-white/20 text-white font-medium py-2 px-4 rounded-lg hover:bg-white/30 transition-colors"
                >
                  後で
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* インストールバナー */}
      {showInstallBanner && !isStandalone && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 animate-slide-up">
          <button
            onClick={dismissBanner}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Download className="w-8 h-8 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">アプリをインストール</h3>
              <p className="text-sm text-gray-600 mb-3">
                ホーム画面に追加して、より快適にご利用いただけます
              </p>
              <button
                onClick={handleInstallClick}
                className="w-full bg-orange-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
              >
                インストール
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS用インストールガイドモーダル */}
      {showIOSModal && isIOS && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 animate-slide-up">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="閉じる"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-bold mb-4 text-gray-900">ホーム画面に追加</h2>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">1</span>
                </div>
                <p className="text-gray-700">
                  下部の <Share className="inline w-4 h-4 mx-1" /> 共有ボタンをタップ
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">2</span>
                </div>
                <p className="text-gray-700">「ホーム画面に追加」をタップ</p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">3</span>
                </div>
                <p className="text-gray-700">右上の「追加」をタップ</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-6 bg-orange-500 text-white font-medium py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  )
}
