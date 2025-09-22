const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Service Workerを最小限に
  sw: 'sw.js',
  // プリキャッシュを無効化
  cacheOnFrontEndNav: false,
  // フォールバックページのみ設定（オフライン時に表示）
  fallbacks: {
    document: '/_offline',
  },
  // ランタイムキャッシュを完全に無効化
  runtimeCaching: [],
  // Workboxオプション
  buildExcludes: [/.*\.map$/, /.*\.LICENSE\.txt$/],
  // キャッシュを使用しない
  cacheId: 'pawmatch-minimal',
  cleanupOutdatedCaches: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.CF_PAGES ? 'export' : undefined,
  distDir: 'dist',
  images: {
    unoptimized: process.env.CF_PAGES ? true : false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'www.pet-home.jp',
      },
      {
        protocol: 'https',
        hostname: 'image.pet-home.jp',
        pathname: '/user_file/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8787',
        pathname: '/images/**',
      },
    ],
  },
}

// PWA設定：本番環境で有効化（Cloudflare Pages環境でも動作）
module.exports =
  process.env.NODE_ENV === 'production' && process.env.DISABLE_PWA !== 'true'
    ? withPWA(nextConfig)
    : nextConfig