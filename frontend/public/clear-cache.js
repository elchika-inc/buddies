// Service Workerのキャッシュをクリアするスクリプト
// ブラウザのコンソールで実行するか、アプリに組み込んで使用

async function clearAllCaches() {
  // すべてのキャッシュ名を取得
  const cacheNames = await caches.keys()

  // 各キャッシュを削除
  const promises = cacheNames.map((cacheName) => {
    console.log('Deleting cache:', cacheName)
    return caches.delete(cacheName)
  })

  await Promise.all(promises)
  console.log('All caches cleared successfully')

  // Service Workerを更新
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const registration of registrations) {
      registration.update()
    }
    console.log('Service Worker updated')
  }
}

// 特定のキャッシュのみクリア
async function clearSpecificCache(cacheName) {
  const deleted = await caches.delete(cacheName)
  if (deleted) {
    console.log(`Cache "${cacheName}" deleted successfully`)
  } else {
    console.log(`Cache "${cacheName}" not found`)
  }
}

// API関連のキャッシュをクリア
async function clearApiCaches() {
  const cacheNames = await caches.keys()
  const apiCaches = cacheNames.filter(
    (name) => name.includes('api') || name.includes('start-url') || name.includes('workbox')
  )

  for (const cacheName of apiCaches) {
    await caches.delete(cacheName)
    console.log(`Deleted API cache: ${cacheName}`)
  }
}

// エクスポート（モジュールとして使用する場合）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clearAllCaches,
    clearSpecificCache,
    clearApiCaches,
  }
}
