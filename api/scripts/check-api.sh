#!/bin/bash

# API動作チェックスクリプト
# 使い方: ./scripts/check-api.sh [環境]
# 環境: local, workers, production (デフォルト: production)

# set -e を削除してエラーが出ても続行

# 色付き出力用の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 環境変数の設定
ENV=${1:-production}
case $ENV in
  local)
    API_URL="http://localhost:8787"
    echo -e "${BLUE}🔧 環境: ローカル開発${NC}"
    ;;
  workers)
    API_URL="https://pawmatch-api.naoto24kawa.workers.dev"
    echo -e "${BLUE}🔧 環境: Workers.dev${NC}"
    ;;
  production|prod)
    API_URL="https://pawmatch-api.elchika.app"
    echo -e "${BLUE}🔧 環境: プロダクション${NC}"
    ;;
  *)
    echo -e "${RED}❌ 無効な環境: $ENV${NC}"
    echo "使用可能な環境: local, workers, production"
    exit 1
    ;;
esac

# APIキーの設定（環境変数から取得、なければデフォルト値を使用）
API_KEY=${API_KEY:-"b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb"}

echo -e "${BLUE}📍 API URL: $API_URL${NC}"
echo -e "${BLUE}🔑 API Key: ${API_KEY:0:8}...${NC}"
echo ""

# 成功/失敗カウンター
SUCCESS_COUNT=0
FAIL_COUNT=0

# テスト関数
test_endpoint() {
  local endpoint=$1
  local description=$2
  local method=${3:-GET}
  local data=${4:-}
  
  echo -n "📋 $description... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET \
      -H "X-API-Key: $API_KEY" \
      -H "Content-Type: application/json" \
      "$API_URL$endpoint" 2>/dev/null || echo "000")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "X-API-Key: $API_KEY" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$API_URL$endpoint" 2>/dev/null || echo "000")
  fi
  
  # レスポンスとステータスコードを分離
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    # successフィールドをチェック
    success=$(echo "$body" | jq -r '.success' 2>/dev/null || echo "false")
    if [ "$success" = "true" ]; then
      echo -e "${GREEN}✅ OK (200)${NC}"
      ((SUCCESS_COUNT++))
      
      # 詳細情報を表示（必要に応じて）
      if [ "$endpoint" = "/api/stats" ]; then
        total=$(echo "$body" | jq -r '.data.total' 2>/dev/null || echo "N/A")
        cats=$(echo "$body" | jq -r '.data.cats' 2>/dev/null || echo "N/A")
        dogs=$(echo "$body" | jq -r '.data.dogs' 2>/dev/null || echo "N/A")
        echo "   └─ 合計: $total (猫: $cats, 犬: $dogs)"
      elif [[ "$endpoint" == *"/api/pets/"* ]]; then
        count=$(echo "$body" | jq -r '.data.pets | length' 2>/dev/null || echo "0")
        if [ "$count" != "0" ]; then
          echo "   └─ $count 件のペットデータを取得"
        fi
      fi
    else
      error_msg=$(echo "$body" | jq -r '.error // .message' 2>/dev/null || echo "Unknown error")
      echo -e "${RED}❌ FAIL (200 but success=false): $error_msg${NC}"
      ((FAIL_COUNT++))
    fi
  elif [ "$http_code" = "401" ]; then
    echo -e "${RED}❌ FAIL (401 Unauthorized)${NC}"
    ((FAIL_COUNT++))
  elif [ "$http_code" = "404" ]; then
    echo -e "${YELLOW}⚠️  404 Not Found${NC}"
    ((FAIL_COUNT++))
  elif [ "$http_code" = "000" ]; then
    echo -e "${RED}❌ FAIL (Connection failed)${NC}"
    ((FAIL_COUNT++))
  else
    echo -e "${RED}❌ FAIL ($http_code)${NC}"
    ((FAIL_COUNT++))
  fi
}

# ヘルスチェック
echo -e "${YELLOW}=== ヘルスチェック ===${NC}"
test_endpoint "/" "ルートエンドポイント"
test_endpoint "/health" "ヘルスチェック"
test_endpoint "/health/ready" "レディネスチェック"
echo ""

# 統計情報
echo -e "${YELLOW}=== 統計情報 ===${NC}"
test_endpoint "/api/stats" "統計情報取得"
echo ""

# ペットデータ取得
echo -e "${YELLOW}=== ペットデータ取得 ===${NC}"
test_endpoint "/api/pets/cat?page=1&limit=1" "猫データ取得 (1件)"
test_endpoint "/api/pets/dog?page=1&limit=1" "犬データ取得 (1件)"
test_endpoint "/api/pets/cat/random?count=1" "ランダム猫データ"
test_endpoint "/api/pets/dog/random?count=1" "ランダム犬データ"
echo ""

# 個別ペット取得（存在チェック）
echo -e "${YELLOW}=== 個別ペット取得 ===${NC}"
# まず1件取得してIDを取得
cat_id=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/pets/cat?page=1&limit=1" | jq -r '.data.pets[0].id' 2>/dev/null || echo "")
if [ -n "$cat_id" ] && [ "$cat_id" != "null" ]; then
  test_endpoint "/api/pets/cat/$cat_id" "特定の猫データ取得"
else
  echo "📋 特定の猫データ取得... ${YELLOW}⚠️  スキップ (データなし)${NC}"
fi

dog_id=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/pets/dog?page=1&limit=1" | jq -r '.data.pets[0].id' 2>/dev/null || echo "")
if [ -n "$dog_id" ] && [ "$dog_id" != "null" ]; then
  test_endpoint "/api/pets/dog/$dog_id" "特定の犬データ取得"
else
  echo "📋 特定の犬データ取得... ${YELLOW}⚠️  スキップ (データなし)${NC}"
fi
echo ""

# フィルタリングテスト
echo -e "${YELLOW}=== フィルタリング ===${NC}"
test_endpoint "/api/pets/cat?prefecture=東京都&limit=1" "都道府県フィルタ (東京都の猫)"
test_endpoint "/api/pets/dog?prefecture=大阪府&limit=1" "都道府県フィルタ (大阪府の犬)"
echo ""

# ページネーションテスト
echo -e "${YELLOW}=== ページネーション ===${NC}"
test_endpoint "/api/pets/cat?page=1&limit=5" "ページ1 (5件)"
test_endpoint "/api/pets/cat?page=2&limit=5" "ページ2 (5件)"
echo ""

# 認証テスト
echo -e "${YELLOW}=== 認証テスト ===${NC}"
echo -n "📋 無効なAPIキーでのアクセス... "
response=$(curl -s -w "\n%{http_code}" -X GET \
  -H "X-API-Key: invalid-key-12345" \
  "$API_URL/api/pets/cat?limit=1" 2>/dev/null || echo "000")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
  echo -e "${GREEN}✅ 正しく拒否 (401)${NC}"
  ((SUCCESS_COUNT++))
else
  echo -e "${RED}❌ FAIL (期待: 401, 実際: $http_code)${NC}"
  ((FAIL_COUNT++))
fi

echo -n "📋 APIキーなしでのアクセス... "
response=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_URL/api/pets/cat?limit=1" 2>/dev/null || echo "000")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
  echo -e "${GREEN}✅ 正しく拒否 (401)${NC}"
  ((SUCCESS_COUNT++))
else
  echo -e "${RED}❌ FAIL (期待: 401, 実際: $http_code)${NC}"
  ((FAIL_COUNT++))
fi
echo ""

# CORS プリフライトテスト
echo -e "${YELLOW}=== CORS テスト ===${NC}"
echo -n "📋 OPTIONS リクエスト... "
response=$(curl -s -w "\n%{http_code}" -X OPTIONS \
  -H "Origin: https://pawmatch-dogs.elchika.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-API-Key" \
  "$API_URL/api/pets/cat" 2>/dev/null || echo "000")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "204" ] || [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ OK ($http_code)${NC}"
  ((SUCCESS_COUNT++))
else
  echo -e "${RED}❌ FAIL ($http_code)${NC}"
  ((FAIL_COUNT++))
fi
echo ""

# 結果サマリー
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 テスト結果サマリー${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  成功: ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "  失敗: ${RED}$FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 すべてのテストが成功しました！${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}⚠️  $FAIL_COUNT 個のテストが失敗しました${NC}"
  exit 1
fi