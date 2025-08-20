# PawMatch Crawler

Cloudflare Workers で動作するマルチサイト対応ペット情報クローラーサービスです。

## 機能

- **マルチサイト対応**: 複数のペット情報サイトからデータを収集
  - 現在対応: pet-home
  - 今後対応予定: anifare, hugooo など
- **抽象化された差分検知**: サイトごとに最適化された差分検知ロジック
- **定期実行**: Cron で6時間ごとに全サイトを自動クロール
- **手動実行**: サイトごとにAPIエンドポイントから実行可能
- **統一ID管理**: `sourceId_petId` 形式でサイト間の重複を防止
- **データ保存**: D1データベースに統一形式で保存
- **画像保存**: R2バケットに画像を保存

## エンドポイント

### ヘルスチェック
```
GET /
```

### 手動クロール実行
```
POST /crawl/:source/:type?limit=10&differential=true
```
- `source`: クロールソース（`pet-home` など、デフォルト: `pet-home`）
- `type`: `dog` または `cat`（デフォルト: `cat`）
- `limit`: 取得件数（1-100、デフォルト: 10）
- `differential`: 差分モードの有効/無効（デフォルト: `true`）

### クロール状態確認
```
GET /crawl/status/:source?/:type?
```
- `source`: クロールソース（省略可）
- `type`: `dog` または `cat`（省略可）
- 利用可能なソース一覧と各ソースのクロール状態を返す

### ペット一覧取得
```
GET /pets/:type?limit=20&offset=0
```
- `type`: `dog` または `cat`（省略可）
- `limit`: 取得件数（デフォルト: 20）
- `offset`: オフセット（デフォルト: 0）

## デプロイ

### 1. D1データベースの作成
```bash
cd crawler
wrangler d1 create pawmatch-db
```

作成後、出力されたデータベースIDを `wrangler.toml` の `database_id` に設定してください。

### 2. スキーマの適用
```bash
wrangler d1 execute pawmatch-db --local --file=schema.sql
wrangler d1 execute pawmatch-db --remote --file=schema.sql
```

### 3. R2バケットの作成
```bash
wrangler r2 bucket create pawmatch-images
```

### 4. デプロイ
```bash
npm run deploy
```

## 開発

### ローカル開発
```bash
npm run dev
```

### テスト実行
```bash
# pet-homeから猫情報をクロール（10件、差分モード）
curl -X POST http://localhost:8787/crawl/pet-home/cat?limit=10

# pet-homeから犬情報をクロール（5件、全件取得モード）
curl -X POST http://localhost:8787/crawl/pet-home/dog?limit=5&differential=false

# 全ソースのクロール状態確認
curl http://localhost:8787/crawl/status

# pet-homeの猫クロール状態確認
curl http://localhost:8787/crawl/status/pet-home/cat

# ペット一覧取得
curl http://localhost:8787/pets/cat?limit=10
```

## Cron設定

`wrangler.toml` で設定されています：
```toml
[triggers]
crons = ["0 */6 * * *"]  # 6時間ごとに実行
```

## 環境変数

- `ALLOWED_ORIGIN`: CORS許可オリジン
- `PET_HOME_BASE_URL`: ペットホームのベースURL

## アーキテクチャ

### クラス構成

```
ICrawler (インターフェース)
    ↑
BaseCrawler (基底クラス)
    ↑
PetHomeCrawler (サイト固有実装)
AnifareCrawler (今後追加)
HugoooCrawler (今後追加)
```

### データベース設計

- **pets**: ペット情報（ID形式: `sourceId_petId`）
- **crawler_states**: サイト別・ペットタイプ別のクロール状態
- **crawl_logs**: クロール実行ログ

## 注意事項

- クロール時は対象サイトの負荷を考慮し、適切な間隔を設けています
- 定期実行では差分モードで新規ペットのみを取得し、サーバー負荷を最小限に抑えています
- サイトごとに異なる差分検知ロジックを実装可能
- 初回実行時はチェックポイントがないため、全件取得モードで動作します

## トラブルシューティング

### データベースエラー
D1データベースが正しく設定されていない場合は、以下を確認してください：
1. データベースIDが正しく設定されているか
2. スキーマが適用されているか

### 画像保存エラー
R2バケットが正しく設定されていない場合は、以下を確認してください：
1. バケット名が正しいか
2. バケットが作成されているか