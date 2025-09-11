if (!self.define) {
  let e,
    s = {}
  const i = (i, a) => (
    (i = new URL(i + '.js', a).href),
    s[i] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script')
          ;((e.src = i), (e.onload = s), document.head.appendChild(e))
        } else ((e = i), importScripts(i), s())
      }).then(() => {
        let e = s[i]
        if (!e) throw new Error(`Module ${i} didn’t register its module`)
        return e
      })
  )
  self.define = (a, t) => {
    const c = e || ('document' in self ? document.currentScript.src : '') || location.href
    if (s[c]) return
    let n = {}
    const r = (e) => i(e, c),
      d = { module: { uri: c }, exports: n, require: r }
    s[c] = Promise.all(a.map((e) => d[e] || r(e))).then((e) => (t(...e), n))
  }
}
define(['./workbox-349c6d8e'], function (e) {
  'use strict'
  ;(importScripts('fallback-gvY22T87_CBOa2eP4iSBs.js'),
    e.setCacheNameDetails({ prefix: 'pawmatch-minimal' }),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: '4216436de004caa8e891f27ada4715de' },
        { url: '/_next/static/chunks/166-53d3f8ed9ef990b9.js', revision: 'gvY22T87_CBOa2eP4iSBs' },
        { url: '/_next/static/chunks/887-c351981bced443d8.js', revision: 'gvY22T87_CBOa2eP4iSBs' },
        {
          url: '/_next/static/chunks/app/_not-found/page-0c8f96f4b4932fe2.js',
          revision: 'gvY22T87_CBOa2eP4iSBs',
        },
        {
          url: '/_next/static/chunks/app/layout-f0dac8f3c0de6e2e.js',
          revision: 'gvY22T87_CBOa2eP4iSBs',
        },
        {
          url: '/_next/static/chunks/app/page-f3ad27d8937e1442.js',
          revision: 'gvY22T87_CBOa2eP4iSBs',
        },
        {
          url: '/_next/static/chunks/c7879cf7-c9ae63b0ac9ebea0.js',
          revision: 'gvY22T87_CBOa2eP4iSBs',
        },
        {
          url: '/_next/static/chunks/framework-748f0c0865827d8f.js',
          revision: 'gvY22T87_CBOa2eP4iSBs',
        },
        { url: '/_next/static/chunks/main-8eeb7d0764104527.js', revision: 'gvY22T87_CBOa2eP4iSBs' },
        {
          url: '/_next/static/chunks/main-app-5a275ddd22e67eff.js',
          revision: 'gvY22T87_CBOa2eP4iSBs',
        },
        {
          url: '/_next/static/chunks/pages/_app-7347afe84f90e147.js',
          revision: 'gvY22T87_CBOa2eP4iSBs',
        },
        {
          url: '/_next/static/chunks/pages/_error-87d77e1d43fbb9db.js',
          revision: 'gvY22T87_CBOa2eP4iSBs',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-f09a9c8cce788192.js',
          revision: 'gvY22T87_CBOa2eP4iSBs',
        },
        { url: '/_next/static/css/e44dbbd21c0c1707.css', revision: 'e44dbbd21c0c1707' },
        {
          url: '/_next/static/gvY22T87_CBOa2eP4iSBs/_buildManifest.js',
          revision: 'e80118e065c9b33b56a9656ebd02d2fb',
        },
        {
          url: '/_next/static/gvY22T87_CBOa2eP4iSBs/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        {
          url: '/_next/static/media/19cfc7226ec3afaa-s.woff2',
          revision: '9dda5cfc9a46f256d0e131bb535e46f8',
        },
        {
          url: '/_next/static/media/21350d82a1f187e9-s.woff2',
          revision: '4e2553027f1d60eff32898367dd4d541',
        },
        {
          url: '/_next/static/media/8e9860b6e62d6359-s.woff2',
          revision: '01ba6c2a184b8cba08b0d57167664d75',
        },
        {
          url: '/_next/static/media/ba9851c3c22cd980-s.woff2',
          revision: '9e494903d6b0ffec1a1e14d34427d44d',
        },
        {
          url: '/_next/static/media/c5fe6dc8356a8c31-s.woff2',
          revision: '027a89e9ab733a145db70f09b8a18b42',
        },
        {
          url: '/_next/static/media/df0a9ae256c0569c-s.woff2',
          revision: 'd54db44de5ccb18886ece2fda72bdfe0',
        },
        {
          url: '/_next/static/media/e4af272ccee01ff0-s.p.woff2',
          revision: '65850a373e258f1c897a2b3d75eb74de',
        },
        { url: '/_offline', revision: 'gvY22T87_CBOa2eP4iSBs' },
        { url: '/clear-cache.js', revision: '00db85584be6a0d7a45b1a704c4e60f1' },
        { url: '/dog.svg', revision: '978cb4a850ead4225ff86c32a5871204' },
        { url: '/favicon.ico', revision: 'd41d8cd98f00b204e9800998ecf8427e' },
        { url: '/manifest.json', revision: '5045e84451a905e9da51d01fdafa9b73' },
        { url: '/sw-minimal.js', revision: 'b0812004ec64271d774733f49612617d' },
      ],
      { ignoreURLParametersMatching: [] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({ request: e, response: s, event: i, state: a }) =>
              s && 'opaqueredirect' === s.type
                ? new Response(s.body, { status: 200, statusText: 'OK', headers: s.headers })
                : s,
          },
          { handlerDidError: async ({ request: e }) => self.fallback(e) },
        ],
      }),
      'GET'
    ))
})
