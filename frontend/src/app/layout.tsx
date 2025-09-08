import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '@/index.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PawMatch',
  description: '保護犬・保護猫の里親マッチングアプリ',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
