#!/bin/bash

################################################################################
# スクリーンショット取得手動トリガースクリプト
#
# 使用方法:
#   ./scripts/trigger-screenshot.sh [件数]
#   ./scripts/trigger-screenshot.sh 50
#
# 説明:
#   画像がないペットのスクリーンショットを手動でトリガーします。
#   APIを使用してDispatcher経由でGitHub Actionsワークフローを実行します。
################################################################################

set -e  # エラーで停止

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
API_URL="${API_URL:-https://buddies-api.elchika.app}"
API_KEY="${API_KEY:-admin_sk_super_secure_admin_key_2024}"
ADMIN_SECRET="${ADMIN_SECRET:-admin_sk_super_secure_admin_key_2024}"

# デフォルトのlimit
DEFAULT_LIMIT=50

# 引数からlimitを取得（デフォルト: 50）
LIMIT=${1:-$DEFAULT_LIMIT}

# limitの検証
if ! [[ "$LIMIT" =~ ^[0-9]+$ ]]; then
  echo -e "${RED}❌ エラー: limitは数値である必要があります${NC}"
  echo "使用方法: $0 [件数]"
  exit 1
fi

if [ "$LIMIT" -gt 200 ]; then
  echo -e "${YELLOW}⚠️  警告: limit が大きすぎます (最大200推奨)${NC}"
  read -p "続行しますか? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 1
  fi
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  スクリーンショット取得トリガー${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# ステップ1: 画像がないペット数を確認
echo -e "${YELLOW}📊 画像がないペット数を確認中...${NC}"

PETS_COUNT=$(curl -s "${API_URL}/api/pets?limit=200" \
  -H "X-API-Key: ${API_KEY}" | \
  jq '[.data.dogs[], .data.cats[]] | map(select(.screenshotCompletedAt == null)) | length' 2>/dev/null)

if [ -z "$PETS_COUNT" ] || [ "$PETS_COUNT" = "null" ]; then
  echo -e "${RED}❌ ペット数の取得に失敗しました${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 画像がないペット: ${PETS_COUNT}件${NC}"
echo

if [ "$PETS_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ 全てのペットに画像があります${NC}"
  exit 0
fi

# 実際に処理する件数を計算
ACTUAL_LIMIT=$LIMIT
if [ "$PETS_COUNT" -lt "$LIMIT" ]; then
  ACTUAL_LIMIT=$PETS_COUNT
fi

echo -e "${BLUE}📸 ${ACTUAL_LIMIT}件のペットのスクリーンショットを取得します${NC}"
echo

# ステップ2: スクリーンショットをトリガー
echo -e "${YELLOW}🚀 スクリーンショット処理をトリガー中...${NC}"

RESPONSE=$(curl -s -X POST "${API_URL}/api/admin/trigger-screenshot" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -H "X-Admin-Secret: ${ADMIN_SECRET}" \
  -d "{\"limit\": ${LIMIT}}")

# レスポンスをパース
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)

if [ "$SUCCESS" != "true" ]; then
  echo -e "${RED}❌ エラー: スクリーンショットのトリガーに失敗しました${NC}"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

# 成功情報を表示
BATCH_ID=$(echo "$RESPONSE" | jq -r '.data.batchId')
STRATEGY=$(echo "$RESPONSE" | jq -r '.data.strategy')
PET_COUNT=$(echo "$RESPONSE" | jq -r '.data.petCount')

echo -e "${GREEN}✅ スクリーンショット処理がトリガーされました！${NC}"
echo
echo -e "${BLUE}📋 処理情報:${NC}"
echo -e "  Batch ID: ${GREEN}${BATCH_ID}${NC}"
echo -e "  戦略: ${GREEN}${STRATEGY}${NC}"
echo -e "  ペット数: ${GREEN}${PET_COUNT}件${NC}"
echo

# ステップ3: GitHub Actionsの状況を確認
echo -e "${YELLOW}🔍 GitHub Actionsの実行状況を確認中...${NC}"

if command -v gh &> /dev/null; then
  sleep 3  # GitHub Actionsが開始されるまで少し待つ

  echo
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  最近のワークフロー実行${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  gh run list --workflow=screenshot-capture.yml --limit 3 2>/dev/null || echo "ワークフロー情報の取得に失敗しました"
  echo

  # 最新のRUN_IDを取得
  LATEST_RUN_ID=$(gh run list --workflow=screenshot-capture.yml --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null)

  if [ -n "$LATEST_RUN_ID" ]; then
    echo -e "${YELLOW}💡 ヒント: 以下のコマンドでリアルタイムログを監視できます:${NC}"
    echo -e "  ${GREEN}gh run watch ${LATEST_RUN_ID}${NC}"
    echo
    echo -e "${YELLOW}💡 ワークフローの詳細を確認:${NC}"
    echo -e "  ${GREEN}gh run view ${LATEST_RUN_ID}${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  GitHub CLIがインストールされていません${NC}"
  echo "GitHub Actionsの状況は https://github.com/elchika-inc/pawmatch/actions で確認してください"
fi

echo
echo -e "${GREEN}✅ 完了しました！${NC}"
echo
