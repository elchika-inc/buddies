# 対応サイト一覧

## 実装済みサイト

### 1. pet-home (ペットホーム)
- **URL**: https://www.pet-home.jp/
- **実装ファイル**: `src/crawlers/PetHomeCrawler.ts`
- **特徴**:
  - HTMLスクレイピング
  - pn番号による管理
  - 東京都のペット情報を取得
- **差分検知**: pn番号の最大値を記録

### 2. anifare (アニファレ) 
- **URL**: https://www.anifare.jp/
- **実装ファイル**: `src/crawlers/AnifareCrawler.ts`
- **特徴**:
  - JSON API対応
  - タイムスタンプベースの差分取得
  - より構造化されたデータ
- **差分検知**: 最終更新時刻を記録
- **ステータス**: テスト実装（実際のAPIエンドポイントは要確認）

### 3. hugooo (ハグー)
- **URL**: https://hugoo.jp/
- **実装ファイル**: `src/crawlers/HugoooCrawler.ts`
- **特徴**:
  - HTMLスクレイピング
  - JSON-LD構造データも活用
  - ページネーション対応
- **差分検知**: ペット番号の最大値を記録
- **ステータス**: テスト実装（HTML構造は要確認）

## サイト追加方法

### 1. 新しいクローラークラスを作成

`src/crawlers/NewSiteCrawler.ts`を作成:

```typescript
import { BaseCrawler } from './BaseCrawler';

export class NewSiteCrawler extends BaseCrawler {
  readonly sourceId = 'new-site';
  readonly sourceName = '新サイト名';
  
  async fetchPets(
    petType: 'dog' | 'cat',
    limit: number,
    lastCheckpoint?: CrawlCheckpoint
  ): Promise<Pet[]> {
    // サイト固有の実装
  }
}
```

### 2. CrawlerFactoryに登録

`src/CrawlerFactory.ts`を編集:

```typescript
import { NewSiteCrawler } from './crawlers/NewSiteCrawler';

// getAvailableSources()に追加
return ['pet-home', 'anifare', 'hugooo', 'new-site'];

// createCrawler()に追加
case 'new-site':
  return new NewSiteCrawler(env);
```

### 3. テスト実行

```bash
# 新しいサイトのクロールをテスト
curl -X POST "http://localhost:PORT/crawl/new-site/cat?limit=5"
```

## 各サイトのAPIエンドポイント

### pet-home
```
POST /crawl/pet-home/:type?limit=10&differential=true
GET /crawl/status/pet-home/:type
```

### anifare
```
POST /crawl/anifare/:type?limit=10&differential=true
GET /crawl/status/anifare/:type
```

### hugooo
```
POST /crawl/hugooo/:type?limit=10&differential=true
GET /crawl/status/hugooo/:type
```

## 実装ガイドライン

### 必須実装メソッド

1. **fetchPets()**: ペット情報を取得
   - HTMLスクレイピングまたはAPI呼び出し
   - 差分検知ロジック
   - エラーハンドリング

2. **parseXXX()**: データ変換メソッド
   - サイト固有のデータ形式をPet型に変換
   - 欠損データのデフォルト値設定

3. **updateCheckpoint()** (オプション): チェックポイント更新
   - サイト固有の差分検知情報を保存
   - デフォルトはBaseCrawlerの実装を使用

### データマッピング

| Pet型フィールド | 説明 | デフォルト値 |
|--------------|------|-----------|
| id | サイト内のユニークID | 必須 |
| type | 'dog' または 'cat' | 必須 |
| name | ペットの名前 | '名前なし' |
| breed | 品種 | '雑種' |
| age | 年齢（年） | 1 |
| gender | 性別 | '不明' |
| prefecture | 都道府県 | '東京都' |
| city | 市区町村 | '' |
| location | 地域（都道府県+市区町村） | prefecture + city |
| description | 説明文 | '' |
| personality | 性格（配列） | ['人懐っこい'] |
| medicalInfo | 医療情報 | 'ワクチン接種済み' |
| careRequirements | 飼育要件（配列） | ['愛情たっぷり'] |
| imageUrl | 画像URL | '' |
| shelterName | 保護団体名 | サイト名 + '保護団体' |
| shelterContact | 連絡先 | サイトのデフォルト連絡先 |
| sourceUrl | 元ページURL | 必須 |

## トラブルシューティング

### よくある問題

1. **CORS エラー**
   - サーバーサイドでのみ実行（Cloudflare Workers）
   - User-Agentヘッダーを適切に設定

2. **レート制限**
   - リクエスト間隔を調整
   - 差分モードを活用

3. **HTML構造の変更**
   - 定期的にセレクターを確認
   - 複数のパース方法を実装

4. **文字化け**
   - レスポンスのエンコーディングを確認
   - 適切な文字コード変換を実装