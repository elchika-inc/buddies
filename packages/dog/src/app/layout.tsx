import type { Metadata } from 'next'
import '../index.css'

export const metadata: Metadata = {
  title: 'Dog Match - 保護犬マッチングアプリ',
  description: '保護犬とあなたの運命の出会いを見つけよう',
  manifest: '/manifest.json',
  themeColor: '#F97316',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PawMatch Dog',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}