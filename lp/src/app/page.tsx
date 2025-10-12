import { HeroSection } from '@/components/HeroSection'
import { FeaturesSection } from '@/components/FeaturesSection'
import { HowItWorksSection } from '@/components/HowItWorksSection'
import { ScreenshotsSection } from '@/components/ScreenshotsSection'
import { FAQSection } from '@/components/FAQSection'
import { CTASection } from '@/components/CTASection'
import { Footer } from '@/components/Footer'
import { StructuredData } from '@/components/StructuredData'

export default function HomePage() {
  return (
    <>
      {/* 構造化データ（SEO） */}
      <StructuredData />

      {/* メインコンテンツ */}
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ScreenshotsSection />
        <FAQSection />
        <CTASection />
      </main>

      {/* フッター */}
      <Footer />
    </>
  )
}
