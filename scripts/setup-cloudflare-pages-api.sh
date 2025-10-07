#!/bin/bash

# Cloudflare Pages環境変数をAPIで設定するスクリプト

set -e

echo "☁️ Cloudflare Pages Environment Setup (API)"
echo "==========================================="
echo ""

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# シークレットキーを.env.localから読み込む
if [ -f ".env.local" ]; then
  source .env.local
else
  echo -e "${RED}❌ .env.local not found${NC}"
  exit 1
fi

# 必要な変数の確認
if [ -z "$API_SECRET_KEY" ]; then
  echo -e "${RED}❌ API_SECRET_KEY not found in .env.local${NC}"
  exit 1
fi

# Cloudflare API Token確認（GitHub Secretsから取得された可能性）
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  # gh CLIでGitHub Secretsから取得を試みる
  if command -v gh >/dev/null 2>&1; then
    echo "Attempting to get CLOUDFLARE_API_TOKEN from GitHub Secrets..."
    CLOUDFLARE_API_TOKEN=$(gh secret list --json name,value 2>/dev/null | jq -r '.[] | select(.name=="CLOUDFLARE_API_TOKEN") | .value' || echo "")
  fi
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo -e "${YELLOW}⚠️ CLOUDFLARE_API_TOKEN not found${NC}"
  echo ""
  echo "To get your Cloudflare API Token:"
  echo "1. Go to: https://dash.cloudflare.com/profile/api-tokens"
  echo "2. Use existing token or create new one with permissions:"
  echo "   - Account: Cloudflare Pages:Edit"
  echo ""
  echo "Enter your Cloudflare API Token:"
  read -s CLOUDFLARE_API_TOKEN
  echo ""
fi

# アカウントIDを取得
echo "Getting Cloudflare Account ID..."
ACCOUNT_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" | jq -r '.result[0].id')

if [ -z "$ACCOUNT_ID" ] || [ "$ACCOUNT_ID" = "null" ]; then
  echo -e "${RED}❌ Failed to get Cloudflare Account ID${NC}"
  echo "Please check your API token permissions"
  exit 1
fi

echo -e "${GREEN}✓ Account ID: $ACCOUNT_ID${NC}"
echo ""

# Pagesプロジェクト一覧を取得
echo "Fetching Pages projects..."
PROJECTS=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" | jq -r '.result[].name')

echo "Available projects:"
echo "$PROJECTS"
echo ""

# 環境変数を設定する関数
set_pages_env() {
  local project_name=$1
  local pet_type=$2
  
  echo -e "${BLUE}Setting environment variables for $project_name...${NC}"
  
  # プロジェクトの詳細を取得
  PROJECT_DETAILS=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$project_name" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json")
  
  # 現在の設定を取得
  CURRENT_CONFIG=$(echo "$PROJECT_DETAILS" | jq '.result.deployment_configs')
  
  # 新しい環境変数を追加
  UPDATED_CONFIG=$(echo "$CURRENT_CONFIG" | jq --arg key "$API_SECRET_KEY" --arg type "$pet_type" '
    .production.env_vars.NEXT_PUBLIC_API_KEY = {
      type: "plain_text",
      value: $key
    } |
    .production.env_vars.NEXT_PUBLIC_API_URL = {
      type: "plain_text",
      value: "https://buddies-api.elchika.app"
    } |
    .production.env_vars.NEXT_PUBLIC_PET_TYPE = {
      type: "plain_text",
      value: $type
    } |
    .preview.env_vars = .production.env_vars
  ')
  
  # プロジェクトを更新
  RESPONSE=$(curl -s -X PATCH "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$project_name" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"deployment_configs\": $UPDATED_CONFIG}")
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Successfully updated $project_name${NC}"
  else
    echo -e "${RED}❌ Failed to update $project_name${NC}"
    echo "$RESPONSE" | jq '.errors'
  fi
}

# buddies-dogsが存在するか確認
if echo "$PROJECTS" | grep -q "buddies-dogs"; then
  set_pages_env "buddies-dogs" "dog"
else
  echo -e "${YELLOW}⚠️ buddies-dogs project not found${NC}"
fi

echo ""

# buddies-catsが存在するか確認
if echo "$PROJECTS" | grep -q "buddies-cats"; then
  set_pages_env "buddies-cats" "cat"
else
  echo -e "${YELLOW}⚠️ buddies-cats project not found${NC}"
fi

echo ""
echo -e "${BLUE}📝 Verification:${NC}"
echo "Check your Cloudflare Pages projects at:"
echo "https://dash.cloudflare.com/$ACCOUNT_ID/pages"
echo ""
echo "Environment variables should be set for:"
echo "  - NEXT_PUBLIC_API_KEY"
echo "  - NEXT_PUBLIC_API_URL"
echo "  - NEXT_PUBLIC_PET_TYPE"

# オプション：トークンを保存
echo ""
read -p "Save CLOUDFLARE_API_TOKEN to GitHub Secrets? (y/n): " save_token
if [ "$save_token" = "y" ]; then
  if command -v gh >/dev/null 2>&1; then
    echo "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN
    echo -e "${GREEN}✅ CLOUDFLARE_API_TOKEN saved to GitHub Secrets${NC}"
  fi
fi