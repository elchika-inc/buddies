#!/bin/bash

echo "📋 R2画像移行スクリプト"
echo "====================="
echo ""

# カラー設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SOURCE_BUCKET="pawmatch-images"
TARGET_BUCKET="buddies-images"

echo "📊 ソース: $SOURCE_BUCKET"
echo "📊 ターゲット: $TARGET_BUCKET"
echo ""

# 1. ソースバケットのファイル一覧を取得
echo -e "${YELLOW}🔄 ソースバケットのファイル一覧を取得中...${NC}"
npx wrangler r2 object list $SOURCE_BUCKET --json > /tmp/r2_files.json

# ファイル数を確認
FILE_COUNT=$(cat /tmp/r2_files.json | jq '.length')
echo -e "📊 ${FILE_COUNT} 個のファイルが見つかりました"

if [ "$FILE_COUNT" -eq "0" ]; then
  echo -e "${YELLOW}⚠️  移行するファイルがありません${NC}"
  exit 0
fi

# 2. 各ファイルをコピー
echo -e "${YELLOW}🔄 画像ファイルをコピー中...${NC}"

# 一時ディレクトリを作成
TEMP_DIR="/tmp/r2_migration"
mkdir -p $TEMP_DIR

# ファイル一覧をループ
cat /tmp/r2_files.json | jq -r '.[].key' | while read -r FILE_KEY; do
  echo -n "  Copying: $FILE_KEY ... "

  # ファイルをダウンロード
  if npx wrangler r2 object get $SOURCE_BUCKET/$FILE_KEY --file=$TEMP_DIR/temp_file 2>/dev/null; then
    # ファイルをアップロード
    if npx wrangler r2 object put $TARGET_BUCKET/$FILE_KEY --file=$TEMP_DIR/temp_file 2>/dev/null; then
      echo -e "${GREEN}✓${NC}"
    else
      echo -e "${RED}✗ (アップロード失敗)${NC}"
    fi
  else
    echo -e "${RED}✗ (ダウンロード失敗)${NC}"
  fi

  # 一時ファイルを削除
  rm -f $TEMP_DIR/temp_file
done

# 3. 結果を確認
echo ""
echo -e "${YELLOW}📊 移行結果を確認中...${NC}"

SOURCE_COUNT=$(npx wrangler r2 object list $SOURCE_BUCKET --json | jq '.length')
TARGET_COUNT=$(npx wrangler r2 object list $TARGET_BUCKET --json | jq '.length')

echo "ソースバケット ($SOURCE_BUCKET): $SOURCE_COUNT ファイル"
echo "ターゲットバケット ($TARGET_BUCKET): $TARGET_COUNT ファイル"

# クリーンアップ
rm -rf $TEMP_DIR
rm -f /tmp/r2_files.json

echo ""
echo -e "${GREEN}✅ R2画像移行が完了しました！${NC}"