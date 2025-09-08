if (!self.define) {
  let e,
    s = {}
  const t = (t, c) => (
    (t = new URL(t + '.js', c).href),
    s[t] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script')
          ;((e.src = t), (e.onload = s), document.head.appendChild(e))
        } else ((e = t), importScripts(t), s())
      }).then(() => {
        let e = s[t]
        if (!e) throw new Error(`Module ${t} didn’t register its module`)
        return e
      })
  )
  self.define = (c, i) => {
    const a = e || ('document' in self ? document.currentScript.src : '') || location.href
    if (s[a]) return
    let n = {}
    const f = (e) => t(e, a),
      r = { module: { uri: a }, exports: n, require: f }
    s[a] = Promise.all(c.map((e) => r[e] || f(e))).then((e) => (i(...e), n))
  }
}
define(['./workbox-349c6d8e'], function (e) {
  'use strict'
  ;(importScripts('fallback-DJRfv6a8hOVt2pbmuHLnw.js'),
    e.setCacheNameDetails({ prefix: 'pawmatch-minimal' }),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: 'e75c3d9d65c4fa3ca4778c85e7452cda' },
        {
          url: '/_next/static/DJRfv6a8hOVt2pbmuHLnw/_buildManifest.js',
          revision: '6c42e543a47ca7da7c8cc36d94ed3927',
        },
        {
          url: '/_next/static/DJRfv6a8hOVt2pbmuHLnw/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/_next/static/chunks/149-c092cfcd02aa635a.js', revision: 'DJRfv6a8hOVt2pbmuHLnw' },
        { url: '/_next/static/chunks/364-164087ff9cbfe0c8.js', revision: 'DJRfv6a8hOVt2pbmuHLnw' },
        {
          url: '/_next/static/chunks/618f8807-73e804ec042b1c27.js',
          revision: 'DJRfv6a8hOVt2pbmuHLnw',
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-645541008eb01d54.js',
          revision: 'DJRfv6a8hOVt2pbmuHLnw',
        },
        {
          url: '/_next/static/chunks/app/layout-816fa7ed1e9e903e.js',
          revision: 'DJRfv6a8hOVt2pbmuHLnw',
        },
        {
          url: '/_next/static/chunks/app/page-a7e267343fe7f83c.js',
          revision: 'DJRfv6a8hOVt2pbmuHLnw',
        },
        {
          url: '/_next/static/chunks/framework-748f0c0865827d8f.js',
          revision: 'DJRfv6a8hOVt2pbmuHLnw',
        },
        {
          url: '/_next/static/chunks/main-app-252b4df950231fe2.js',
          revision: 'DJRfv6a8hOVt2pbmuHLnw',
        },
        { url: '/_next/static/chunks/main-e8a562164b498647.js', revision: 'DJRfv6a8hOVt2pbmuHLnw' },
        {
          url: '/_next/static/chunks/pages/_app-f11c2271d7889283.js',
          revision: 'DJRfv6a8hOVt2pbmuHLnw',
        },
        {
          url: '/_next/static/chunks/pages/_error-75f8d7cb7042c79d.js',
          revision: 'DJRfv6a8hOVt2pbmuHLnw',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-5d740d58077e5af8.js',
          revision: 'DJRfv6a8hOVt2pbmuHLnw',
        },
        { url: '/_next/static/css/2400de1b19f1adcc.css', revision: '2400de1b19f1adcc' },
        {
          url: '/_next/static/media/26a46d62cd723877-s.woff2',
          revision: 'befd9c0fdfa3d8a645d5f95717ed6420',
        },
        {
          url: '/_next/static/media/55c55f0601d81cf3-s.woff2',
          revision: '43828e14271c77b87e3ed582dbff9f74',
        },
        {
          url: '/_next/static/media/581909926a08bbc8-s.woff2',
          revision: 'f0b86e7c24f455280b8df606b89af891',
        },
        {
          url: '/_next/static/media/8e9860b6e62d6359-s.woff2',
          revision: '01ba6c2a184b8cba08b0d57167664d75',
        },
        {
          url: '/_next/static/media/97e0cb1ae144a2a9-s.woff2',
          revision: 'e360c61c5bd8d90639fd4503c829c2dc',
        },
        {
          url: '/_next/static/media/df0a9ae256c0569c-s.woff2',
          revision: 'd54db44de5ccb18886ece2fda72bdfe0',
        },
        {
          url: '/_next/static/media/e4af272ccee01ff0-s.p.woff2',
          revision: '65850a373e258f1c897a2b3d75eb74de',
        },
        { url: '/_offline', revision: 'DJRfv6a8hOVt2pbmuHLnw' },
        { url: '/clear-cache.js', revision: 'e455e163efba870b7420b7cb2e388cc8' },
        { url: '/dog.svg', revision: '978cb4a850ead4225ff86c32a5871204' },
        { url: '/favicon.ico', revision: 'd41d8cd98f00b204e9800998ecf8427e' },
        { url: '/manifest.json', revision: '90f0b17da87dd8cef12c11592ce92171' },
        { url: '/sw-minimal.js', revision: 'a906658c6cbf45e27064f61ab32eec96' },
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
            cacheWillUpdate: async ({ request: e, response: s, event: t, state: c }) =>
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
