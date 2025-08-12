import type { Metadata } from 'next'
import '../index.css'

export const metadata: Metadata = {
  title: 'Cat Match - 保護猫マッチングアプリ',
  description: '保護猫とあなたの運命の出会いを見つけよう',
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