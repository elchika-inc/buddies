# PawMatch D1データベース設定ガイド

このガイドでは、PawMatchアプリケーション用のCloudflare D1データベースのセットアップ方法を説明します。

## 📋 前提条件

- [Cloudflare アカウント](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) がインストール済み
- Node.js 18+ がインストール済み

## 🚀 セットアップ手順

### 1. Wranglerの認証

```bash
wrangler auth login
```

ブラウザが開きますので、Cloudflareアカウントでログインしてください。

### 2. 自動セットアップスクリプトの実行

```bash
./scripts/setup-d1.sh
```

このスクリプトは以下を自動で行います：
- D1データベース `pawmatch-db` の作成
- `wrangler.toml` の設定更新
- データベーススキーマの適用
- package.jsonへのD1コマンド追加

### 3. 手動セットアップ（自動スクリプトが使えない場合）

#### 3.1 D1データベースの作成

```bash
wrangler d1 create pawmatch-db
```

出力されたdatabase_idをコピーしてください。

#### 3.2 wrangler.tomlの更新

`wrangler.toml` ファイルの `database_id` を実際のIDに置き換えてください：

```toml
[[d1_databases]]
binding = "DB"
database_name = "pawmatch-db"
database_id = "your-actual-database-id-here"
```

#### 3.3 データベーススキーマの適用

```bash
# ローカル開発環境
wrangler d1 execute pawmatch-db --local --file=migrations/001_initial_pets_schema.sql

# 本番環境
wrangler d1 execute pawmatch-db --file=migrations/001_initial_pets_schema.sql
```

## 📊 利用可能なコマンド

セットアップ完了後、以下のコマンドが利用できます：

### データベース操作

```bash
# ローカルデータベースでクエリ実行
npm run d1:local "SELECT * FROM animals LIMIT 5"

# 本番データベースでクエリ実行
npm run d1:remote "SELECT * FROM animals LIMIT 5"  

# データベース情報表示
npm run d1:studio

# バックアップ作成
npm run d1:backup
```

### マイグレーション

```bash
# ローカル環境でマイグレーション実行
npm run migrate:local

# 本番環境でマイグレーション実行  
npm run migrate:remote
```

### クローラー実行

```bash
# 全ての動物データを取得してD1に保存
npm run crawl

# 犬のデータのみ取得
npm run crawl:dogs

# 猫のデータのみ取得
npm run crawl:cats

# クローラーの状態確認
npm run crawl:status
```

## 🗄️ データベース構造

### 主要テーブル

- **animals**: 動物の基本情報
- **animal_images**: 動物の画像
- **animal_personalities**: 動物の性格・特徴
- **dog_info**: 犬専用の詳細情報
- **cat_info**: 猫専用の詳細情報
- **crawler_logs**: クローラー実行ログ

### サンプルクエリ

```sql
-- 全ての動物を取得
SELECT * FROM animals WHERE is_active = true ORDER BY created_at DESC;

-- 犬の詳細情報を取得
SELECT 
  a.*, 
  d.exercise_needs, 
  d.good_with_children
FROM animals a 
LEFT JOIN dog_info d ON a.id = d.animal_id 
WHERE a.species = 'dog';

-- クローラー実行履歴を確認
SELECT * FROM crawler_logs ORDER BY completed_at DESC LIMIT 10;
```

## 🔧 開発環境での使用

### ローカル開発

```bash
# ローカルD1データベースでクローラーを実行
wrangler dev --local

# または、ファイルシステムベースのストレージを使用
npm run crawl
```

### 本番環境への展開

```bash
# Workers のデプロイ
wrangler deploy

# スケジュール設定（例：6時間ごと）
wrangler deploy --with-scheduled
```

## 📈 モニタリング

### データベース状態の確認

```bash
# 保存されている動物の数を確認
npm run d1:local "SELECT species, COUNT(*) as count FROM animals GROUP BY species"

# 最新のクローラー実行状況
npm run d1:local "SELECT * FROM crawler_logs ORDER BY completed_at DESC LIMIT 5"
```

### ログの確認

```bash
# Workers のログを確認
wrangler tail

# D1 の使用状況確認
wrangler d1 info pawmatch-db
```

## 🔍 トラブルシューティング

### よくある問題

1. **"Database not found" エラー**
   - `wrangler.toml` の database_id が正しいか確認
   - データベースが正しく作成されているか確認: `wrangler d1 list`

2. **"Table doesn't exist" エラー**
   - マイグレーションが実行されているか確認
   - `npm run migrate:local` または `npm run migrate:remote` を実行

3. **クローラーがデータを保存できない**
   - D1データベースの接続を確認
   - ローカル環境ではファイルシステムが使用されることを確認

### デバッグ方法

```bash
# ローカルD1データベースの内容を確認
wrangler d1 execute pawmatch-db --local --command "SELECT COUNT(*) FROM animals"

# Workers のリアルタイムログ
wrangler tail --format pretty
```

## 📝 追加情報

- [Cloudflare D1 公式ドキュメント](https://developers.cloudflare.com/d1/)
- [Wrangler CLI リファレンス](https://developers.cloudflare.com/workers/wrangler/)
- [D1 制限事項](https://developers.cloudflare.com/d1/platform/limits/)

## 🆘 サポート

問題が発生した場合は、以下を確認してください：

1. Wrangler のバージョン: `wrangler --version`
2. データベースの存在: `wrangler d1 list`
3. テーブルの存在: `npm run d1:local ".tables"`
4. 最新のクローラーログ: `npm run crawl:status`