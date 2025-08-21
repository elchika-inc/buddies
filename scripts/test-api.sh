#!/bin/bash
set -e

# 色付きログ出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:8787"

echo -e "${BLUE}=== PawMatch API テスト ===${NC}\n"

# 1. ヘルスチェック
echo -e "${YELLOW}1. ヘルスチェック${NC}"
curl -s "$API_URL/" | jq '.' || echo "Failed"
echo ""

# 2. 統計情報取得
echo -e "${YELLOW}2. 統計情報${NC}"
curl -s "$API_URL/stats" | jq '.' || echo "Failed"
echo ""

# 3. 犬のリスト取得
echo -e "${YELLOW}3. 犬のリスト（最初の3件）${NC}"
curl -s "$API_URL/pets/dog?limit=3" | jq '.pets[] | {id, name, breed, age, prefecture}' || echo "Failed"
echo ""

# 4. 猫のリスト取得
echo -e "${YELLOW}4. 猫のリスト（最初の3件）${NC}"
curl -s "$API_URL/pets/cat?limit=3" | jq '.pets[] | {id, name, breed, age, prefecture}' || echo "Failed"
echo ""

# 5. 都道府県リスト取得
echo -e "${YELLOW}5. 都道府県リスト${NC}"
curl -s "$API_URL/prefectures" | jq '.prefectures[:5]' || echo "Failed"
echo ""

# 6. 画像エンドポイントテスト（WebP形式）
echo -e "${YELLOW}6. 画像エンドポイント（WebP形式）${NC}"
FIRST_DOG_ID=$(curl -s "$API_URL/pets/dog?limit=1" | jq -r '.pets[0].id' 2>/dev/null || echo "")
if [ -n "$FIRST_DOG_ID" ]; then
    IMAGE_URL="$API_URL/images/dogs/${FIRST_DOG_ID}?format=webp"
    echo "Testing: $IMAGE_URL"
    RESPONSE=$(curl -sI "$IMAGE_URL" | head -n 1)
    echo "$RESPONSE"
    
    # Content-Typeチェック
    CONTENT_TYPE=$(curl -sI "$IMAGE_URL" | grep -i "content-type" || echo "")
    echo "$CONTENT_TYPE"
else
    echo "No dog data found"
fi
echo ""

# 7. 画像エンドポイントテスト（オリジナル形式）
echo -e "${YELLOW}7. 画像エンドポイント（オリジナル形式）${NC}"
if [ -n "$FIRST_DOG_ID" ]; then
    IMAGE_URL="$API_URL/images/dogs/${FIRST_DOG_ID}?format=original"
    echo "Testing: $IMAGE_URL"
    RESPONSE=$(curl -sI "$IMAGE_URL" | head -n 1)
    echo "$RESPONSE"
    
    # Content-Typeチェック
    CONTENT_TYPE=$(curl -sI "$IMAGE_URL" | grep -i "content-type" || echo "")
    echo "$CONTENT_TYPE"
else
    echo "No dog data found"
fi
echo ""

# 8. 特定のペット詳細取得
echo -e "${YELLOW}8. 特定のペット詳細${NC}"
if [ -n "$FIRST_DOG_ID" ]; then
    curl -s "$API_URL/pets/dog/${FIRST_DOG_ID}" | jq '.pet | {id, name, breed, description, personality}' || echo "Failed"
else
    echo "No dog data found"
fi
echo ""

echo -e "${GREEN}=== テスト完了 ===${NC}"