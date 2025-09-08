'use client'

import { useState } from 'react'

export function CacheClearButton() {
  const [clearing, setClearing] = useState(false)
  const [message, setMessage] = useState('')

  const clearCache = async () => {
    setClearing(true)
    setMessage('')

    try {
      // すべてのキャッシュを削除
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Deleting cache:', cacheName)
            return caches.delete(cacheName)
          })
        )
      }

      // Service Workerを更新
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
        }
      }

      // LocalStorageもクリア（オプション）
      if (typeof localStorage !== 'undefined') {
        localStorage.clear()
      }

      setMessage('キャッシュをクリアしました。ページを再読み込みしてください。')

      // 3秒後に自動リロード
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } catch (error) {
      console.error('Failed to clear cache:', error)
      setMessage('キャッシュのクリアに失敗しました。')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={clearCache}
        disabled={clearing}
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg disabled:opacity-50"
      >
        {clearing ? 'クリア中...' : 'キャッシュクリア'}
      </button>
      {message && (
        <div className="mt-2 p-2 bg-white rounded shadow text-sm text-gray-700">{message}</div>
      )}
    </div>
  )
}
