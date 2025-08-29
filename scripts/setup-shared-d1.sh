#!/bin/bash

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Setting up shared D1 database for local development${NC}"
echo "================================================="

# プロジェクトルートディレクトリを取得
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# APIのD1ディレクトリ（マスターとなるディレクトリ）
API_D1_DIR="$PROJECT_ROOT/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"

# APIのD1ディレクトリが存在するか確認
if [ ! -d "$API_D1_DIR" ]; then
    echo -e "${YELLOW}⚠️  API D1 directory doesn't exist yet.${NC}"
    echo -e "${YELLOW}   Starting API service to create database...${NC}"
    
    # APIを一時的に起動してデータベースを作成
    cd api
    timeout 5 npm run dev > /dev/null 2>&1 || true
    cd ..
    
    # ディレクトリが作成されるまで少し待つ
    sleep 2
    
    if [ ! -d "$API_D1_DIR" ]; then
        echo -e "${RED}❌ Failed to create API D1 directory${NC}"
        echo -e "${YELLOW}   Please run 'cd api && npm run dev' first${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ API D1 directory found${NC}"

# 各サービスのシンボリックリンクを作成
SERVICES=("crawler" "converter" "dispatcher")

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_D1_DIR="$PROJECT_ROOT/$SERVICE/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
    SERVICE_WRANGLER_DIR="$PROJECT_ROOT/$SERVICE/.wrangler/state/v3/d1"
    
    echo -e "\n${BLUE}📦 Setting up $SERVICE...${NC}"
    
    # .wrangler/state/v3/d1 ディレクトリを作成
    mkdir -p "$SERVICE_WRANGLER_DIR"
    
    # 既存のディレクトリまたはリンクを削除
    if [ -e "$SERVICE_D1_DIR" ] || [ -L "$SERVICE_D1_DIR" ]; then
        echo -e "   Removing existing D1 directory..."
        rm -rf "$SERVICE_D1_DIR"
    fi
    
    # シンボリックリンクを作成
    ln -s "$API_D1_DIR" "$SERVICE_D1_DIR"
    
    if [ -L "$SERVICE_D1_DIR" ]; then
        echo -e "${GREEN}   ✅ Symlink created for $SERVICE${NC}"
    else
        echo -e "${RED}   ❌ Failed to create symlink for $SERVICE${NC}"
    fi
done

# 検証
echo -e "\n${BLUE}🔍 Verifying setup...${NC}"
echo "================================================="

# データベースファイルの存在確認
DB_FILE=$(find "$API_D1_DIR" -name "*.sqlite" -not -name "*-*" 2>/dev/null | head -1)
if [ -n "$DB_FILE" ]; then
    echo -e "${GREEN}✅ Database file found: $(basename $DB_FILE)${NC}"
    
    # テーブル数を確認
    if command -v sqlite3 &> /dev/null; then
        TABLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo 0)
        echo -e "${GREEN}   Tables: $TABLE_COUNT${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No database file found yet (will be created on first run)${NC}"
fi

# 各サービスのシンボリックリンクを確認
echo -e "\n${BLUE}📋 Symlink status:${NC}"
for SERVICE in "${SERVICES[@]}"; do
    SERVICE_D1_DIR="$PROJECT_ROOT/$SERVICE/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
    if [ -L "$SERVICE_D1_DIR" ]; then
        echo -e "${GREEN}   ✅ $SERVICE -> api (linked)${NC}"
    else
        echo -e "${RED}   ❌ $SERVICE (not linked)${NC}"
    fi
done

echo -e "\n${GREEN}✨ Shared D1 database setup complete!${NC}"
echo -e "${BLUE}   All services now share: api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject${NC}"
echo -e "\n${YELLOW}📝 Next steps:${NC}"
echo -e "   1. Run ${GREEN}npm run dev:all${NC} to start all services"
echo -e "   2. All services will use the same D1 database"
echo -e "\n${YELLOW}⚠️  Note:${NC} This setup is for local development only."
echo -e "   Production uses the same database_id automatically."