#!/bin/bash

# PawMatch 開発環境セットアップスクリプト
# 新しい開発者が環境を構築するためのスクリプト

set -e

echo "🐱🐶 PawMatch 開発環境セットアップ開始"

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# 1. 依存関係のインストール
echo "📦 依存関係をインストール中..."
echo "  - ルートプロジェクト"
npm install

echo "  - App (Next.js)"
cd app && npm install && cd ..

echo "  - API (Cloudflare Workers)"
cd api && npm install && cd ..

echo "  - Workers/Crawler"
cd workers/crawler && npm install && cd ../..

# 2. 環境変数ファイルのセットアップ
echo "⚙️ 環境変数ファイルをセットアップ中..."

# API環境変数
if [ ! -f "api/.dev.vars" ]; then
    echo "  - api/.dev.vars を作成"
    cat > api/.dev.vars << 'EOF'
# Local development environment variables
ALLOWED_ORIGIN=http://localhost:3004
USE_LOCAL_IMAGES=true
EOF
fi

# App環境変数
if [ ! -f "app/.env.local" ]; then
    echo "  - app/.env.local を作成"
    cat > app/.env.local << 'EOF'
# Next.js App 環境変数
NEXT_PUBLIC_PET_TYPE=cat
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
EOF
fi

# 3. D1データベースの初期化
echo "🗄️ D1データベースを初期化中..."
cd api
echo "  - スキーマを作成中..."
npx wrangler d1 execute pawmatch-db --local --file=./migrations/0001_initial_schema.sql || echo "  (スキーマは既に作成済みの可能性があります)"
echo "  - shelter_urlカラムを追加中..."
npx wrangler d1 execute pawmatch-db --local --file=./migrations/0002_add_shelter_url.sql || echo "  (カラムは既に追加済みの可能性があります)"
echo "  - サンプルデータを投入中..."
node ../scripts/seed-database.js
cd ..

# 4. R2画像のセットアップ
echo "📸 R2画像をセットアップ中..."
echo "  画像アップロードには時間がかかります..."
cd api
node ../scripts/upload-sample-images.js
cd ..

echo "✅ セットアップ完了！"
echo ""
echo "🚀 開発サーバーを起動するには："
echo "  npm run dev        # すべてのサービスを並行起動"
echo "  npm run dev:api    # APIサーバーのみ"
echo "  npm run dev:app    # Appサーバーのみ"
echo ""
echo "🔗 アクセス可能なURL："
echo "  App (CatMatch): http://localhost:3005"
echo "  App (DogMatch): http://localhost:3004"
echo "  API Server:     http://localhost:8787"