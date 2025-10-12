#!/bin/bash

################################################################################
# 画像変換手動トリガースクリプト
#
# 使用方法:
#   ./scripts/trigger-conversion.sh [モード] [件数]
#   ./scripts/trigger-conversion.sh all 50
#   ./scripts/trigger-conversion.sh missing-webp 30
#
# モード:
#   all           - 全ての画像を変換（デフォルト）
#   missing-webp  - WebPがない画像のみ変換
#   missing-jpeg  - JPEGがない画像のみ変換
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

# デフォルト値
DEFAULT_MODE="all"
DEFAULT_LIMIT=50

# 引数を解析
MODE=${1:-$DEFAULT_MODE}
LIMIT=${2:-$DEFAULT_LIMIT}

# モードの検証
if [[ ! "$MODE" =~ ^(all|missing-webp|missing-jpeg)$ ]]; then
  echo -e "${RED}❌ エラー: 無効なモードです${NC}"
  echo "使用可能なモード: all, missing-webp, missing-jpeg"
  exit 1
fi

# limitの検証
if ! [[ "$LIMIT" =~ ^[0-9]+$ ]]; then
  echo -e "${RED}❌ エラー: limitは数値である必要があります${NC}"
  echo "使用方法: $0 [モード] [件数]"
  exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  画像変換トリガー${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${BLUE}モード: ${GREEN}${MODE}${NC}"
echo -e "${BLUE}件数: ${GREEN}${LIMIT}${NC}"
echo

# GitHub Actionsワークフローをトリガー
echo -e "${YELLOW}🚀 画像変換ワークフローをトリガー中...${NC}"

if command -v gh &> /dev/null; then
  gh workflow run image-conversion.yml \
    -f conversion_mode="${MODE}" \
    -f limit="${LIMIT}" \
    -f source=manual

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 画像変換ワークフローがトリガーされました！${NC}"
    echo

    # 少し待ってから状況を確認
    sleep 3

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  最近のワークフロー実行${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    gh run list --workflow=image-conversion.yml --limit 3 2>/dev/null || echo "ワークフロー情報の取得に失敗しました"
    echo

    # 最新のRUN_IDを取得
    LATEST_RUN_ID=$(gh run list --workflow=image-conversion.yml --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null)

    if [ -n "$LATEST_RUN_ID" ]; then
      echo -e "${YELLOW}💡 ヒント: 以下のコマンドでリアルタイムログを監視できます:${NC}"
      echo -e "  ${GREEN}gh run watch ${LATEST_RUN_ID}${NC}"
      echo
      echo -e "${YELLOW}💡 ワークフローの詳細を確認:${NC}"
      echo -e "  ${GREEN}gh run view ${LATEST_RUN_ID}${NC}"
    fi
  else
    echo -e "${RED}❌ ワークフローのトリガーに失敗しました${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ エラー: GitHub CLIがインストールされていません${NC}"
  echo "GitHub CLIをインストールしてください: https://cli.github.com/"
  exit 1
fi

echo
echo -e "${GREEN}✅ 完了しました！${NC}"
echo
