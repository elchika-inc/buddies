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

// PWA機能は一時的に無効化（Cloudflare Pagesでは不要）
export default nextConfig