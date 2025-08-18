# PawMatch Crawler

Playwright を使用したペット情報クローラー。ペットのおうち（www.pet-home.jp）から犬・猫の里親情報を取得します。

## 特徴

- **Playwright使用**: 動的コンテンツに対応したヘッドレスブラウザクローラー
- **型安全**: TypeScript による完全な型定義
- **モノレポ対応**: 既存のPawMatchプロジェクトと統合
- **データ正規化**: 取得したデータの自動クレンジング・正規化
- **エラーハンドリング**: 堅牢なエラー処理とリトライ機能
- **レート制限**: サーバー負荷を考慮した適切な間隔制御
- **倫理的配慮**: robots.txt遵守と適切なUser-Agent設定

## インストール

```bash
cd apps/crawler
npm install
```

## 使用方法

### 基本コマンド

```bash
# 猫のデータをクロール
npm run crawl:cats

# 犬のデータをクロール  
npm run crawl:dogs

# 開発モードでクローラーを実行
npm run dev crawl cat
npm run dev crawl dog

# テストモード（1ページのみ）
npm run dev test cat
npm run dev test dog
```

### ビルドと実行

```bash
# TypeScriptをビルド
npm run build

# ビルド済みファイルを実行
npm start

# テスト実行
npm test
```

## 設定

### 環境変数

以下の環境変数で動作をカスタマイズできます：

```bash
CRAWLER_BASE_URL=https://www.pet-home.jp      # ベースURL
CRAWLER_MAX_PAGES=5                           # 最大ページ数
CRAWLER_REQUEST_DELAY=2500                    # リクエスト間隔(ms)
CRAWLER_MAX_RETRIES=3                         # 最大リトライ回数
CRAWLER_TIMEOUT=30000                         # タイムアウト(ms)
CRAWLER_USER_AGENT=PawMatchBot/1.0            # User-Agent
CRAWLER_OUTPUT_DIR=./output                   # 出力ディレクトリ
```

### デフォルト設定

- **リクエスト間隔**: 2.5秒（サーバー負荷軽減）
- **最大ページ数**: 5ページ
- **タイムアウト**: 30秒
- **リトライ回数**: 3回

## 出力データ

### ファイル形式

クローリング結果は以下の形式で保存されます：

```
output/
├── cat-data-2024-01-15T10-30-00.json      # 猫データ
├── dog-data-2024-01-15T10-30-00.json      # 犬データ
└── crawler-summary-2024-01-15T10-30-00.json # 実行サマリー
```

### データ構造

#### 猫データ例

```json
{
  "metadata": {
    "type": "cat",
    "crawledAt": "2024-01-15T10:30:00.000Z",
    "totalItems": 150,
    "source": "https://www.pet-home.jp"
  },
  "data": [
    {
      "id": "12345",
      "name": "みかん",
      "breed": "雑種",
      "age": 2,
      "gender": "女の子",
      "coatLength": "短毛",
      "color": "茶白",
      "prefecture": "東京都",
      "city": "新宿区",
      "description": "人懐っこい甘えん坊の猫です...",
      "personality": ["人懐っこい", "甘えん坊"],
      "imageUrl": "https://www.pet-home.jp/images/cat123.jpg",
      "isNeutered": true,
      "isVaccinated": true,
      "socialLevel": "人懐っこい",
      "indoorOutdoor": "完全室内",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "sourceUrl": "https://www.pet-home.jp/cats/tokyo/12345/"
    }
  ]
}
```

## アーキテクチャ

### クラス構成

- **BaseCrawler**: 基底クラス（共通ロジック）
- **PetHomeCrawler**: ペットのおうち専用実装
- **BrowserManager**: Playwright ブラウザ管理
- **DataCleaner**: データ正規化・クレンジング
- **ConfigBuilder**: 設定管理

### データフロー

1. **リストページ巡回**: 一覧ページから個別URLを収集
2. **詳細ページ取得**: 各ペットの詳細情報を抽出
3. **データ正規化**: 取得データのクレンジング・正規化
4. **ファイル出力**: JSONファイルとして保存

## 開発

### ディレクトリ構造

```
src/
├── types/              # 型定義
├── utils/              # ユーティリティ
│   ├── browser-manager.ts
│   └── data-cleaner.ts
├── crawlers/           # クローラー実装
│   ├── base-crawler.ts
│   ├── pet-home-crawler.ts
│   ├── pet-home-cats.ts
│   └── pet-home-dogs.ts
├── config/             # 設定
└── index.ts            # エントリーポイント
```

### テスト

```bash
# すべてのテストを実行
npm test

# カバレッジ付きで実行
npm test -- --coverage

# 特定のテストファイル
npm test data-cleaner.test.ts
```

### 新しいサイトへの対応

1. `BaseCrawler`を継承した新しいクラスを作成
2. `getListPageUrl()`、`extractItemUrls()`、`extractPetData()` を実装
3. 必要に応じて`DataCleaner`にサイト固有のロジックを追加

## 法的・倫理的配慮

### 遵守事項

- **robots.txt**: サイトのクローリング制限を確認
- **利用規約**: 各サイトの利用規約に従う
- **レート制限**: 適切な間隔でアクセス（2.5秒間隔）
- **User-Agent**: 適切なボット識別子を使用

### データ取扱い

- **個人情報**: 連絡先等の個人情報を適切に処理
- **著作権**: 画像等の著作権に配慮
- **データ更新**: 古いデータの定期削除

## トラブルシューティング

### よくある問題

1. **ブラウザ起動失敗**
   ```bash
   # Playwrightブラウザをインストール
   npx playwright install
   ```

2. **メモリ不足**
   - `maxPages`を減らす
   - `requestDelay`を増やす

3. **タイムアウトエラー**
   - `timeout`値を増やす
   - ネットワーク環境を確認

4. **データ取得失敗**
   - サイト構造の変更を確認
   - セレクタを更新

### ログの確認

```bash
# 詳細ログで実行
DEBUG=* npm run dev crawl cat

# エラーログのみ
npm run dev crawl cat 2>error.log
```

## ライセンス

MIT License - PawMatchプロジェクトと同じライセンス