# PawMatch 🐾

> A modern, intuitive pet adoption platform connecting rescue animals with loving homes

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)

## 🌟 Overview

PawMatch is a Tinder-style web application designed to revolutionize pet adoption. Our platform makes finding your perfect furry companion as easy as a swipe, creating meaningful connections between rescue animals and potential adopters.

### 🎯 Key Features

- **Intuitive Swipe Interface** - Browse pets with simple left/right swipes
- **Specialized Apps** - Dedicated experiences for dog and cat adoption
- **Smart Matching** - Filter by location, size, age, and personality traits
- **Detailed Profiles** - Comprehensive information about each pet
- **Mobile-First Design** - Optimized for smartphones and tablets
- **Offline Support** - PWA capabilities for seamless browsing

## 🚀 Quick Start

### For Users

PawMatch is available in two specialized versions:

#### 🐕 DogMatch
Visit our dog adoption platform to find your perfect canine companion.

#### 🐱 CatMatch  
Explore our cat adoption platform to meet your future feline friend.

### How It Works

1. **Browse** - Swipe through pet profiles at your own pace
2. **Learn** - Tap on cards to view detailed information
3. **Filter** - Set preferences for location, size, and other attributes
4. **Save** - Mark favorites to review later
5. **Connect** - Contact shelters directly for pets you're interested in

## 📱 Features

### Pet Profiles Include
- High-quality photos
- Name, age, and breed information
- Personality traits and temperament
- Medical history and vaccination status
- Special care requirements
- Shelter contact information
- Adoption fees

### Search & Filter Options
- **Location** - Find pets near you
- **Size** - Small, medium, or large
- **Age** - Puppies/kittens to seniors
- **Personality** - Playful, calm, energetic, etc.
- **Special Needs** - Filter by care requirements

## 🌍 Supported Regions

Currently available in:
- Tokyo Metropolitan Area
- Kansai Region  
- Chubu Region
- Kyushu Region
- Tohoku Region

*More regions coming soon!*

## 💝 Why Choose PawMatch?

- **Save Lives** - Help reduce shelter overcrowding
- **Perfect Match** - Find a pet that fits your lifestyle
- **Transparent Process** - All information upfront
- **Support Shelters** - Direct connection to rescue organizations
- **Community** - Join thousands of successful adoptions

## 📞 Support

### FAQ

**Q: Is PawMatch free to use?**  
A: Yes! PawMatch is completely free for adopters.

**Q: How do I contact a shelter?**  
A: Each pet profile includes shelter contact information.

**Q: Can I save pets to view later?**  
A: Yes, use the favorite feature to save profiles.

**Q: What devices are supported?**  
A: PawMatch works on any modern web browser (mobile or desktop).

### Contact Us

- Email: support@pawmatch.jp
- Website: https://pawmatch.jp
- Twitter: @PawMatchJP

## 🛠️ Development

### Quick Setup

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd pawmatch

# 2. 依存関係をインストール
npm install

# 3. 環境変数をセットアップ
cp app/.env.example app/.env.local
cp .env.local.example .env.local

# 4. データベースを初期化
npm run api:db:init
npm run api:db:migrate

# 5. 開発サーバーを起動
npm run dev:all
```

### 環境変数設定

#### app/.env.local
```env
NEXT_PUBLIC_PET_TYPE=dog  # または cat
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
```

#### api/.dev.vars
```env
ALLOWED_ORIGIN=http://localhost:3004
USE_LOCAL_IMAGES=true
```

### 開発コマンド

```bash
# 開発サーバー
npm run dev:all      # 全サービス同時起動
npm run dev          # App のみ (port 3004)
npm run api:dev      # API のみ (port 8787)

# ビルド・検証
npm run build        # App ビルド
npm run type-check   # TypeScript 型チェック
npm run lint         # ESLint
npm run lint:fix     # ESLint 自動修正

# データベース
npm run api:db:init     # DB初期化
npm run api:db:migrate  # マイグレーション実行

# デプロイ
npm run deploy:dog   # DogMatch デプロイ
npm run deploy:cat   # CatMatch デプロイ
```

### Project Structure

```
pawmatch/
├── app/          # Next.js フロントエンド (Cloudflare Pages)
├── api/          # Cloudflare Workers API (Hono)
├── crawler/      # データクローラー (Cloudflare Workers)
├── dispatcher/   # タスクディスパッチャー (Cloudflare Workers)
├── converter/    # 画像変換サービス (Cloudflare Workers)
└── CLAUDE.md     # AI開発アシスタント用ガイド
```

### Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Backend**: Cloudflare Workers, Hono
- **Database**: Cloudflare D1
- **Storage**: Cloudflare R2
- **State**: React Hooks, localStorage

## 🤝 For Shelters

Interested in listing your rescue animals on PawMatch? Contact us at shelters@pawmatch.jp to learn about our free shelter partnership program.

## 📄 License

PawMatch is open source software licensed under the MIT license.

---

*Made with ❤️ for rescue animals everywhere*