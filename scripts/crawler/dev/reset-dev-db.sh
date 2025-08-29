#!/bin/bash
# ==========================================
# PawMatch Crawler 開発環境DB リセット
# ==========================================
# 開発用データベースを完全にリセットするスクリプト

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🗑️  開発用データベースをリセットします...${NC}"

# 確認プロンプト
read -p "本当にデータベースをリセットしますか？ [y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ キャンセルしました${NC}"
    exit 0
fi

# wrangler.dev.tomlの存在確認
WRANGLER_CONFIG="../../../crawler/wrangler.dev.toml"
if [ ! -f "$WRANGLER_CONFIG" ]; then
    echo -e "${RED}❌ wrangler.dev.toml が見つかりません。${NC}"
    exit 1
fi

echo -e "${YELLOW}🧹 全テーブルを削除中...${NC}"

# 全テーブルを取得して削除
TABLES=$(wrangler d1 execute pawmatch-db-dev --local --config "$WRANGLER_CONFIG" --command="SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence';" --json 2>/dev/null | jq -r '.[0].results[].name' 2>/dev/null || echo "")

if [ -n "$TABLES" ]; then
    for table in $TABLES; do
        echo -e "${YELLOW}  📋 削除中: $table${NC}"
        wrangler d1 execute pawmatch-db-dev --local --config "$WRANGLER_CONFIG" --command="DROP TABLE IF EXISTS $table;" >/dev/null 2>&1
    done
    echo -e "${GREEN}✅ 全テーブル削除完了${NC}"
else
    echo -e "${YELLOW}⚠️  削除するテーブルがありません${NC}"
fi

# Wranglerの状態をクリア
echo -e "${YELLOW}🧹 Wranglerキャッシュをクリア中...${NC}"
rm -rf ../../../crawler/.wrangler/state 2>/dev/null || true
echo -e "${GREEN}✅ キャッシュクリア完了${NC}"

# スキーマを再適用
echo -e "${YELLOW}📋 スキーマを再適用中...${NC}"
wrangler d1 execute pawmatch-db-dev --local --config "$WRANGLER_CONFIG" --file=./schema-dev.sql
echo -e "${GREEN}✅ スキーマ再適用完了${NC}"

# 結果確認
echo -e "${YELLOW}🔍 テーブル一覧を確認中...${NC}"
TABLES_AFTER=$(wrangler d1 execute pawmatch-db-dev --local --config "$WRANGLER_CONFIG" --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
echo "$TABLES_AFTER"

echo -e "\n${GREEN}🎉 データベースリセット完了！${NC}"
echo -e "${BLUE}💡 Crawlerを再起動して動作確認してください${NC}"
echo -e "${YELLOW}   npm run dev${NC}"