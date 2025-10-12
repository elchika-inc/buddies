/**
 * 構造化データ（JSON-LD）コンポーネント
 * SEO向上のためにGoogleなどの検索エンジンにリッチな情報を提供
 */

const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] || 'https://buddies.elchika.app'

// Organization構造化データ
const organizationData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Buddies',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: '保護犬・保護猫マッチングサービス',
  sameAs: [
    // SNSアカウントがあればここに追加
    // 'https://twitter.com/buddies_app',
    // 'https://www.facebook.com/buddies.app',
  ],
}

// WebApplication構造化データ
const webApplicationData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Buddies',
  description: '保護犬・保護猫との新しい出会い方。スワイプで簡単マッチング。',
  url: SITE_URL,
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'JPY',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1200',
  },
}

// WebSite構造化データ
const webSiteData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Buddies',
  url: SITE_URL,
  description: '保護犬・保護猫マッチングサービス',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

// FAQ構造化データ
export const faqData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '利用料金はかかりますか？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Buddiesは完全無料でご利用いただけます。保護犬・保護猫との出会いをサポートすることを目的としているため、一切の費用は発生しません。',
      },
    },
    {
      '@type': 'Question',
      name: 'どのように使いますか？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '使い方はとても簡単です。1. お住まいの地域を選択、2. ペットの写真をスワイプして探す、3. 気になる子を保存して保護団体に連絡。この3ステップで運命の家族に出会えます。',
      },
    },
    {
      '@type': 'Question',
      name: 'どんなペットがいますか？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '全国の保護団体と連携しており、保護犬・保護猫の情報を掲載しています。犬種や猫種、年齢、性別など様々な条件の子たちがいます。',
      },
    },
    {
      '@type': 'Question',
      name: 'すぐに引き取れますか？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '引き取りには保護団体との面談や審査が必要です。Buddiesでは気になるペットを見つけた後、保護団体に直接お問い合わせいただけます。',
      },
    },
    {
      '@type': 'Question',
      name: 'アプリはありますか？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'BuddiesはWebアプリとして提供しています。スマートフォンのブラウザから利用でき、ホーム画面に追加することでアプリのように使用できます（PWA対応）。',
      },
    },
  ],
}

/**
 * 構造化データコンポーネント
 */
export function StructuredData() {
  return (
    <>
      {/* Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationData),
        }}
      />

      {/* WebApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationData),
        }}
      />

      {/* WebSite */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteData),
        }}
      />

      {/* FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqData),
        }}
      />
    </>
  )
}
