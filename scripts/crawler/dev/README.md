# PawMatch Crawler 開発用スクリプト

このディレクトリには開発環境専用のスクリプトとSQLファイルが含まれています。

⚠️ **注意: これらは開発環境専用です。本番環境では使用しないでください。**

## ファイル構成

### スクリプト

| ファイル | 用途 | 説明 |
|----------|------|------|
| `setup-dev-db.sh` | 🚀 初期セットアップ | 開発用データベースの初期化と設定 |
| `reset-dev-db.sh` | 🗑️ リセット | データベースを完全にリセット |
| `test-crawlers.sh` | 🧪 テスト実行 | 全クローラーの動作テスト |

### SQLファイル

| ファイル | 用途 | 説明 |
|----------|------|------|
| `schema-dev.sql` | 📋 スキーマ定義 | 開発用データベーススキーマ |
| `dev-queries.sql` | 🔍 クエリ集 | 開発時によく使うクエリ集 |

## 使用方法

### 1. 初回セットアップ

```bash
# crawlerディレクトリで実行
./scripts/dev/setup-dev-db.sh
```

このスクリプトが自動で以下を実行します：
- データベース状態の確認
- 必要に応じてスキーマの適用
- テーブル一覧の表示
- 使用可能なコマンドの表示

### 2. クローラーのテスト

```bash
# 全クローラーをテスト（事前に npm run dev でサーバー起動が必要）
./scripts/dev/test-crawlers.sh
```

### 3. データベースのリセット

```bash
# データベースを完全にリセット
./scripts/dev/reset-dev-db.sh
```

### 4. 手動でのデータベース操作

```bash
# 開発用クエリの実行
wrangler d1 execute pawmatch-db-dev --local --config wrangler.dev.toml --file=scripts/dev/dev-queries.sql

# 単発クエリの実行
wrangler d1 execute pawmatch-db-dev --local --config wrangler.dev.toml --command="SELECT COUNT(*) FROM pets;"
```

## 開発ワークフロー

### 1. 新しいクローラーの開発時

```bash
# 1. 環境セットアップ
./scripts/dev/setup-dev-db.sh

# 2. サーバー起動
npm run dev

# 3. 新しいクローラーの実装
# src/crawlers/NewCrawler.ts を作成

# 4. テスト実行
./scripts/dev/test-crawlers.sh

# 5. 必要に応じてリセット
./scripts/dev/reset-dev-db.sh
```

### 2. デバッグ時

```bash
# データ確認
wrangler d1 execute pawmatch-db-dev --local --config wrangler.dev.toml --command="SELECT id, type, name FROM pets ORDER BY created_at DESC LIMIT 10;"

# エラー確認
wrangler d1 execute pawmatch-db-dev --local --config wrangler.dev.toml --command="SELECT * FROM crawl_logs WHERE success = FALSE ORDER BY started_at DESC LIMIT 5;"

# クローラー状態確認
curl "http://localhost:PORT/crawl/status"
```

## よく使うコマンド集

### データベース操作

```bash
# テーブル一覧
wrangler d1 execute pawmatch-db-dev --local --config wrangler.dev.toml --command="SELECT name FROM sqlite_master WHERE type='table';"

# ペット数確認
wrangler d1 execute pawmatch-db-dev --local --config wrangler.dev.toml --command="SELECT type, COUNT(*) as count FROM pets GROUP BY type;"

# 最新データ確認
wrangler d1 execute pawmatch-db-dev --local --config wrangler.dev.toml --command="SELECT id, name, created_at FROM pets ORDER BY created_at DESC LIMIT 5;"
```

### クローラー操作

```bash
# ポート検出（自動）
PORT=$(lsof -ti tcp | grep LISTEN | head -1 | cut -d: -f2)

# 手動クロール
curl -X POST "http://localhost:$PORT/crawl/pet-home/cat?limit=3"

# 状態確認
curl "http://localhost:$PORT/crawl/status/pet-home"
```

## トラブルシューティング

### データベースが見つからない

```bash
# wrangler.dev.tomlがあることを確認
ls -la wrangler.dev.toml

# データベースを再作成
./scripts/dev/reset-dev-db.sh
```

### クローラーが応答しない

```bash
# プロセス確認
ps aux | grep "wrangler dev"

# ポート確認
lsof -i :8787

# サーバー再起動
npm run dev
```

### テスト失敗

```bash
# エラーログ確認
./scripts/dev/test-crawlers.sh 2>&1 | tee test.log

# データベース状態確認
wrangler d1 execute pawmatch-db-dev --local --config wrangler.dev.toml --file=scripts/dev/dev-queries.sql
```

## 注意事項

- ⚠️ **開発環境専用**: これらのスクリプトは開発環境でのみ使用してください
- 🔒 **本番環境**: 本番環境では `api/migrations/` を使用してください  
- 🧹 **データリセット**: `reset-dev-db.sh` は全データを削除します
- 📝 **バックアップ**: 重要なテストデータは事前にバックアップしてください