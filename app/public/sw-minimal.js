// 最小限のService Worker
// オフライン検知とフォールバックページの表示のみ

// Service Workerのバージョン（更新時に変更）
const CACHE_VERSION = 'v1-minimal';
const OFFLINE_URL = '/_offline';

// インストール時にオフラインページをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll([OFFLINE_URL]);
    })
  );
  // 即座にアクティブ化
  self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_VERSION)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  // すぐにコントロールを取得
  self.clients.claim();
});

// フェッチイベント - ネットワークファースト、オフライン時のみフォールバック
self.addEventListener('fetch', (event) => {
  // ナビゲーションリクエスト（ページ遷移）の場合のみ処理
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // オフライン時はキャッシュからオフラインページを返す
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }
  
  // その他のリクエストは通常通りネットワークから取得（キャッシュなし）
  event.respondWith(fetch(event.request));
});