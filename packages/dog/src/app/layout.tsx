import type { Metadata, Viewport } from 'next'
import '../index.css'

export const metadata: Metadata = {
  title: 'Dog Match - 保護犬マッチングアプリ',
  description: '保護犬とあなたの運命の出会いを見つけよう',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PawMatch Dog',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F97316',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
