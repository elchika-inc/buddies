#!/bin/bash

# Cloudflare Pages環境変数を設定するスクリプト
# Wrangler CLIを使用

set -e

echo "☁️ Cloudflare Pages Environment Setup"
echo "====================================="
echo ""

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Wrangler CLIの確認
if ! command -v wrangler >/dev/null 2>&1; then
  echo -e "${RED}❌ Wrangler CLI is not installed${NC}"
  echo "Install with: npm install -g wrangler"
  exit 1
fi

# シークレットキーを.env.localから読み込む
if [ -f ".env.local" ]; then
  source .env.local
else
  echo -e "${RED}❌ .env.local not found${NC}"
  echo "Please run the setup script first"
  exit 1
fi

# API_SECRET_KEYの確認
if [ -z "$API_SECRET_KEY" ]; then
  echo -e "${RED}❌ API_SECRET_KEY not found in .env.local${NC}"
  exit 1
fi

echo -e "${BLUE}🔑 Using API_SECRET_KEY from .env.local${NC}"
echo ""

# Cloudflare Pages プロジェクトの設定
setup_pages_project() {
  local project_name=$1
  local pet_type=$2
  
  echo -e "${YELLOW}Setting up $project_name (pet_type: $pet_type)...${NC}"
  
  # プロジェクトディレクトリに移動
  cd app || exit 1
  
  # 環境変数を設定
  # 注: Cloudflare PagesのAPI経由での環境変数設定は制限があるため、
  # wrangler pages secretコマンドを使用（ただし、これはシークレットのみ）
  
  echo "Setting environment variables for $project_name..."
  
  # Pages projectの環境変数設定（API経由）
  # これはWrangler v3以降で利用可能
  cat > pages-env-vars.json << EOF
{
  "NEXT_PUBLIC_API_KEY": "$API_SECRET_KEY",
  "NEXT_PUBLIC_API_URL": "https://buddies-api.elchika.app",
  "NEXT_PUBLIC_PET_TYPE": "$pet_type"
}
EOF
  
  # Cloudflare APIを直接使用（要: API Token）
  if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    echo "Using Cloudflare API to set environment variables..."
    
    # アカウントIDを取得
    ACCOUNT_ID=$(wrangler whoami --json | jq -r .account_id)
    
    # Pages プロジェクトの環境変数を設定
    curl -X PATCH "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$project_name" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data '{
        "deployment_configs": {
          "production": {
            "env_vars": {
              "NEXT_PUBLIC_API_KEY": "'"$API_SECRET_KEY"'",
              "NEXT_PUBLIC_API_URL": "https://buddies-api.elchika.app",
              "NEXT_PUBLIC_PET_TYPE": "'"$pet_type"'"
            }
          }
        }
      }'
    
    echo -e "${GREEN}✅ Environment variables set for $project_name${NC}"
  else
    echo -e "${YELLOW}⚠️ CLOUDFLARE_API_TOKEN not set${NC}"
    echo "Manual configuration required at Cloudflare Dashboard"
    echo ""
    echo "Add these environment variables to $project_name:"
    echo "  NEXT_PUBLIC_API_KEY=$API_SECRET_KEY"
    echo "  NEXT_PUBLIC_API_URL=https://buddies-api.elchika.app"
    echo "  NEXT_PUBLIC_PET_TYPE=$pet_type"
  fi
  
  # クリーンアップ
  rm -f pages-env-vars.json
  cd ..
}

# メインメニュー
echo "Select Pages project to configure:"
echo "1) buddies-dogs"
echo "2) buddies-cats"
echo "3) Both"
echo "4) Setup with Cloudflare API Token"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
  1)
    setup_pages_project "buddies-dogs" "dog"
    ;;
  2)
    setup_pages_project "buddies-cats" "cat"
    ;;
  3)
    setup_pages_project "buddies-dogs" "dog"
    echo ""
    setup_pages_project "buddies-cats" "cat"
    ;;
  4)
    echo ""
    echo -e "${BLUE}To automate Cloudflare Pages setup, you need an API Token${NC}"
    echo ""
    echo "1. Go to: https://dash.cloudflare.com/profile/api-tokens"
    echo "2. Create a token with these permissions:"
    echo "   - Account: Cloudflare Pages:Edit"
    echo "   - Zone: Page Rules:Edit (optional)"
    echo ""
    echo "3. Enter your API token:"
    read -s CLOUDFLARE_API_TOKEN
    echo ""
    
    if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
      export CLOUDFLARE_API_TOKEN
      echo -e "${GREEN}✅ API Token set${NC}"
      echo ""
      
      # 再度メニューを表示
      echo "Now select project to configure:"
      echo "1) buddies-dogs"
      echo "2) buddies-cats"
      echo "3) Both"
      read -p "Enter choice [1-3]: " subchoice

      case $subchoice in
        1) setup_pages_project "buddies-dogs" "dog" ;;
        2) setup_pages_project "buddies-cats" "cat" ;;
        3)
          setup_pages_project "buddies-dogs" "dog"
          echo ""
          setup_pages_project "buddies-cats" "cat"
          ;;
      esac
    fi
    ;;
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}📝 Manual verification required:${NC}"
echo "1. Go to: https://dash.cloudflare.com/"
echo "2. Navigate to: Pages → Your Project → Settings → Environment variables"
echo "3. Verify the environment variables are set correctly"
echo ""
echo "Required variables:"
echo "  NEXT_PUBLIC_API_KEY=$API_SECRET_KEY"
echo "  NEXT_PUBLIC_API_URL=https://buddies-api.elchika.app"
echo "  NEXT_PUBLIC_PET_TYPE=dog (or cat)"