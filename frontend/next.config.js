import withPWA from 'next-pwa'

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

// PWA設定：Cloudflare Pages環境では完全に無効化
// Next.js 15との互換性のため、CF_PAGES環境ではPWAを使用しない
const shouldEnablePWA = 
  process.env.NODE_ENV === 'production' && 
  process.env.DISABLE_PWA !== 'true' && 
  !process.env.CF_PAGES // Cloudflare Pages環境では無効化

const pwaConfig = shouldEnablePWA
  ? withPWA({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: false,
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
  : (config) => config

export default pwaConfig(nextConfig)
