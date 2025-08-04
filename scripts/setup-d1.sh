#!/bin/bash
# D1データベースセットアップスクリプト

set -e

echo "🗄️ PawMatch D1データベースをセットアップしています..."

# ローカル開発用データベース
echo "📦 ローカル開発用データベースを作成..."
wrangler d1 create pawmatch-db || echo "ローカルDBは既に存在している可能性があります"

# ステージング用データベース
echo "🔧 ステージング用データベースを作成..."
wrangler d1 create pawmatch-db-staging || echo "ステージングDBは既に存在している可能性があります"

# 本番用データベース
echo "🚀 本番用データベースを作成..."
wrangler d1 create pawmatch-db-prod || echo "本番DBは既に存在している可能性があります"

echo ""
echo "📋 データベースが作成されました！"
echo "次のステップ:"
echo "1. wrangler.tomlのdatabase_idを各環境の実際のIDに更新してください"
echo "2. npm run db:migrate:local でローカルデータベースをマイグレーションしてください"
echo "3. npm run db:seed:local でローカルデータベースにサンプルデータを投入してください"
echo ""
echo "💡 各環境のデータベースIDを確認するには:"
echo "   wrangler d1 list"