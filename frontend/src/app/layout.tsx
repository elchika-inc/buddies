import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '@/index.css'
import InstallPWA from '@/components/InstallPWA'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Buddies',
  description: '保護犬・保護猫の里親マッチングアプリ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Buddies',
  },
}

export const viewport: Viewport = {
  themeColor: '#F97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
        <InstallPWA />
      </body>
    </html>
  )
}
