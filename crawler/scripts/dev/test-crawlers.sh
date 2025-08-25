#!/bin/bash
# ==========================================
# PawMatch Crawler テスト実行スクリプト
# ==========================================
# 開発環境で各クローラーの動作をテストします

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# クローラーのポートを自動検出
detect_port() {
    # wrangler dev の出力から ポート番号を検出
    local port=$(lsof -ti:8787 2>/dev/null || lsof -ti tcp | grep LISTEN | head -1 | cut -d: -f2 2>/dev/null || echo "")
    
    # プロセス一覧からwrangler devのポートを検出
    if [ -z "$port" ]; then
        port=$(ps aux | grep "wrangler dev" | grep -v grep | grep -o "localhost:[0-9]*" | cut -d: -f2 | head -1 || echo "")
    fi
    
    # デフォルトポート
    if [ -z "$port" ]; then
        port="8787"
    fi
    
    echo $port
}

PORT="58250"  # 現在起動中の実際のポート
BASE_URL="http://localhost:$PORT"

echo -e "${BLUE}🧪 PawMatch Crawler テストを開始します${NC}"
echo -e "${YELLOW}📍 テスト対象: $BASE_URL${NC}"
echo ""

# ヘルスチェック
echo -e "${YELLOW}❤️  ヘルスチェック...${NC}"
if curl -s "$BASE_URL/" > /dev/null; then
    echo -e "${GREEN}✅ Crawler service is healthy${NC}"
else
    echo -e "${RED}❌ Crawler service is not responding${NC}"
    echo -e "${YELLOW}💡 まず npm run dev でサーバーを起動してください${NC}"
    exit 1
fi

# 利用可能なソースを確認
echo -e "\n${YELLOW}📋 利用可能なクローラー一覧...${NC}"
SOURCES=$(curl -s "$BASE_URL/crawl/status" | jq -r '.availableSources[]' 2>/dev/null || echo "pet-home")
echo -e "${BLUE}対応サイト: $(echo $SOURCES | tr '\n' ' ')${NC}"

# 各ソースでテスト実行
TEST_LIMIT=2
TOTAL_TESTS=0
PASSED_TESTS=0

echo -e "\n${YELLOW}🚀 クローラーテストを実行中...${NC}"

for source in $SOURCES; do
    echo -e "\n${BLUE}━━━ $source のテスト ━━━${NC}"
    
    for pet_type in "cat" "dog"; do
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        
        echo -e "${YELLOW}🐱 $source から $pet_type を $TEST_LIMIT 件取得中...${NC}"
        
        # クロール実行
        RESULT=$(curl -s -X POST "$BASE_URL/crawl/$source/$pet_type?limit=$TEST_LIMIT" || echo '{"error": "request failed"}')
        
        # 結果解析
        SUCCESS=$(echo "$RESULT" | jq -r '.result.success // false' 2>/dev/null)
        NEW_PETS=$(echo "$RESULT" | jq -r '.result.newPets // 0' 2>/dev/null)
        UPDATED_PETS=$(echo "$RESULT" | jq -r '.result.updatedPets // 0' 2>/dev/null)
        ERRORS=$(echo "$RESULT" | jq -r '.result.errors // []' 2>/dev/null)
        
        if [ "$SUCCESS" = "true" ]; then
            echo -e "${GREEN}  ✅ 成功: 新規 $NEW_PETS 件、更新 $UPDATED_PETS 件${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}  ❌ 失敗${NC}"
            if [ "$ERRORS" != "[]" ] && [ "$ERRORS" != "null" ]; then
                echo -e "${RED}     エラー: $ERRORS${NC}"
            fi
        fi
        
        # 少し待機
        sleep 1
    done
done

# テスト結果表示
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📊 テスト結果: $PASSED_TESTS/$TOTAL_TESTS 通過${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 全てのテストが成功しました！${NC}"
else
    echo -e "${YELLOW}⚠️  一部のテストが失敗しました${NC}"
fi

# データベース内容確認
echo -e "\n${YELLOW}🗄️  データベース確認...${NC}"
DB_PETS=$(wrangler d1 execute pawmatch-db-dev --local --config wrangler.dev.toml --command="SELECT COUNT(*) as count FROM pets;" --json 2>/dev/null | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")
echo -e "${BLUE}総ペット数: $DB_PETS 件${NC}"

if [ "$DB_PETS" -gt 0 ]; then
    echo -e "${YELLOW}🔍 最新のペット情報:${NC}"
    RECENT_PETS=$(wrangler d1 execute pawmatch-db-dev --local --config wrangler.dev.toml --command="SELECT id, type, name FROM pets ORDER BY created_at DESC LIMIT 5;" --json 2>/dev/null || echo '[]')
    echo "$RECENT_PETS" | jq -r '.[0].results[]? | "  - \(.id) (\(.type)): \(.name)"' 2>/dev/null || echo "  データ取得エラー"
fi

# クロール状態確認
echo -e "\n${YELLOW}📈 クローラー状態:${NC}"
curl -s "$BASE_URL/crawl/status" | jq -r '.statuses[]? | "  \(.source_id)/\(.pet_type): \(.total_processed) 件処理済み"' 2>/dev/null || echo "  状態情報取得エラー"

echo -e "\n${GREEN}🏁 テスト完了${NC}"

# 使用可能なコマンドヒント
echo -e "\n${BLUE}💡 その他の便利なコマンド:${NC}"
echo -e "${YELLOW}  # 特定サイトの状態確認${NC}"
echo "  curl \"$BASE_URL/crawl/status/pet-home/cat\""
echo ""
echo -e "${YELLOW}  # ペット一覧取得（API経由）${NC}"
echo "  curl \"http://localhost:8787/pets/cat?limit=5\""
echo ""
echo -e "${YELLOW}  # 差分モード無効でクロール${NC}"
echo "  curl -X POST \"$BASE_URL/crawl/pet-home/cat?limit=5&differential=false\""