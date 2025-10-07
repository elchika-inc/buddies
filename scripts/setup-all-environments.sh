#!/bin/bash

# すべての環境に環境変数を設定する統合スクリプト

set -e

echo "🔐 Buddies Environment Setup"
echo "============================="
echo ""

# 色付きの出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# シークレットキーを生成
generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | base64 | tr -d "=+/" | cut -c1-32
  fi
}

# 現在の設定を確認
check_current_setup() {
  echo -e "${BLUE}📋 Checking current setup...${NC}"
  echo ""
  
  # GitHub Secrets (手動確認が必要)
  echo -e "${YELLOW}GitHub Secrets:${NC}"
  echo "  Please check manually at: https://github.com/[your-org]/buddies/settings/secrets/actions"
  echo ""
  
  # Cloudflare Workers
  echo -e "${YELLOW}Cloudflare Workers:${NC}"
  if command -v wrangler >/dev/null 2>&1; then
    cd api 2>/dev/null || true
    echo "  Checking production secrets..."
    wrangler secret list --env production 2>/dev/null || echo "  Not configured or not logged in"
    cd - >/dev/null 2>&1
  else
    echo "  Wrangler CLI not installed"
  fi
  echo ""
  
  # Local files
  echo -e "${YELLOW}Local Environment:${NC}"
  if [ -f "api/.dev.vars" ]; then
    echo -e "  ${GREEN}✓${NC} api/.dev.vars exists"
  else
    echo -e "  ${RED}✗${NC} api/.dev.vars not found"
  fi
  
  if [ -f "app/.env.local" ]; then
    echo -e "  ${GREEN}✓${NC} app/.env.local exists"
  else
    echo -e "  ${RED}✗${NC} app/.env.local not found"
  fi
  
  if [ -f ".env.local" ]; then
    echo -e "  ${GREEN}✓${NC} .env.local exists (root)"
  else
    echo -e "  ${RED}✗${NC} .env.local not found (root)"
  fi
  echo ""
}

# メインメニュー
show_menu() {
  echo -e "${BLUE}Select setup option:${NC}"
  echo "1) Full setup (all environments)"
  echo "2) GitHub Actions only"
  echo "3) Cloudflare Workers only"
  echo "4) Cloudflare Pages only"
  echo "5) Local development only"
  echo "6) Generate secrets only"
  echo "7) Check current setup"
  echo "0) Exit"
  echo ""
  read -p "Enter choice [0-7]: " choice
}

# シークレットキーを生成して表示
generate_and_show_secrets() {
  API_SECRET_KEY=$(generate_secret)
  API_ADMIN_SECRET=$API_SECRET_KEY  # 同じキーを使用
  
  echo ""
  echo -e "${GREEN}🔑 Generated Secrets:${NC}"
  echo "================================"
  echo -e "${YELLOW}API_SECRET_KEY:${NC}"
  echo "$API_SECRET_KEY"
  echo ""
  echo -e "${YELLOW}API_ADMIN_SECRET:${NC}"
  echo "$API_ADMIN_SECRET"
  echo "================================"
  echo ""
}

# GitHub Actions設定
setup_github_actions() {
  echo -e "${BLUE}📦 GitHub Actions Setup${NC}"
  echo "----------------------"
  echo ""
  echo "Add these secrets to your GitHub repository:"
  echo "https://github.com/[your-org]/buddies/settings/secrets/actions"
  echo ""
  echo -e "${YELLOW}Required Secrets:${NC}"
  echo "  API_SECRET_KEY=$API_SECRET_KEY"
  echo "  API_ADMIN_SECRET=$API_ADMIN_SECRET"
  echo "  API_URL=https://buddies-api.elchika.app"
  echo ""
  echo -e "${YELLOW}Existing R2 Secrets (keep as is):${NC}"
  echo "  R2_ACCOUNT_ID"
  echo "  R2_ACCESS_KEY_ID"
  echo "  R2_SECRET_ACCESS_KEY"
  echo "  R2_BUCKET_NAME"
  echo ""
  read -p "Press Enter when you've added these to GitHub..."
}

# Cloudflare Workers設定
setup_cloudflare_workers() {
  echo -e "${BLUE}⚡ Cloudflare Workers Setup${NC}"
  echo "--------------------------"
  echo ""
  
  if ! command -v wrangler >/dev/null 2>&1; then
    echo -e "${RED}Wrangler CLI not installed!${NC}"
    echo "Install with: npm install -g wrangler"
    return 1
  fi
  
  cd api || { echo "api directory not found"; return 1; }
  
  echo "Setting production secrets..."
  echo "$API_SECRET_KEY" | wrangler secret put API_SECRET_KEY --env production
  echo "$API_ADMIN_SECRET" | wrangler secret put API_ADMIN_SECRET --env production
  
  echo -e "${GREEN}✓ Workers secrets configured${NC}"
  cd - >/dev/null
}

# Cloudflare Pages設定
setup_cloudflare_pages() {
  echo -e "${BLUE}📄 Cloudflare Pages Setup${NC}"
  echo "------------------------"
  echo ""
  echo "Add these environment variables to Cloudflare Pages:"
  echo "Dashboard > Pages > [Your Project] > Settings > Environment variables"
  echo ""
  echo -e "${YELLOW}For buddies-dogs:${NC}"
  echo "  NEXT_PUBLIC_API_URL=https://buddies-api.elchika.app"
  echo "  NEXT_PUBLIC_API_KEY=$API_SECRET_KEY"
  echo "  NEXT_PUBLIC_PET_TYPE=dog"
  echo ""
  echo -e "${YELLOW}For buddies-cats:${NC}"
  echo "  NEXT_PUBLIC_API_URL=https://buddies-api.elchika.app"
  echo "  NEXT_PUBLIC_API_KEY=$API_SECRET_KEY"
  echo "  NEXT_PUBLIC_PET_TYPE=cat"
  echo ""
  read -p "Press Enter when you've added these to Cloudflare Pages..."
}

# ローカル開発環境設定
setup_local_development() {
  echo -e "${BLUE}💻 Local Development Setup${NC}"
  echo "-------------------------"
  echo ""
  
  # api/.dev.vars
  echo "Creating api/.dev.vars..."
  cat > api/.dev.vars << EOF
API_SECRET_KEY=$API_SECRET_KEY
API_ADMIN_SECRET=$API_ADMIN_SECRET
EOF
  echo -e "${GREEN}✓${NC} api/.dev.vars created"
  
  # app/.env.local
  echo "Creating app/.env.local..."
  cat > app/.env.local << EOF
# Development environment
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_API_KEY=$API_SECRET_KEY
NEXT_PUBLIC_PET_TYPE=dog
EOF
  echo -e "${GREEN}✓${NC} app/.env.local created"
  
  # Root .env.local (for scripts)
  echo "Updating root .env.local..."
  if [ -f ".env.local" ]; then
    # 既存のファイルを更新
    grep -v "^API_SECRET_KEY=" .env.local | grep -v "^API_ADMIN_SECRET=" > .env.local.tmp 2>/dev/null || true
    cat .env.local.tmp > .env.local
    rm .env.local.tmp
  fi
  echo "API_SECRET_KEY=$API_SECRET_KEY" >> .env.local
  echo "API_ADMIN_SECRET=$API_ADMIN_SECRET" >> .env.local
  echo -e "${GREEN}✓${NC} .env.local updated"
  
  echo ""
  echo -e "${GREEN}Local development environment configured!${NC}"
}

# 完全セットアップ
full_setup() {
  generate_and_show_secrets
  
  echo -e "${YELLOW}Starting full environment setup...${NC}"
  echo ""
  
  # GitHub Actions
  setup_github_actions
  echo ""
  
  # Cloudflare Workers
  read -p "Setup Cloudflare Workers? (y/n): " setup_workers
  if [ "$setup_workers" = "y" ]; then
    setup_cloudflare_workers
  fi
  echo ""
  
  # Cloudflare Pages
  setup_cloudflare_pages
  echo ""
  
  # Local Development
  setup_local_development
  echo ""
  
  echo -e "${GREEN}🎉 Full setup complete!${NC}"
}

# メイン処理
main() {
  # 現在のディレクトリを確認
  if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Run this script from the project root directory${NC}"
    exit 1
  fi
  
  while true; do
    show_menu
    
    case $choice in
      1)
        full_setup
        ;;
      2)
        generate_and_show_secrets
        setup_github_actions
        ;;
      3)
        generate_and_show_secrets
        setup_cloudflare_workers
        ;;
      4)
        generate_and_show_secrets
        setup_cloudflare_pages
        ;;
      5)
        generate_and_show_secrets
        setup_local_development
        ;;
      6)
        generate_and_show_secrets
        echo "Save these secrets for later use!"
        ;;
      7)
        check_current_setup
        ;;
      0)
        echo "Exiting..."
        exit 0
        ;;
      *)
        echo -e "${RED}Invalid choice${NC}"
        ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    echo ""
  done
}

# スクリプト実行
main