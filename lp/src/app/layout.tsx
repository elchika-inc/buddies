import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { env } from '@/config/env'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const SITE_URL = env.SITE_URL

// SEO最適化されたメタデータ
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Buddies - 保護犬・保護猫との運命の出会い | スワイプでマッチング',
    template: '%s | Buddies',
  },
  description:
    '保護犬・保護猫との新しい出会い方。スワイプで簡単マッチング。全国の保護団体と連携し、あなたにぴったりの家族を見つけます。完全無料でご利用いただけます。',
  keywords: [
    '保護犬',
    '保護猫',
    '里親',
    'マッチング',
    'ペット',
    '譲渡',
    '動物愛護',
    'スワイプ',
    '犬',
    '猫',
    '保護団体',
    'アプリ',
  ],
  authors: [{ name: 'Buddies', url: SITE_URL }],
  creator: 'Buddies',
  publisher: 'Buddies',

  // Open Graph（Facebook、LinkedIn等）
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: SITE_URL,
    siteName: 'Buddies',
    title: 'Buddies - 保護犬・保護猫との運命の出会い',
    description: '保護犬・保護猫との新しい出会い方。スワイプで簡単マッチング。全国の保護団体と連携し、あなたにぴったりの家族を見つけます。',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Buddies - 保護犬・保護猫マッチングアプリ',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Buddies - 保護犬・保護猫との運命の出会い',
    description: '保護犬・保護猫との新しい出会い方。スワイプで簡単マッチング。',
    images: ['/og-image.png'],
    creator: '@buddies_app',
  },

  // robots設定
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Google Search Console検証（環境変数から取得）
  verification: {
    google: env.GOOGLE_SITE_VERIFICATION,
  },

  // その他のメタデータ
  alternates: {
    canonical: SITE_URL,
  },
  category: 'pets',
  classification: 'Pet Adoption Service',
}

// ビューポート設定
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F97316' },
    { media: '(prefers-color-scheme: dark)', color: '#EA580C' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={inter.variable}>
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Manifest（PWA対応） */}
        <link rel="manifest" href="/manifest.json" />

        {/* Preconnect（パフォーマンス最適化） */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
