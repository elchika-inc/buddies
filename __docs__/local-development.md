# PawMatch ローカル開発環境ガイド

## 🖥️ ローカル開発環境構成

### 開発環境アーキテクチャ
```
Local Development Environment
┌─────────────────────────────────────────────────────┐
│  Local Machine                                      │
├─────────────────────────────────────────────────────┤
│  Development Servers        │  Cloudflare Services  │
│  ┌─────────────────────────┐│  ┌─────────────────────┐│
│  │ Crawler Worker          ││  │ R2 (Dev Bucket)     ││
│  │ http://localhost:8787   ││  │ pawmatch-images-dev ││
│  │ - Hot reload            ││  │ - 開発用画像保存     ││
│  │ - リアルタイムログ       ││  └─────────────────────┘│
│  └─────────────────────────┘│  ┌─────────────────────┐│
│  ┌─────────────────────────┐│  │ D1 (Dev Database)   ││
│  │ API Worker              ││  │ pawmatch-db-dev     ││
│  │ http://localhost:8788   ││  │ - サンプルデータ     ││
│  │ - Hot reload            ││  │ - 開発用スキーマ     ││
│  │ - CORS設定 (localhost)  ││  └─────────────────────┘│
│  └─────────────────────────┘│                        │
└─────────────────────────────────────────────────────┘
```

## 🛠️ セットアップ手順

### ステップ1: 前提条件の確認

```bash
# Node.js バージョン確認（18以上推奨）
node --version

# Wrangler CLI インストール
npm install -g wrangler

# Cloudflare認証
wrangler login

# jq インストール（テスト用、オプション）
# macOS
brew install jq
# Ubuntu/Debian
sudo apt-get install jq
```

### ステップ2: ローカル開発環境構築

```bash
# プロジェクトルートで実行
./workers/local-dev.sh
```

このスクリプトが自動で実行すること：

#### 🗄️ 開発用リソース作成
- ✅ 開発用R2バケット作成 (`pawmatch-images-dev`)
- ✅ 開発用D1データベース作成 (`pawmatch-db-dev`)
- ✅ データベーススキーマ適用
- ✅ サンプルデータ投入

#### ⚙️ 開発用設定ファイル生成
- ✅ `workers/crawler/wrangler.dev.toml`
- ✅ `workers/api/wrangler.dev.toml`
- ✅ localhost用CORS設定

#### 📦 依存関係インストール
- ✅ Crawler Worker の npm install
- ✅ API Worker の npm install

### ステップ3: 開発サーバー起動

#### ターミナル1: Crawler Worker起動
```bash
cd workers/crawler
wrangler dev --config wrangler.dev.toml
```

出力例：
```
⛅️ wrangler 3.0.0
-------------------
Using vars defined in wrangler.dev.toml
Your worker has access to the following bindings:
- R2 Buckets:
  - IMAGES_BUCKET: pawmatch-images-dev
- D1 Databases:
  - DB: pawmatch-db-dev
⎔ Starting local server...
[mf:inf] Ready on http://localhost:8787
```

#### ターミナル2: API Worker起動
```bash
cd workers/api
wrangler dev --config wrangler.dev.toml
```

出力例：
```
⛅️ wrangler 3.0.0
-------------------
Using vars defined in wrangler.dev.toml
Your worker has access to the following bindings:
- R2 Buckets:
  - IMAGES_BUCKET: pawmatch-images-dev
- D1 Databases:
  - DB: pawmatch-db-dev
⎔ Starting local server...
[mf:inf] Ready on http://localhost:8788
```

## 🧪 動作確認方法

### 自動テスト実行

```bash
# 包括的なAPIテストを実行
./workers/test-local.sh
```

テストスクリプトの実行内容：
- ✅ サーバー生存確認
- ✅ ヘルスチェック
- ✅ 統計情報API
- ✅ ペット一覧API
- ✅ 猫・犬別一覧API
- ✅ 特定ペット取得API
- ✅ 都道府県一覧API
- ✅ 手動クロールAPI
- ✅ クロール後データ確認

### 手動テスト

#### 基本的なAPI確認
```bash
# ヘルスチェック
curl http://localhost:8787/  # Crawler
curl http://localhost:8788/  # API

# 統計情報
curl http://localhost:8788/stats | jq '.'

# ペット一覧取得
curl http://localhost:8788/pets | jq '.'
curl http://localhost:8788/pets/cat | jq '.'
curl http://localhost:8788/pets/dog | jq '.'
```

#### クローラーテスト
```bash
# 手動クロール実行
curl -X POST http://localhost:8787/crawl/cat | jq '.'
curl -X POST http://localhost:8787/crawl/dog | jq '.'

# クロール結果確認
curl http://localhost:8788/pets/cat | jq '.'
```

#### 特定機能のテスト
```bash
# 特定ペットの詳細取得
curl http://localhost:8788/pets/cat/dev001 | jq '.'

# 都道府県一覧
curl http://localhost:8788/prefectures | jq '.'

# ページネーション
curl "http://localhost:8788/pets?limit=5&offset=0" | jq '.'

# 都道府県フィルタ
curl "http://localhost:8788/pets/cat?prefecture=東京都" | jq '.'
```

### ブラウザでの確認

#### APIエンドポイント
- **Crawler Worker**: http://localhost:8787
- **API Worker**: http://localhost:8788

#### 主要API
- **ペット一覧**: http://localhost:8788/pets
- **猫一覧**: http://localhost:8788/pets/cat
- **犬一覧**: http://localhost:8788/pets/dog
- **統計情報**: http://localhost:8788/stats
- **都道府県**: http://localhost:8788/prefectures

## 🔧 開発ツール・デバッグ

### リアルタイムログ確認

```bash
# 別ターミナルで実行
wrangler tail pawmatch-crawler-dev
wrangler tail pawmatch-api-dev
```

### データベース直接操作

```bash
# テーブル一覧確認
wrangler d1 execute pawmatch-db-dev --command "SELECT name FROM sqlite_master WHERE type='table'"

# ペットデータ確認
wrangler d1 execute pawmatch-db-dev --command "SELECT * FROM pets LIMIT 5"

# クロールログ確認
wrangler d1 execute pawmatch-db-dev --command "SELECT * FROM crawl_logs ORDER BY started_at DESC LIMIT 3"

# データ挿入（テスト用）
wrangler d1 execute pawmatch-db-dev --command "INSERT INTO pets (id, type, name, breed) VALUES ('test123', 'cat', 'テスト猫', '雑種')"
```

### R2ストレージ確認

```bash
# バケット一覧
wrangler r2 bucket list

# 開発バケット内のオブジェクト確認
wrangler r2 object list pawmatch-images-dev

# 特定の画像アップロード（テスト用）
wrangler r2 object put pawmatch-images-dev/cats/test-cat.jpg --file=/path/to/image.jpg
```

## 🔄 開発ワークフロー

### 一般的な開発手順

1. **コード編集**
   - `workers/crawler/src/` または `workers/api/src/` 内のファイルを編集
   - ホットリロードで自動的に変更が反映される

2. **動作確認**
   - ブラウザまたはcurlで動作確認
   - ログでエラーチェック

3. **テスト実行**
   - `./workers/test-local.sh` で包括テスト
   - 必要に応じて手動テストも実行

4. **データベース確認**
   - 必要に応じてD1で直接データ確認
   - サンプルデータのリセットも可能

### 開発用サンプルデータ

初回セットアップで以下のサンプルデータが投入されます：

```sql
-- 猫のサンプル
id: 'dev001'
name: 'テスト猫ちゃん'
type: 'cat'
breed: '雑種'

-- 犬のサンプル  
id: 'dev002'
name: 'テスト犬ちゃん'
type: 'dog' 
breed: '柴犬'
```

### サンプルデータのリセット

```bash
# 全ペットデータ削除
wrangler d1 execute pawmatch-db-dev --command "DELETE FROM pets"

# サンプルデータ再投入
cd workers/crawler
./local-dev.sh  # サンプルデータ部分のみ実行される
```

## ⚡ ホットリロード・デバッグ

### ファイル変更の監視
- TypeScriptファイル (`.ts`) の変更を自動検知
- 保存するとWorkerが自動的に再起動
- ブラウザで即座に変更を確認可能

### デバッグのベストプラクティス

#### console.log の活用
```typescript
// workers/crawler/src/crawler.ts
console.log('Crawling started:', { petType, timestamp: new Date() });
```

#### エラーハンドリング
```typescript
try {
  const result = await somethingRisky();
  console.log('Success:', result);
} catch (error) {
  console.error('Error occurred:', error);
  // エラーをログに出力して開発環境で確認
}
```

#### ログの確認
```bash
# ターミナルでリアルタイム確認
wrangler tail pawmatch-crawler-dev --format pretty

# 特定の時間からのログ
wrangler tail pawmatch-api-dev --since "2024-01-01T10:00:00Z"
```

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 1. 開発サーバーが起動しない
```bash
# ポートの競合確認
lsof -i :8787
lsof -i :8788

# プロセス終了
kill -9 <PID>

# 設定ファイル確認
cat workers/crawler/wrangler.dev.toml
cat workers/api/wrangler.dev.toml
```

#### 2. データベース接続エラー
```bash
# データベース存在確認
wrangler d1 list | grep pawmatch-db-dev

# データベースID確認
wrangler d1 info pawmatch-db-dev

# 設定ファイルのID更新
# wrangler.dev.toml の database_id を正しいものに変更
```

#### 3. R2バケット接続エラー
```bash
# バケット存在確認
wrangler r2 bucket list | grep pawmatch-images-dev

# バケット作成（存在しない場合）
wrangler r2 bucket create pawmatch-images-dev
```

#### 4. CORS エラー
- 開発環境では `http://localhost:3004` と `http://localhost:8787/8788` が許可されています
- 別のポートを使用する場合は `wrangler.dev.toml` の `ALLOWED_ORIGIN` を変更

#### 5. TypeScript コンパイルエラー
```bash
# 型チェック実行
cd workers/crawler  # または workers/api
npx tsc --noEmit

# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install
```

## 🔄 本番環境への移行

開発環境でのテストが完了したら：

1. **設定の確認**
   ```bash
   # 本番用設定ファイル確認
   cat workers/crawler/wrangler.toml
   cat workers/api/wrangler.toml
   ```

2. **本番デプロイ**
   ```bash
   ./deploy.sh
   ```

3. **本番環境での動作確認**
   ```bash
   # 本番URLでテスト実行
   curl https://pawmatch-api.YOUR_SUBDOMAIN.workers.dev/stats
   ```

これでローカル開発から本番デプロイまでのフローが完成します。