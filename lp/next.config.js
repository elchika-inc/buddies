/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的HTMLエクスポート（SEO重視）
  output: 'export',

  // 画像最適化を無効化（静的エクスポート時は必須）
  images: {
    unoptimized: true,
  },

  // トレーリングスラッシュを追加
  trailingSlash: true,

  // ビルド出力ディレクトリ
  distDir: 'out',

  // 厳格モード
  reactStrictMode: true,

  // パワードバイヘッダーを無効化（セキュリティ）
  poweredByHeader: false,

  // 環境変数
  env: {
    NEXT_PUBLIC_SITE_URL: process.env['NEXT_PUBLIC_SITE_URL'] || 'https://buddies.elchika.app',
    NEXT_PUBLIC_APP_URL_DOG: process.env['NEXT_PUBLIC_APP_URL_DOG'] || 'https://buddies-dogs.elchika.app',
    NEXT_PUBLIC_APP_URL_CAT: process.env['NEXT_PUBLIC_APP_URL_CAT'] || 'https://buddies-cats.elchika.app',
  },
}

module.exports = nextConfig
