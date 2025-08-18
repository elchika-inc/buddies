#!/bin/bash

echo "🧪 PawMatch Workers ローカルテスト"
echo "==============================="

# APIのベースURL（ローカル開発サーバー）
CRAWLER_URL="http://localhost:8787"
API_URL="http://localhost:8788"

echo ""
echo "🔍 サーバーの生存確認..."

# Crawler Worker の確認
echo -n "Crawler Worker: "
if curl -s "$CRAWLER_URL" > /dev/null; then
    echo "✅ 起動中"
else
    echo "❌ 未起動 - 'cd workers/crawler && wrangler dev --config wrangler.dev.toml' で起動してください"
    exit 1
fi

# API Worker の確認
echo -n "API Worker: "
if curl -s "$API_URL" > /dev/null; then
    echo "✅ 起動中"
else
    echo "❌ 未起動 - 'cd workers/api && wrangler dev --config wrangler.dev.toml' で起動してください"
    exit 1
fi

echo ""
echo "📊 APIテスト実行..."

# ヘルスチェック
echo ""
echo "1️⃣ ヘルスチェック"
echo "GET $API_URL/"
curl -s "$API_URL/" | jq '.' || echo "レスポンス確認済み"

# 統計情報取得
echo ""
echo "2️⃣ 統計情報取得"
echo "GET $API_URL/stats"
curl -s "$API_URL/stats" | jq '.' || echo "レスポンス確認済み"

# ペット一覧取得
echo ""
echo "3️⃣ 全ペット一覧取得"
echo "GET $API_URL/pets"
curl -s "$API_URL/pets" | jq '.' || echo "レスポンス確認済み"

# 猫の一覧取得
echo ""
echo "4️⃣ 猫一覧取得"
echo "GET $API_URL/pets/cat"
curl -s "$API_URL/pets/cat" | jq '.' || echo "レスポンス確認済み"

# 犬の一覧取得
echo ""
echo "5️⃣ 犬一覧取得"
echo "GET $API_URL/pets/dog"
curl -s "$API_URL/pets/dog" | jq '.' || echo "レスポンス確認済み"

# 特定のペット取得
echo ""
echo "6️⃣ 特定ペット取得（猫）"
echo "GET $API_URL/pets/cat/dev001"
curl -s "$API_URL/pets/cat/dev001" | jq '.' || echo "レスポンス確認済み"

# 都道府県一覧
echo ""
echo "7️⃣ 都道府県一覧取得"
echo "GET $API_URL/prefectures"
curl -s "$API_URL/prefectures" | jq '.' || echo "レスポンス確認済み"

echo ""
echo "🕸️ Crawlerテスト実行..."

# Crawlerヘルスチェック
echo ""
echo "8️⃣ Crawlerヘルスチェック"
echo "GET $CRAWLER_URL/"
curl -s "$CRAWLER_URL/" | jq '.' || echo "レスポンス確認済み"

# 手動クロール実行（猫）
echo ""
echo "9️⃣ 手動クロール実行（猫）"
echo "POST $CRAWLER_URL/crawl/cat"
curl -s -X POST "$CRAWLER_URL/crawl/cat" | jq '.' || echo "レスポンス確認済み"

# データベース内容確認（クロール後）
echo ""
echo "🔟 クロール後のペット一覧確認"
echo "GET $API_URL/pets/cat"
curl -s "$API_URL/pets/cat" | jq '.' || echo "レスポンス確認済み"

echo ""
echo "✅ 全テスト完了！"
echo ""
echo "🌐 ブラウザでの確認:"
echo "  - Crawler Worker: $CRAWLER_URL"
echo "  - API Worker: $API_URL"
echo "  - ペット一覧: $API_URL/pets"
echo "  - 統計: $API_URL/stats"