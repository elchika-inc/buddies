# デプロイ手順

## 前提条件

### 1. Cloudflare APIトークンの設定

デプロイを実行する前に、Cloudflare APIトークンを環境変数に設定する必要があります。

```bash
# 1. Cloudflare Dashboard でAPIトークンを作成
# https://dash.cloudflare.com/profile/api-tokens

# 2. 以下の権限を持つトークンを作成:
# - Account:Cloudflare Workers Scripts:Edit
# - Account:Account Settings:Read
# - Zone:Workers Routes:Edit (必要に応じて)

# 3. 環境変数に設定
export CLOUDFLARE_API_TOKEN="your-api-token-here"

# または、.envファイルに保存
echo "CLOUDFLARE_API_TOKEN=your-api-token-here" >> .env
```

### 2. アカウントIDの確認

```bash
# wrangler whoami でアカウントIDを確認
npx wrangler whoami
```

## デプロイコマンド

### 個別デプロイ

```bash
# API Worker
npm run deploy:api

# Crawler Worker  
npm run deploy:crawler

# Dispatcher Worker
npm run deploy:dispatcher

# DogMatch App (Cloudflare Pages)
npm run deploy:dog

# CatMatch App (Cloudflare Pages)
npm run deploy:cat
```

### 一括デプロイ

```bash
# 全サービスをデプロイ
npm run deploy:all

# または Bun を使用
bun run deploy:all
```

## デプロイ順序

`deploy:all` は以下の順序でデプロイを実行します：

1. **Workers のデプロイ** (並列実行)
   - pawmatch-api
   - pawmatch-crawler
   - pawmatch-dispatcher

2. **Apps のデプロイ** (順次実行)
   - pawmatch-dogs (DogMatch)
   - pawmatch-cats (CatMatch)

## トラブルシューティング

### APIトークンエラー

```
✘ [ERROR] In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN
```

**解決方法:**
```bash
export CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"
```

### 環境指定の警告

```
▲ [WARNING] Multiple environments are defined in the Wrangler configuration file
```

**解決方法:**
本番環境へのデプロイを明示的に指定：
```bash
cd api && wrangler deploy --env production
```

### Pages デプロイの失敗

Cloudflare Pages のデプロイが失敗する場合、以下を確認：

1. `app/package.json` の `deploy:dog` と `deploy:cat` スクリプトが正しく設定されているか
2. Cloudflare Pages プロジェクトが作成されているか
3. 環境変数が Cloudflare Dashboard で設定されているか

## 環境変数の設定

各サービスで必要な環境変数は `wrangler.toml` に定義されています。
シークレットな値は `wrangler secret put` コマンドで設定します：

```bash
# 例: GitHub Token の設定
cd dispatcher
echo "your-github-token" | wrangler secret put GITHUB_TOKEN
```