import type { Metadata, Viewport } from 'next'
import '../index.css'
import { getPetType, petConfig } from '@/config/petConfig'

const petType = getPetType()
const config = petConfig[petType]

export const metadata: Metadata = {
  title: `${config.title} - ${config.description}`,
  description: config.description,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: config.title,
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
  themeColor: config.primaryColorHex,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}