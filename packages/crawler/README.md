# PawMatch Crawler

PawMatchアプリケーション用のデータクローラーです。ペット里親募集サイトから犬・猫の情報を収集し、アプリで使用可能な形式に変換します。

## 特徴

- **複数サイト対応**: ペットのおうちなど、主要な里親募集サイトに対応
- **データ変換**: 収集したデータをPawMatchアプリの形式に自動変換
- **レート制限対応**: 適切な間隔でアクセスしてサーバーに負荷をかけません
- **エラーハンドリング**: 堅牢なエラー処理とログ出力
- **TypeScript**: 型安全なコードベース

## インストール

```bash
cd packages/crawler
npm install
```

## 使用方法

### 基本的な使用法

```bash
# ペットのおうちから犬の情報を収集
npm run crawl:dogs

# ペットのおうちから猫の情報を収集
npm run crawl:cats

# 犬と猫の両方を収集
npm run crawl:all
```

### コマンドラインオプション

```bash
# 犬の情報をカスタムオプションでクロール
npx tsx src/scripts/crawl-all.ts pet-home \
  --animal-type dogs \
  --output ./my-data \
  --max-pages 5 \
  --delay 3000 \
  --transform \
  --debug

# 猫の情報をクロール
npx tsx src/scripts/crawl-all.ts pet-home \
  --animal-type cats \
  --output ./my-data \
  --max-pages 5 \
  --transform

# 全サイト・全動物をクロール
npx tsx src/scripts/crawl-all.ts all \
  --output ./output \
  --max-pages 3 \
  --transform
```

### オプション説明

- `--output, -o`: 出力ディレクトリ（デフォルト: `./data`）
- `--max-pages, -p`: 最大ページ数（デフォルト: 10）
- `--delay, -d`: リクエスト間の遅延（ミリ秒、デフォルト: 2000）
- `--animal-type, -a`: 動物の種類（dogs または cats、デフォルト: dogs）
- `--transform, -t`: PawMatch形式に変換する
- `--debug`: デバッグログを有効にする

## プログラム内での使用

```typescript
import { PetHomeCrawler, DogTransformer, CatTransformer } from '@pawmatch/crawler';

// クローラーの初期化
const crawler = new PetHomeCrawler({
  maxPages: 5,
  delayMs: 2000,
  outputDir: './data',
});

// 犬のデータ収集
const dogResult = await crawler.crawlDogs();

if (dogResult.success && dogResult.outputFile) {
  // 生データを読み込み
  const rawData = await fs.readJson(dogResult.outputFile);
  
  // PawMatch形式に変換
  const dogs = DogTransformer.transformMany(rawData);
  
  console.log(`${dogs.length}匹の犬のデータを変換しました`);
}

// 猫のデータ収集
const catResult = await crawler.crawlCats();

if (catResult.success && catResult.outputFile) {
  // 生データを読み込み
  const rawData = await fs.readJson(catResult.outputFile);
  
  // PawMatch形式に変換
  const cats = CatTransformer.transformMany(rawData);
  
  console.log(`${cats.length}匹の猫のデータを変換しました`);
}
```

## 出力データ形式

### 生データ（RawPetData）

```typescript
{
  name: "犬の名前",
  species: "dog",
  breed: "犬種",
  age: "年齢文字列",
  gender: "male" | "female",
  size: "サイズ",
  description: "詳細説明",
  imageUrls: ["画像URL配列"],
  location: "地域",
  rescueOrganization: "保護団体名",
  contact: "連絡先",
  sourceUrl: "取得元URL",
  scrapedAt: "取得日時"
}
```

### 変換後データ（PawMatch Dog形式）

```typescript
{
  id: "一意のID",
  name: "犬の名前",
  breed: "犬種",
  age: 3,
  gender: "男の子" | "女の子",
  size: "小型犬" | "中型犬" | "大型犬" | "超大型犬",
  color: "毛色",
  location: "地域",
  description: "説明",
  personality: ["性格タグ"],
  medicalInfo: "医療情報",
  careRequirements: ["ケア要件"],
  imageUrl: "メイン画像URL",
  shelterName: "保護団体名",
  shelterContact: "連絡先",
  adoptionFee: 30000,
  isNeutered: true,
  isVaccinated: true,
  goodWithKids: true,
  goodWithOtherDogs: true,
  exerciseLevel: "低" | "中" | "高",
  trainingLevel: "基本済み" | "要訓練" | "高度な訓練済み",
  walkFrequency: "1日1回" | "1日2回" | "1日3回以上",
  needsYard: false,
  apartmentFriendly: true,
  createdAt: "2024-01-01"
}
```

### 変換後データ（PawMatch Cat形式）

```typescript
{
  id: "一意のID",
  name: "猫の名前",
  breed: "猫種",
  age: 3,
  gender: "男の子" | "女の子",
  coatLength: "短毛" | "長毛",
  color: "毛色",
  location: "地域",
  description: "説明",
  personality: ["性格タグ"],
  medicalInfo: "医療情報",
  careRequirements: ["ケア要件"],
  imageUrl: "メイン画像URL",
  shelterName: "保護団体名",
  shelterContact: "連絡先",
  adoptionFee: 25000,
  isNeutered: true,
  isVaccinated: true,
  isFIVFeLVTested: true,
  socialLevel: "人懐っこい" | "シャイ" | "警戒心強い" | "普通",
  indoorOutdoor: "完全室内" | "室内外自由" | "どちらでも",
  goodWithMultipleCats: true,
  groomingRequirements: "低" | "中" | "高",
  vocalizationLevel: "静か" | "普通" | "よく鳴く" | "おしゃべり",
  activityTime: "昼型" | "夜型" | "どちらでも",
  playfulness: "低" | "中" | "高",
  createdAt: "2024-01-01"
}
```

## サポートサイト

### 現在サポート中

- [ペットのおうち](https://www.pet-home.jp/) - 犬・猫の里親募集情報

### 今後の対応予定

- いつでも里親募集中
- 各自治体の動物愛護センター
- 保護団体の個別サイト

## 技術仕様

- **言語**: TypeScript
- **ブラウザ自動化**: Playwright
- **HTMLパース**: Cheerio
- **遅延制御**: カスタム実装
- **ログ**: カスタムロガー

## 開発

### ビルド

```bash
npm run build
```

### 開発モード

```bash
npm run dev
```

### テスト

```bash
npm test
```

## 注意事項

### 利用規約の遵守

- 各サイトの利用規約を必ず確認してください
- robots.txtを尊重した適切なクローリングを行います
- 過度なアクセスを避けるため、適切な遅延を設定しています

### データの取り扱い

- 個人情報の取り扱いには十分注意してください
- 収集したデータは適切に管理し、不要になったら削除してください
- 画像の著作権にも配慮してください

### パフォーマンス

- 大量のページをクロールする際は、サーバーへの負荷を考慮してください
- 必要に応じて`--delay`オプションで遅延時間を調整してください

## トラブルシューティング

### よくある問題

1. **ブラウザが起動しない**
   ```bash
   # Playwrightのブラウザをインストール
   npx playwright install
   ```

2. **メモリ不足エラー**
   ```bash
   # Node.jsのメモリ制限を増やす
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

3. **アクセス拒否エラー**
   - `--delay`オプションで遅延時間を増やしてください
   - User-Agentが古い可能性があります

### ログの確認

デバッグモードでより詳細なログを確認できます：

```bash
npx tsx src/scripts/crawl-all.ts pet-home --debug
```

## ライセンス

MIT License

## 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/new-site`)
3. 変更をコミット (`git commit -am 'Add new site support'`)
4. ブランチにプッシュ (`git push origin feature/new-site`)
5. プルリクエストを作成

## サポート

問題や質問がある場合は、GitHubのIssuesで報告してください。