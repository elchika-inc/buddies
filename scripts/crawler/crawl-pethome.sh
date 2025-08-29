#!/bin/bash

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# デフォルト値
LIMIT=10
TYPE=""
# 固定ポート9787を使用
BASE_URL="${CRAWLER_URL:-http://localhost:9787}"

# ヘルプ表示
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --type TYPE     Pet type: 'dog', 'cat', or 'both' (default: both)"
    echo "  -l, --limit LIMIT   Number of items to crawl (default: 10)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Crawl both dogs and cats with limit 10"
    echo "  $0 -t cat -l 20       # Crawl 20 cats"
    echo "  $0 --type dog         # Crawl dogs with default limit"
}

# 引数の解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            TYPE="$2"
            shift 2
            ;;
        -l|--limit)
            LIMIT="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# クローラーサーバーの確認
check_server() {
    echo -e "${BLUE}🔍 Checking crawler server...${NC}"
    if curl -s "${BASE_URL}/" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Crawler server is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Crawler server is not running${NC}"
        echo -e "${YELLOW}Please start the server with: npm run dev${NC}"
        exit 1
    fi
}

# クロール実行
crawl_pets() {
    local pet_type=$1
    local limit=$2
    
    echo -e "${BLUE}🐾 Crawling ${pet_type}s (limit: ${limit})...${NC}"
    
    response=$(curl -s -X POST "${BASE_URL}/crawl/pet-home/${pet_type}?limit=${limit}")
    
    if echo "$response" | grep -q '"error"'; then
        echo -e "${RED}❌ Failed to crawl ${pet_type}s${NC}"
        echo "$response" | jq '.'
        return 1
    else
        echo -e "${GREEN}✅ Successfully crawled ${pet_type}s${NC}"
        echo "$response" | jq '.result'
        return 0
    fi
}

# データ確認
show_stats() {
    echo -e "\n${BLUE}📊 Fetching crawl statistics...${NC}"
    curl -s "${BASE_URL}/crawl/status" | jq '.'
    
    echo -e "\n${BLUE}📋 Recent pets in database:${NC}"
    curl -s "${BASE_URL}/pets?limit=5" | jq '.pets[] | {id, type, name, prefecture}'
}

# メイン処理
main() {
    echo -e "${GREEN}🚀 PetHome Crawler${NC}"
    echo "================================"
    
    # サーバー確認
    check_server
    
    # クロール実行
    case "$TYPE" in
        dog)
            crawl_pets "dog" "$LIMIT"
            ;;
        cat)
            crawl_pets "cat" "$LIMIT"
            ;;
        both|"")
            crawl_pets "cat" "$LIMIT"
            crawl_pets "dog" "$LIMIT"
            ;;
        *)
            echo -e "${RED}Invalid type: $TYPE${NC}"
            echo "Use 'dog', 'cat', or 'both'"
            exit 1
            ;;
    esac
    
    # 統計表示
    show_stats
    
    echo -e "\n${GREEN}✨ Crawling completed!${NC}"
}

main