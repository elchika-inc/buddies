# PawMatch Crawler - 使い方ガイド

## セットアップ

### 1. 依存関係のインストール

```bash
# プロジェクトルートから
npm run crawler:install

# または、crawlerディレクトリで
cd packages/crawler
npm install
```

### 2. Playwrightブラウザのインストール

```bash
cd packages/crawler
npx playwright install
```

## 基本的な使い方

### ペットのおうちから犬情報を取得

```bash
# プロジェクトルートから
npm run crawler:crawl

# または、crawlerディレクトリで
cd packages/crawler
npm run crawl:pets
```

### カスタムオプションでクロール

```bash
cd packages/crawler

# 5ページまで、3秒間隔で、PawMatch形式に変換
npx tsx src/scripts/crawl-all.ts pet-home \
  --max-pages 5 \
  --delay 3000 \
  --transform \
  --output ./my-data
```

### 全サイトをクロール

```bash
# プロジェクトルートから
npm run crawler:all

# または
cd packages/crawler
npx tsx src/scripts/crawl-all.ts all --transform
```

## 出力ファイル

### 生データ
- `data/pet-home-dogs_YYYY-MM-DD_HH-mm-ss.json`

### 変換後データ（--transformオプション使用時）
- `data/pawmatch-dogs_YYYY-MM-DD_HH-mm-ss.json`

## トラブルシューティング

### ブラウザエラー

```bash
# Playwrightブラウザを再インストール
cd packages/crawler
npx playwright install chromium
```

### メモリエラー

```bash
# Node.jsのメモリ制限を増やす
export NODE_OPTIONS="--max-old-space-size=4096"
npm run crawler:crawl
```

### アクセス拒否

```bash
# 遅延時間を増やす
npx tsx src/scripts/crawl-all.ts pet-home --delay 5000
```

## 開発者向け

### デバッグモード

```bash
npx tsx src/scripts/crawl-all.ts pet-home --debug
```

### プログラムから使用

```typescript
import { PetHomeCrawler, DogTransformer } from '@pawmatch/crawler';

const crawler = new PetHomeCrawler({
  maxPages: 3,
  delayMs: 2000,
});

const result = await crawler.crawlDogs();
const dogs = DogTransformer.transformMany(result.data);
```