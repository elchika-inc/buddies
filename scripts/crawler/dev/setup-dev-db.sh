#!/bin/bash
# ==========================================
# PawMatch Crawler 開発環境セットアップ
# ==========================================
# 開発用データベースの初期化・設定を行うスクリプト

set -e  # エラー時に停止

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 PawMatch Crawler 開発環境セットアップを開始します...${NC}"

# 現在のディレクトリをチェック
WRANGLER_CONFIG="../../../crawler/wrangler.dev.toml"
if [ ! -f "$WRANGLER_CONFIG" ]; then
    echo -e "${RED}❌ wrangler.dev.toml が見つかりません。${NC}"
    exit 1
fi

# 1. D1データベースの状態確認
echo -e "${YELLOW}📊 データベース状態を確認中...${NC}"
DB_STATUS=$(wrangler d1 execute pawmatch-db-dev --local --config "$WRANGLER_CONFIG" --command="SELECT name FROM sqlite_master WHERE type='table' LIMIT 1;" 2>&1 || true)

if echo "$DB_STATUS" | grep -q "no such table"; then
    echo -e "${YELLOW}⚠️  データベースが空です。初期スキーマを適用します。${NC}"
    NEED_SCHEMA=true
else
    echo -e "${GREEN}✅ データベースが存在します。${NC}"
    NEED_SCHEMA=false
fi

# 2. スキーマ適用
if [ "$NEED_SCHEMA" = true ]; then
    echo -e "${YELLOW}📋 開発用スキーマを適用中...${NC}"
    wrangler d1 execute pawmatch-db-dev --local --config "$WRANGLER_CONFIG" --file=./schema-dev.sql
    echo -e "${GREEN}✅ スキーマ適用完了${NC}"
fi

# 3. テーブル確認
echo -e "${YELLOW}🔍 テーブル一覧を確認中...${NC}"
TABLES=$(wrangler d1 execute pawmatch-db-dev --local --config "$WRANGLER_CONFIG" --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
echo "$TABLES"

# 4. クローラーの動作確認
echo -e "${YELLOW}🧪 クローラーの起動テスト中...${NC}"
if pgrep -f "wrangler dev" > /dev/null; then
    echo -e "${GREEN}✅ Wrangler dev server は既に動作中です${NC}"
    EXISTING_PORT=$(lsof -ti:8787 2>/dev/null || echo "")
    if [ -n "$EXISTING_PORT" ]; then
        echo -e "${BLUE}🌐 サーバーは http://localhost:8787 で動作中${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Wrangler dev server が起動していません${NC}"
    echo -e "${BLUE}💡 手動で起動してください: npm run dev${NC}"
fi

# 5. 使用可能なコマンド一覧表示
echo -e "\n${GREEN}🎉 セットアップ完了！${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 開発用コマンド一覧:${NC}"
echo ""
echo -e "${BLUE}🚀 Crawlerを起動:${NC}"
echo "  npm run dev"
echo ""
echo -e "${BLUE}🧪 テストクロール:${NC}"
echo "  curl -X POST \"http://localhost:PORT/crawl/pet-home/cat?limit=5\""
echo ""
echo -e "${BLUE}📊 クロール状態確認:${NC}"
echo "  curl \"http://localhost:PORT/crawl/status\""
echo ""
echo -e "${BLUE}🗄️ データベース操作:${NC}"
echo "  # テーブル確認"
echo "  wrangler d1 execute pawmatch-db-dev --local --config wrangler.dev.toml --command=\"SELECT name FROM sqlite_master WHERE type='table';\""
echo ""
echo "  # ペット一覧"
echo "  wrangler d1 execute pawmatch-db-dev --local --config wrangler.dev.toml --command=\"SELECT id, name, type FROM pets LIMIT 10;\""
echo ""
echo -e "${BLUE}🧹 データベースリセット:${NC}"
echo "  ./scripts/dev/reset-dev-db.sh"
echo ""
echo -e "${RED}⚠️  注意: これは開発環境専用です${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"