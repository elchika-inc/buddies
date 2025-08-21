#!/bin/bash
set -e

# 色付きログ出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== PawMatch ローカル環境セットアップ ===${NC}"

# プロジェクトルートディレクトリ
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 1. 依存関係のインストール
echo -e "${YELLOW}1. 依存関係をインストール中...${NC}"
if [ -f "package.json" ]; then
    npm install
fi

# crawler ディレクトリの依存関係
if [ -d "crawler" ] && [ -f "crawler/package.json" ]; then
    cd crawler
    npm install
    cd ..
fi

# api ディレクトリの依存関係
if [ -d "api" ] && [ -f "api/package.json" ]; then
    cd api
    npm install
    cd ..
fi

# 2. SQLiteデータベースの初期化
echo -e "${YELLOW}2. SQLiteデータベースを初期化中...${NC}"

# データベースディレクトリの作成
mkdir -p data

# 既存のデータベースをバックアップ（存在する場合）
if [ -f "data/pawmatch.db" ]; then
    BACKUP_FILE="data/pawmatch_$(date +%Y%m%d_%H%M%S).db.backup"
    cp data/pawmatch.db "$BACKUP_FILE"
    echo -e "${GREEN}既存のデータベースをバックアップしました: $BACKUP_FILE${NC}"
fi

# 新しいデータベースを作成
sqlite3 data/pawmatch.db < crawler/scripts/dev/schema-dev.sql
echo -e "${GREEN}データベースを初期化しました${NC}"

# 3. 環境変数ファイルの設定
echo -e "${YELLOW}3. 環境変数ファイルを設定中...${NC}"

# crawler/.dev.vars のサンプル作成
if [ ! -f "crawler/.dev.vars" ]; then
    cat > crawler/.dev.vars << EOF
# Pet-Home Base URL
PET_HOME_BASE_URL=https://www.pet-home.jp

# SQLite Database
DATABASE_PATH=../data/pawmatch.db

# R2 Storage (ローカル開発用)
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=pawmatch-images-dev
R2_ACCOUNT_ID=your_account_id

# Crawler Settings
CRAWLER_BATCH_SIZE=30
CRAWLER_DELAY_MS=1000
EOF
    echo -e "${GREEN}crawler/.dev.vars を作成しました${NC}"
else
    echo -e "${YELLOW}crawler/.dev.vars は既に存在します${NC}"
fi

# api/.dev.vars のサンプル作成
if [ ! -f "api/.dev.vars" ]; then
    cat > api/.dev.vars << EOF
# SQLite Database
DATABASE_PATH=../data/pawmatch.db

# R2 Storage (ローカル開発用)
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=pawmatch-images-dev
R2_ACCOUNT_ID=your_account_id

# API Settings
API_PORT=8787
EOF
    echo -e "${GREEN}api/.dev.vars を作成しました${NC}"
else
    echo -e "${YELLOW}api/.dev.vars は既に存在します${NC}"
fi

# 4. ローカル画像ストレージディレクトリの作成
echo -e "${YELLOW}4. ローカル画像ストレージを設定中...${NC}"
mkdir -p data/images/dogs/originals
mkdir -p data/images/dogs/webp
mkdir -p data/images/cats/originals
mkdir -p data/images/cats/webp
echo -e "${GREEN}画像ストレージディレクトリを作成しました${NC}"

echo -e "${GREEN}=== セットアップ完了 ===${NC}"
echo -e "${YELLOW}次のステップ:${NC}"
echo "1. crawler/.dev.vars と api/.dev.vars の設定値を更新してください"
echo "2. クローラーを実行: cd crawler && npm run crawl:dogs"
echo "3. APIサーバーを起動: cd api && npm run dev"