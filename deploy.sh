#!/bin/bash

set -e

echo "🚀 PawMatch Cloudflare Workers デプロイスクリプト"
echo "================================================="

# 必要なツールの確認
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler が見つかりません。インストールしてください："
    echo "npm install -g wrangler"
    exit 1
fi

# 認証確認
echo "🔐 Cloudflare 認証状態を確認中..."
if ! wrangler whoami &> /dev/null; then
    echo "⚠️  Cloudflare にログインしていません"
    echo "wrangler login を実行してください"
    exit 1
fi

echo "✅ 認証済み: $(wrangler whoami)"

# R2バケットの作成
echo ""
echo "📦 R2バケットを作成中..."
if wrangler r2 bucket create pawmatch-images 2>/dev/null; then
    echo "✅ R2バケット 'pawmatch-images' を作成しました"
else
    echo "ℹ️  R2バケット 'pawmatch-images' は既に存在します"
fi

# D1データベースの作成
echo ""
echo "🗄️  D1データベースを作成中..."
DB_OUTPUT=$(wrangler d1 create pawmatch-db 2>&1 || echo "exists")

if [[ $DB_OUTPUT == *"exists"* ]] || [[ $DB_OUTPUT == *"already exists"* ]]; then
    echo "ℹ️  D1データベース 'pawmatch-db' は既に存在します"
    DB_ID=$(wrangler d1 list | grep pawmatch-db | awk '{print $1}' || echo "")
else
    # 新しいデータベースのIDを抽出
    DB_ID=$(echo "$DB_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2 || echo "")
    echo "✅ D1データベース 'pawmatch-db' を作成しました"
fi

if [ -z "$DB_ID" ]; then
    echo "❌ データベースIDを取得できませんでした"
    exit 1
fi

echo "📝 データベースID: $DB_ID"

# wrangler.tomlファイルのデータベースIDを更新
echo ""
echo "⚙️  設定ファイルを更新中..."
sed -i.bak "s/database_id = \"YOUR_DATABASE_ID\"/database_id = \"$DB_ID\"/" workers/crawler/wrangler.toml
sed -i.bak "s/database_id = \"YOUR_DATABASE_ID\"/database_id = \"$DB_ID\"/" workers/api/wrangler.toml
rm -f workers/crawler/wrangler.toml.bak workers/api/wrangler.toml.bak

echo "✅ 設定ファイルを更新しました"

# データベーススキーマの適用
echo ""
echo "🗃️  データベーススキーマを適用中..."
cd workers/crawler
if wrangler d1 execute pawmatch-db --file=schema.sql; then
    echo "✅ スキーマを適用しました"
else
    echo "⚠️  スキーマ適用でエラーが発生しました（既存テーブルの場合は正常です）"
fi
cd ../..

# 依存関係のインストール
echo ""
echo "📦 依存関係をインストール中..."

echo "  📁 crawler worker..."
cd workers/crawler && npm install &> /dev/null && cd ../..
echo "  ✅ crawler worker の依存関係をインストールしました"

echo "  📁 api worker..."
cd workers/api && npm install &> /dev/null && cd ../..
echo "  ✅ api worker の依存関係をインストールしました"

# Workers のデプロイ
echo ""
echo "🚀 Workers をデプロイ中..."

echo "  📤 crawler worker をデプロイ中..."
cd workers/crawler
if npm run deploy; then
    echo "  ✅ crawler worker をデプロイしました"
else
    echo "  ❌ crawler worker のデプロイに失敗しました"
    exit 1
fi
cd ../..

echo "  📤 api worker をデプロイ中..."
cd workers/api
if npm run deploy; then
    echo "  ✅ api worker をデプロイしました"
else
    echo "  ❌ api worker のデプロイに失敗しました"
    exit 1
fi
cd ../..

echo ""
echo "🎉 デプロイ完了！"
echo ""
echo "📋 次のステップ:"
echo "  1. カスタムドメインを設定してください（オプション）"
echo "  2. 手動クロールをテスト: curl -X POST https://pawmatch-crawler.YOUR_SUBDOMAIN.workers.dev/crawl/cat"
echo "  3. API動作をテスト: curl https://pawmatch-api.YOUR_SUBDOMAIN.workers.dev/pets/cat"
echo ""
echo "🔧 管理画面:"
echo "  - Workers: https://dash.cloudflare.com/workers-and-pages"
echo "  - R2: https://dash.cloudflare.com/r2"
echo "  - D1: https://dash.cloudflare.com/d1"
echo ""
echo "📊 ログ確認:"
echo "  - wrangler tail pawmatch-crawler"
echo "  - wrangler tail pawmatch-api"