#!/bin/bash

################################################################################
# 画像管理統合スクリプト
#
# 使用方法:
#   ./scripts/manage-images.sh
#
# 説明:
#   対話的に画像処理タスクを実行します。
################################################################################

set -e  # エラーで停止

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ロゴ表示
show_banner() {
  echo -e "${MAGENTA}"
  echo "╔════════════════════════════════════════════╗"
  echo "║                                            ║"
  echo "║       Buddies 画像管理ツール              ║"
  echo "║                                            ║"
  echo "╚════════════════════════════════════════════╝"
  echo -e "${NC}"
}

# メインメニュー
show_menu() {
  echo
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  メインメニュー${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo
  echo -e "  ${GREEN}1${NC}) 画像ステータスを確認"
  echo -e "  ${GREEN}2${NC}) スクリーンショットを取得"
  echo -e "  ${GREEN}3${NC}) 画像を変換（WebP）"
  echo -e "  ${GREEN}4${NC}) GitHub Actions の状況を確認"
  echo -e "  ${GREEN}5${NC}) 一括処理（スクリーンショット → 変換）"
  echo -e "  ${GREEN}6${NC}) ヘルプ・ドキュメント"
  echo -e "  ${RED}0${NC}) 終了"
  echo
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo
}

# 画像ステータス確認
check_status() {
  echo
  if [ -f "${SCRIPT_DIR}/check-image-status.sh" ]; then
    "${SCRIPT_DIR}/check-image-status.sh"
  else
    echo -e "${RED}❌ check-image-status.sh が見つかりません${NC}"
  fi

  echo
  read -p "Enterキーを押して続行..."
}

# スクリーンショット取得
trigger_screenshot() {
  echo
  echo -e "${YELLOW}スクリーンショット取得${NC}"
  echo
  read -p "取得するペット数を入力してください [デフォルト: 50]: " limit
  limit=${limit:-50}

  echo
  if [ -f "${SCRIPT_DIR}/trigger-screenshot.sh" ]; then
    "${SCRIPT_DIR}/trigger-screenshot.sh" "$limit"
  else
    echo -e "${RED}❌ trigger-screenshot.sh が見つかりません${NC}"
  fi

  echo
  read -p "Enterキーを押して続行..."
}

# 画像変換
trigger_conversion() {
  echo
  echo -e "${YELLOW}画像変換モード選択${NC}"
  echo
  echo -e "  ${GREEN}1${NC}) 全ての画像を変換"
  echo -e "  ${GREEN}2${NC}) WebPがない画像のみ変換"
  echo -e "  ${GREEN}3${NC}) JPEGがない画像のみ変換"
  echo
  read -p "モードを選択してください [1-3]: " mode_choice

  case $mode_choice in
    1) mode="all" ;;
    2) mode="missing-webp" ;;
    3) mode="missing-jpeg" ;;
    *)
      echo -e "${RED}無効な選択です${NC}"
      return
      ;;
  esac

  echo
  read -p "変換するペット数を入力してください [デフォルト: 50]: " limit
  limit=${limit:-50}

  echo
  if [ -f "${SCRIPT_DIR}/trigger-conversion.sh" ]; then
    "${SCRIPT_DIR}/trigger-conversion.sh" "$mode" "$limit"
  else
    echo -e "${RED}❌ trigger-conversion.sh が見つかりません${NC}"
  fi

  echo
  read -p "Enterキーを押して続行..."
}

# GitHub Actions状況確認
check_github_actions() {
  echo
  echo -e "${YELLOW}GitHub Actions 実行状況${NC}"
  echo

  if command -v gh &> /dev/null; then
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  スクリーンショット取得ワークフロー${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    gh run list --workflow=screenshot-capture.yml --limit 5

    echo
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  画像変換ワークフロー${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    gh run list --workflow=image-conversion.yml --limit 5

    echo
    echo -e "${YELLOW}💡 ヒント:${NC}"
    echo -e "  ワークフローの詳細を確認: ${GREEN}gh run view <RUN_ID>${NC}"
    echo -e "  リアルタイムログ監視: ${GREEN}gh run watch <RUN_ID>${NC}"
  else
    echo -e "${RED}❌ GitHub CLIがインストールされていません${NC}"
    echo "インストール: https://cli.github.com/"
  fi

  echo
  read -p "Enterキーを押して続行..."
}

# 一括処理
batch_process() {
  echo
  echo -e "${YELLOW}一括処理: スクリーンショット取得 → 画像変換${NC}"
  echo
  echo -e "${RED}⚠️  注意: この処理には時間がかかる場合があります${NC}"
  echo
  read -p "処理するペット数を入力してください [デフォルト: 30]: " limit
  limit=${limit:-30}

  echo
  read -p "本当に実行しますか？ (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    return
  fi

  echo
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  ステップ1: スクリーンショット取得${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if [ -f "${SCRIPT_DIR}/trigger-screenshot.sh" ]; then
    "${SCRIPT_DIR}/trigger-screenshot.sh" "$limit"
  else
    echo -e "${RED}❌ trigger-screenshot.sh が見つかりません${NC}"
    return
  fi

  echo
  echo -e "${YELLOW}スクリーンショット処理が完了するまで待機しています...${NC}"
  echo -e "${YELLOW}（約2-3分）${NC}"
  sleep 180  # 3分待機

  echo
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  ステップ2: 画像変換${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if [ -f "${SCRIPT_DIR}/trigger-conversion.sh" ]; then
    "${SCRIPT_DIR}/trigger-conversion.sh" "all" "$limit"
  else
    echo -e "${RED}❌ trigger-conversion.sh が見つかりません${NC}"
    return
  fi

  echo
  echo -e "${GREEN}✅ 一括処理が完了しました${NC}"
  echo
  read -p "Enterキーを押して続行..."
}

# ヘルプ表示
show_help() {
  echo
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  ヘルプ・ドキュメント${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo
  echo -e "${YELLOW}利用可能なスクリプト:${NC}"
  echo
  echo -e "  ${GREEN}check-image-status.sh${NC}"
  echo -e "    画像ステータスを確認し、統計情報を表示"
  echo
  echo -e "  ${GREEN}trigger-screenshot.sh [件数]${NC}"
  echo -e "    スクリーンショット取得をトリガー"
  echo -e "    例: ./scripts/trigger-screenshot.sh 50"
  echo
  echo -e "  ${GREEN}trigger-conversion.sh [モード] [件数]${NC}"
  echo -e "    画像変換をトリガー"
  echo -e "    モード: all, missing-webp, missing-jpeg"
  echo -e "    例: ./scripts/trigger-conversion.sh missing-webp 30"
  echo
  echo -e "${YELLOW}ドキュメント:${NC}"
  echo -e "  ${BLUE}__docs__/MANUAL_TRIGGER_GUIDE.md${NC} - 詳細な手順ガイド"
  echo -e "  ${BLUE}__docs__/API_ENDPOINTS.md${NC} - APIエンドポイント一覧"
  echo
  echo -e "${YELLOW}トラブルシューティング:${NC}"
  echo -e "  問題が発生した場合は、__docs__/MANUAL_TRIGGER_GUIDE.md の"
  echo -e "  「トラブルシューティング」セクションを参照してください"
  echo
  read -p "Enterキーを押して続行..."
}

# メイン処理
main() {
  show_banner

  while true; do
    show_menu
    read -p "選択してください [0-6]: " choice

    case $choice in
      1) check_status ;;
      2) trigger_screenshot ;;
      3) trigger_conversion ;;
      4) check_github_actions ;;
      5) batch_process ;;
      6) show_help ;;
      0)
        echo
        echo -e "${GREEN}終了します${NC}"
        echo
        exit 0
        ;;
      *)
        echo
        echo -e "${RED}無効な選択です。もう一度選んでください。${NC}"
        sleep 1
        ;;
    esac
  done
}

# スクリプト実行
main
