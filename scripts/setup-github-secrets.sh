#!/bin/bash

# GitHub Actions Secretsを自動設定するスクリプト
# GitHub CLIが必要: brew install gh

set -e

echo "🔐 GitHub Actions Secrets Setup"
echo "================================"
echo ""

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# GitHub CLIの確認
if ! command -v gh >/dev/null 2>&1; then
  echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
  echo ""
  echo "Install with:"
  echo "  macOS: brew install gh"
  echo "  Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
  echo ""
  echo "Then authenticate with: gh auth login"
  exit 1
fi

# GitHub認証確認
if ! gh auth status >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️ Not authenticated with GitHub${NC}"
  echo "Please run: gh auth login"
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

# リポジトリ情報を取得
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
  echo -e "${YELLOW}Enter your GitHub repository (e.g., username/buddies):${NC}"
  read -r REPO
fi

echo -e "${BLUE}📦 Repository: $REPO${NC}"
echo ""

# 既存のシークレットを確認
echo "Checking existing secrets..."
EXISTING_SECRETS=$(gh secret list --repo "$REPO" 2>/dev/null || echo "")

# シークレットを設定する関数
set_secret() {
  local name=$1
  local value=$2
  
  if echo "$EXISTING_SECRETS" | grep -q "^$name"; then
    echo -e "${YELLOW}  ⚠️ $name already exists. Updating...${NC}"
  else
    echo -e "${GREEN}  ✨ Creating $name...${NC}"
  fi
  
  echo "$value" | gh secret set "$name" --repo "$REPO"
}

# シークレットの設定
echo ""
echo "Setting GitHub Actions secrets..."
echo "---------------------------------"

# API認証用
if [ -n "$API_SECRET_KEY" ]; then
  set_secret "API_SECRET_KEY" "$API_SECRET_KEY"
else
  echo -e "${RED}  ❌ API_SECRET_KEY not found in .env.local${NC}"
fi

if [ -n "$API_ADMIN_SECRET" ]; then
  set_secret "API_ADMIN_SECRET" "$API_ADMIN_SECRET"
else
  echo -e "${RED}  ❌ API_ADMIN_SECRET not found in .env.local${NC}"
fi

# API URL
set_secret "API_URL" "${API_URL:-https://buddies-api.elchika.app}"

# R2設定（既存の値を保持）
echo ""
echo "Checking R2 configuration..."
if [ -n "$R2_ACCOUNT_ID" ]; then
  set_secret "R2_ACCOUNT_ID" "$R2_ACCOUNT_ID"
fi
if [ -n "$R2_ACCESS_KEY_ID" ]; then
  set_secret "R2_ACCESS_KEY_ID" "$R2_ACCESS_KEY_ID"
fi
if [ -n "$R2_SECRET_ACCESS_KEY" ]; then
  set_secret "R2_SECRET_ACCESS_KEY" "$R2_SECRET_ACCESS_KEY"
fi
if [ -n "$R2_BUCKET_NAME" ]; then
  set_secret "R2_BUCKET_NAME" "$R2_BUCKET_NAME"
fi

# 結果を表示
echo ""
echo -e "${GREEN}✅ GitHub Actions secrets configured!${NC}"
echo ""
echo "Current secrets:"
gh secret list --repo "$REPO"

echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Verify secrets at: https://github.com/$REPO/settings/secrets/actions"
echo "2. Run a GitHub Actions workflow to test"