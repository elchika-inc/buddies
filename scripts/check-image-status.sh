#!/bin/bash

################################################################################
# 画像ステータス確認スクリプト
#
# 使用方法:
#   ./scripts/check-image-status.sh
#
# 説明:
#   ペットの画像ステータスを確認し、統計情報を表示します。
################################################################################

set -e  # エラーで停止

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 設定
API_URL="${API_URL:-https://buddies-api.elchika.app}"
API_KEY="${API_KEY:-admin_sk_super_secure_admin_key_2024}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  ペット画像ステータス確認${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# ペット情報を取得
echo -e "${YELLOW}📊 ペット情報を取得中...${NC}"

PETS_DATA=$(curl -s "${API_URL}/api/pets?limit=200" \
  -H "X-API-Key: ${API_KEY}")

if [ -z "$PETS_DATA" ]; then
  echo -e "${RED}❌ ペット情報の取得に失敗しました${NC}"
  exit 1
fi

# 統計情報を計算
TOTAL_DOGS=$(echo "$PETS_DATA" | jq '[.data.dogs[]] | length')
TOTAL_CATS=$(echo "$PETS_DATA" | jq '[.data.cats[]] | length')
TOTAL_PETS=$((TOTAL_DOGS + TOTAL_CATS))

# スクリーンショット統計
DOGS_WITHOUT_SCREENSHOT=$(echo "$PETS_DATA" | jq '[.data.dogs[]] | map(select(.screenshotCompletedAt == null)) | length')
CATS_WITHOUT_SCREENSHOT=$(echo "$PETS_DATA" | jq '[.data.cats[]] | map(select(.screenshotCompletedAt == null)) | length')
TOTAL_WITHOUT_SCREENSHOT=$((DOGS_WITHOUT_SCREENSHOT + CATS_WITHOUT_SCREENSHOT))

DOGS_WITH_SCREENSHOT=$((TOTAL_DOGS - DOGS_WITHOUT_SCREENSHOT))
CATS_WITH_SCREENSHOT=$((TOTAL_CATS - CATS_WITHOUT_SCREENSHOT))
TOTAL_WITH_SCREENSHOT=$((TOTAL_PETS - TOTAL_WITHOUT_SCREENSHOT))

# WebP統計
DOGS_WITHOUT_WEBP=$(echo "$PETS_DATA" | jq '[.data.dogs[]] | map(select(.hasWebp == false)) | length')
CATS_WITHOUT_WEBP=$(echo "$PETS_DATA" | jq '[.data.cats[]] | map(select(.hasWebp == false)) | length')
TOTAL_WITHOUT_WEBP=$((DOGS_WITHOUT_WEBP + CATS_WITHOUT_WEBP))

DOGS_WITH_WEBP=$((TOTAL_DOGS - DOGS_WITHOUT_WEBP))
CATS_WITH_WEBP=$((TOTAL_CATS - CATS_WITHOUT_WEBP))
TOTAL_WITH_WEBP=$((TOTAL_PETS - TOTAL_WITHOUT_WEBP))

# JPEG統計
DOGS_WITHOUT_JPEG=$(echo "$PETS_DATA" | jq '[.data.dogs[]] | map(select(.hasJpeg == false)) | length')
CATS_WITHOUT_JPEG=$(echo "$PETS_DATA" | jq '[.data.cats[]] | map(select(.hasJpeg == false)) | length')
TOTAL_WITHOUT_JPEG=$((DOGS_WITHOUT_JPEG + CATS_WITHOUT_JPEG))

DOGS_WITH_JPEG=$((TOTAL_DOGS - DOGS_WITHOUT_JPEG))
CATS_WITH_JPEG=$((TOTAL_CATS - CATS_WITHOUT_JPEG))
TOTAL_WITH_JPEG=$((TOTAL_PETS - TOTAL_WITHOUT_JPEG))

# 結果を表示
echo -e "${GREEN}✅ ペット情報を取得しました${NC}"
echo

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  全体統計${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
printf "%-20s %10s %10s %10s\n" "" "犬" "猫" "合計"
echo "────────────────────────────────────────────"
printf "%-20s ${GREEN}%10s${NC} ${GREEN}%10s${NC} ${GREEN}%10s${NC}\n" "ペット総数" "$TOTAL_DOGS" "$TOTAL_CATS" "$TOTAL_PETS"
echo

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  スクリーンショット${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
printf "%-20s %10s %10s %10s\n" "" "犬" "猫" "合計"
echo "────────────────────────────────────────────"
printf "%-20s ${GREEN}%10s${NC} ${GREEN}%10s${NC} ${GREEN}%10s${NC}\n" "取得済み" "$DOGS_WITH_SCREENSHOT" "$CATS_WITH_SCREENSHOT" "$TOTAL_WITH_SCREENSHOT"
printf "%-20s ${RED}%10s${NC} ${RED}%10s${NC} ${RED}%10s${NC}\n" "未取得" "$DOGS_WITHOUT_SCREENSHOT" "$CATS_WITHOUT_SCREENSHOT" "$TOTAL_WITHOUT_SCREENSHOT"

# スクリーンショット完了率を計算
if [ "$TOTAL_PETS" -gt 0 ]; then
  SCREENSHOT_PERCENTAGE=$((TOTAL_WITH_SCREENSHOT * 100 / TOTAL_PETS))
  printf "%-20s ${BLUE}%29s%%${NC}\n" "完了率" "$SCREENSHOT_PERCENTAGE"
fi
echo

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  WebP画像${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
printf "%-20s %10s %10s %10s\n" "" "犬" "猫" "合計"
echo "────────────────────────────────────────────"
printf "%-20s ${GREEN}%10s${NC} ${GREEN}%10s${NC} ${GREEN}%10s${NC}\n" "変換済み" "$DOGS_WITH_WEBP" "$CATS_WITH_WEBP" "$TOTAL_WITH_WEBP"
printf "%-20s ${RED}%10s${NC} ${RED}%10s${NC} ${RED}%10s${NC}\n" "未変換" "$DOGS_WITHOUT_WEBP" "$CATS_WITHOUT_WEBP" "$TOTAL_WITHOUT_WEBP"

# WebP変換率を計算
if [ "$TOTAL_PETS" -gt 0 ]; then
  WEBP_PERCENTAGE=$((TOTAL_WITH_WEBP * 100 / TOTAL_PETS))
  printf "%-20s ${BLUE}%29s%%${NC}\n" "変換率" "$WEBP_PERCENTAGE"
fi
echo

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  JPEG画像${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
printf "%-20s %10s %10s %10s\n" "" "犬" "猫" "合計"
echo "────────────────────────────────────────────"
printf "%-20s ${GREEN}%10s${NC} ${GREEN}%10s${NC} ${GREEN}%10s${NC}\n" "保存済み" "$DOGS_WITH_JPEG" "$CATS_WITH_JPEG" "$TOTAL_WITH_JPEG"
printf "%-20s ${RED}%10s${NC} ${RED}%10s${NC} ${RED}%10s${NC}\n" "未保存" "$DOGS_WITHOUT_JPEG" "$CATS_WITHOUT_JPEG" "$TOTAL_WITHOUT_JPEG"

# JPEG保存率を計算
if [ "$TOTAL_PETS" -gt 0 ]; then
  JPEG_PERCENTAGE=$((TOTAL_WITH_JPEG * 100 / TOTAL_PETS))
  printf "%-20s ${BLUE}%29s%%${NC}\n" "保存率" "$JPEG_PERCENTAGE"
fi
echo

# 推奨アクション
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  推奨アクション${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$TOTAL_WITHOUT_SCREENSHOT" -gt 0 ]; then
  echo -e "${YELLOW}📸 スクリーンショットが必要なペット: ${TOTAL_WITHOUT_SCREENSHOT}件${NC}"
  echo -e "   実行: ${GREEN}./scripts/trigger-screenshot.sh ${TOTAL_WITHOUT_SCREENSHOT}${NC}"
  echo
fi

if [ "$TOTAL_WITHOUT_WEBP" -gt 0 ]; then
  echo -e "${YELLOW}🖼️  WebP変換が必要なペット: ${TOTAL_WITHOUT_WEBP}件${NC}"
  echo -e "   実行: ${GREEN}./scripts/trigger-conversion.sh missing-webp ${TOTAL_WITHOUT_WEBP}${NC}"
  echo
fi

if [ "$TOTAL_WITHOUT_SCREENSHOT" -eq 0 ] && [ "$TOTAL_WITHOUT_WEBP" -eq 0 ]; then
  echo -e "${GREEN}✅ 全てのペットに画像があります！${NC}"
  echo
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# 画像がないペットのIDを表示（オプション）
if [ "$TOTAL_WITHOUT_SCREENSHOT" -gt 0 ] && [ "$TOTAL_WITHOUT_SCREENSHOT" -le 10 ]; then
  echo -e "${YELLOW}📋 スクリーンショットが必要なペット:${NC}"
  echo "$PETS_DATA" | jq -r '[.data.dogs[], .data.cats[]] | map(select(.screenshotCompletedAt == null)) | .[] | "  - \(.id) (\(.type)): \(.name)"'
  echo
fi
