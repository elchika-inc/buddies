'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'

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

  // すでにPWAとして実行中の場合は何も表示しない
  if (isStandalone) {
    return null
  }

  return (
    <>
      {/* インストールバナー */}
      {showInstallBanner && (
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
