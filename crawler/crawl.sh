#!/bin/bash

# PawMatch クローラー実行スクリプト
# 使用方法: ./crawl.sh [オプション]

# カラー出力の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

# ヘルプ表示
show_help() {
    echo -e "${BLUE}🐱 PawMatch クローラー実行スクリプト${NC}\n"
    echo "使用方法:"
    echo "  ./crawl.sh [コマンド] [オプション]"
    echo ""
    echo "コマンド:"
    echo "  run          通常実行（デフォルト）"
    echo "  force        強制実行（重複チェック無視）"
    echo "  reset        状態リセット後に実行"
    echo "  dry          ドライラン（実際の取得なし）"
    echo "  status       現在の状態を表示"
    echo "  clean        データをクリーンアップ"
    echo "  help         このヘルプを表示"
    echo ""
    echo "オプション:"
    echo "  -l <数値>    取得件数を指定（デフォルト: 20）"
    echo ""
    echo "例:"
    echo "  ./crawl.sh              # 通常実行"
    echo "  ./crawl.sh run -l 10    # 10件取得"
    echo "  ./crawl.sh force        # 強制実行"
    echo "  ./crawl.sh status       # 状態確認"
}

# 状態表示
show_status() {
    echo -e "${BLUE}📊 クローラー状態${NC}\n"
    
    if [ -f "data/crawler-state.json" ]; then
        echo -e "${GREEN}状態ファイル:${NC}"
        cat data/crawler-state.json | python3 -m json.tool | head -20
    else
        echo -e "${YELLOW}状態ファイルが見つかりません${NC}"
    fi
    
    echo ""
    
    if [ -f "data/accumulated-cats.json" ]; then
        COUNT=$(cat data/accumulated-cats.json | python3 -c "import json, sys; print(len(json.load(sys.stdin)))")
        echo -e "${GREEN}蓄積データ:${NC} ${COUNT}件"
    else
        echo -e "${YELLOW}データファイルが見つかりません${NC}"
    fi
    
    echo ""
    
    if [ -d "data/images" ]; then
        IMG_COUNT=$(ls -1 data/images/*.jpg 2>/dev/null | wc -l)
        echo -e "${GREEN}保存画像:${NC} ${IMG_COUNT}枚"
    fi
}

# データクリーンアップ
clean_data() {
    echo -e "${YELLOW}⚠️ データをクリーンアップしますか？ (y/N)${NC}"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        # バックアップ作成
        if [ -f "data/crawler-state.json" ]; then
            cp data/crawler-state.json "data/crawler-state-backup-$(date +%Y%m%d%H%M%S).json"
            echo -e "${GREEN}✅ 状態ファイルをバックアップしました${NC}"
        fi
        
        if [ -f "data/accumulated-cats.json" ]; then
            cp data/accumulated-cats.json "data/accumulated-cats-backup-$(date +%Y%m%d%H%M%S).json"
            echo -e "${GREEN}✅ データファイルをバックアップしました${NC}"
        fi
        
        # クリーンアップ
        rm -f data/crawler-state.json
        rm -f data/accumulated-cats.json
        echo -e "${GREEN}✅ データをクリーンアップしました${NC}"
    else
        echo -e "${BLUE}キャンセルしました${NC}"
    fi
}

# メイン処理
case "$1" in
    help|--help|-h)
        show_help
        ;;
    status)
        show_status
        ;;
    clean)
        clean_data
        ;;
    force)
        shift
        echo -e "${YELLOW}🚀 強制実行モード${NC}"
        npm run crawl:force -- "$@"
        ;;
    reset)
        shift
        echo -e "${YELLOW}🔄 リセット実行モード${NC}"
        npm run crawl:reset -- "$@"
        ;;
    dry)
        shift
        echo -e "${BLUE}🔍 ドライランモード${NC}"
        npm run crawl:dry -- "$@"
        ;;
    run|"")
        shift
        echo -e "${GREEN}🐱 通常実行モード${NC}"
        npm run crawl -- "$@"
        ;;
    *)
        echo -e "${RED}❌ 不明なコマンド: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac