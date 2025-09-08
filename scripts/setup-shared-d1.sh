#!/bin/bash

# PawMatch - APIとCrawler間のD1データベース共有設定スクリプト
# wrangler v4対応
# 
# 概要: APIとCrawlerが同じD1データベースを参照できるよう、
#      ローカル開発環境でシンボリックリンクを作成します

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Setting up shared D1 database between API and Crawler (wrangler v4)${NC}"
echo "================================================="

# プロジェクトルートディレクトリを取得
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# APIのD1ディレクトリ（マスターとなるディレクトリ）
# wrangler v4でのパス構造
API_D1_DIR="$PROJECT_ROOT/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
API_DB_FILE="$API_D1_DIR/database.sqlite"

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

# Crawlerのシンボリックリンクを作成
echo -e "\n${BLUE}📦 Setting up Crawler to share API's D1 database...${NC}"

CRAWLER_D1_DIR="$PROJECT_ROOT/crawler/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
CRAWLER_WRANGLER_DIR="$PROJECT_ROOT/crawler/.wrangler/state/v3/d1"

# .wrangler/state/v3/d1 ディレクトリを作成
mkdir -p "$CRAWLER_WRANGLER_DIR"

# 既存のディレクトリまたはリンクを削除
if [ -e "$CRAWLER_D1_DIR" ] || [ -L "$CRAWLER_D1_DIR" ]; then
    echo -e "   Removing existing Crawler D1 directory..."
    rm -rf "$CRAWLER_D1_DIR"
fi

# シンボリックリンクを作成
ln -s "$API_D1_DIR" "$CRAWLER_D1_DIR"

if [ -L "$CRAWLER_D1_DIR" ]; then
    echo -e "${GREEN}   ✅ Symlink created: Crawler now shares API's D1 database${NC}"
else
    echo -e "${RED}   ❌ Failed to create symlink for Crawler${NC}"
    exit 1
fi

# 検証
echo -e "\n${BLUE}🔍 Verifying setup (wrangler v4)...${NC}"
echo "================================================="

# wrangler v4では database.sqlite がデフォルトのファイル名
if [ -f "$API_DB_FILE" ]; then
    echo -e "${GREEN}✅ Database file found: database.sqlite${NC}"
    
    # テーブル数を確認
    if command -v sqlite3 &> /dev/null; then
        TABLE_COUNT=$(sqlite3 "$API_DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo 0)
        echo -e "${GREEN}   Tables: $TABLE_COUNT${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No database file found yet (will be created on first run)${NC}"
fi

# シンボリックリンクの確認
echo -e "\n${BLUE}📋 Database sharing status:${NC}"
if [ -L "$CRAWLER_D1_DIR" ]; then
    echo -e "${GREEN}   ✅ Crawler -> API (linked)${NC}"
    echo -e "${GREEN}   Both services share the same D1 database${NC}"
else
    echo -e "${RED}   ❌ Crawler (not linked)${NC}"
    echo -e "${RED}   Services are using separate databases${NC}"
fi

echo -e "\n${GREEN}✨ API-Crawler D1 database sharing setup complete! (wrangler v4)${NC}"
echo -e "${BLUE}   Shared database location: api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject${NC}"
echo -e "\n${YELLOW}📝 Next steps:${NC}"
echo -e "   1. Run ${GREEN}npm run dev:all${NC} to start all services"
echo -e "   2. API and Crawler will share the same D1 database"
echo -e "   3. Run migrations with ${GREEN}npm run api:db:migrate${NC}"
echo -e "\n${YELLOW}⚠️  Important notes:${NC}"
echo -e "   • This setup is for local development only"
echo -e "   • Production uses the same database_id (b397c3a4-3ee4-4259-b004-6de4488e921f)"
echo -e "   • Dispatcher and Converter do not use D1 database"
echo -e "\n${BLUE}🚀 Testing:${NC}"
echo -e "   1. ${GREEN}cd api && npm run dev${NC} (port: 8787)"
echo -e "   2. ${GREEN}cd crawler && npm run dev${NC} (port: 9787)"
echo -e "   3. Both services should access the same pets and crawler_states tables"