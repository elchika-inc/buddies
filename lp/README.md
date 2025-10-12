# Buddies LP (Landing Page)

保護犬・保護猫マッチングアプリ「Buddies」のランディングページです。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router) - 静的エクスポートモード
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **アニメーション**: Framer Motion
- **デプロイ**: Cloudflare Pages

## 開発

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# スクリーンショット取得
npm run screenshots

# ビルド
npm run build

# デプロイ
npm run deploy
```

## スクリーンショット取得

本番環境からPlaywrightでスマホサイズのスクリーンショットを取得します。

```bash
npm run screenshots
```

取得されるスクリーンショット:

- `public/screenshots/dog/` - 保護犬アプリの画面
- `public/screenshots/cat/` - 保護猫アプリの画面

各ディレクトリに以下の画像が保存されます:

- `hero.png` - ヒーロー画面
- `swipe.png` - スワイプ画面
- `detail.png` - 詳細モーダル
- `favorites.png` - お気に入り画面
- `location.png` - 地域選択モーダル

## SEO対策

完璧なSEO対策を実装しています:

### メタデータ

- ✅ title, description, keywords
- ✅ Open Graph（Facebook、LinkedIn等）
- ✅ Twitter Card
- ✅ canonical URL

### 構造化データ（JSON-LD）

- ✅ Organization
- ✅ WebApplication
- ✅ WebSite
- ✅ FAQPage

### その他

- ✅ sitemap.xml
- ✅ robots.txt
- ✅ セマンティックHTML
- ✅ 画像のalt属性
- ✅ アクセシビリティ（WCAG AA）

## ビルド出力

Next.jsの静的エクスポート機能により、完全な静的HTML生成:

```
out/
├── index.html           # 完全なHTMLコンテンツ（JavaScriptなしでも表示可能）
├── sitemap.xml
├── robots.txt
├── og-image.png
├── _next/
│   └── static/
└── screenshots/
```

## Cloudflare Pagesデプロイ

```bash
npm run deploy
```

または手動:

```bash
npm run build
npx wrangler pages deploy out --project-name=buddies-lp
```

## 環境変数

`.env.example` を `.env` としてコピーして設定:

```env
NEXT_PUBLIC_SITE_URL=https://buddies.elchika.app
NEXT_PUBLIC_APP_URL_DOG=https://buddies-dogs.elchika.app
NEXT_PUBLIC_APP_URL_CAT=https://buddies-cats.elchika.app
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
```

## ディレクトリ構成

```
lp/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # SEO最適化されたレイアウト
│   │   └── page.tsx          # メインページ
│   ├── components/
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── ScreenshotsSection.tsx
│   │   ├── FAQSection.tsx
│   │   ├── CTASection.tsx
│   │   ├── Footer.tsx
│   │   └── StructuredData.tsx
│   └── styles/
│       └── globals.css
├── public/
│   ├── screenshots/
│   ├── sitemap.xml
│   ├── robots.txt
│   └── manifest.json
└── scripts/
    └── take-screenshots.js    # Playwrightスクリーンショット取得
```

## ライセンス

ISC
