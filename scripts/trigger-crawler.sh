#!/bin/bash

# Crawler Trigger Script for PawMatch
# Usage: ./trigger-crawler.sh [dev|prod] [dog|cat|both] [limit]

set -e

# デフォルト値
ENV="${1:-dev}"
PET_TYPE="${2:-both}"
LIMIT="${3:-10}"
SOURCE="${4:-pet-home}"

# 環境に応じたURLとAPIキー設定
if [ "$ENV" = "prod" ]; then
    API_URL="https://pawmatch-api.elchika.app"
    # 本番環境のAPIキー（.env.productionから読み込むか環境変数から取得）
    if [ -z "$ADMIN_SECRET" ]; then
        echo "Error: ADMIN_SECRET environment variable is not set for production"
        echo "Please set: export ADMIN_SECRET=your_admin_secret_key"
        exit 1
    fi
    API_KEY="$ADMIN_SECRET"
else
    API_URL="http://localhost:9789"
    # 開発環境ではAPIキー不要（現在無効化中）
    API_KEY=""
fi

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 設定確認
echo -e "${YELLOW}=== Crawler Trigger Script ===${NC}"
echo "Environment: $ENV"
echo "API URL: $API_URL"
echo "Pet Type: $PET_TYPE"
echo "Limit: $LIMIT"
echo "Source: $SOURCE"
echo ""

# APIリクエスト実行
echo -e "${YELLOW}Triggering crawler...${NC}"

if [ "$ENV" = "prod" ]; then
    # 本番環境：認証ヘッダー付き
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/admin/trigger-crawler" \
        -H "Content-Type: application/json" \
        -H "X-Admin-Secret: $API_KEY" \
        -d "{
            \"type\": \"$PET_TYPE\",
            \"limit\": $LIMIT,
            \"source\": \"$SOURCE\"
        }")
else
    # 開発環境：認証ヘッダーなし（/api/crawler エンドポイント使用）
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/crawler" \
        -H "Content-Type: application/json" \
        -d "{
            \"petType\": \"$PET_TYPE\",
            \"limit\": $LIMIT
        }")
fi

# レスポンス解析
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

# 結果表示
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✓ Crawler triggered successfully!${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗ Failed to trigger crawler (HTTP $HTTP_CODE)${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
fi