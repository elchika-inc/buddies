#!/bin/bash

set -e

echo "🧪 PawMatch Workers ローカル開発環境セットアップ"
echo "=============================================="

# 必要なツールの確認
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler が見つかりません。インストールしてください："
    echo "npm install -g wrangler"
    exit 1
fi

# 認証確認
echo "🔐 Cloudflare 認証状態を確認中..."
if ! wrangler whoami &> /dev/null; then
    echo "⚠️  Cloudflare にログインしていません"
    echo "wrangler login を実行してください"
    exit 1
fi

echo "✅ 認証済み: $(wrangler whoami)"

# ローカルR2バケットの作成（開発用）
echo ""
echo "📦 ローカルR2バケットを作成中..."
if wrangler r2 bucket create pawmatch-images-dev 2>/dev/null; then
    echo "✅ 開発用R2バケット 'pawmatch-images-dev' を作成しました"
else
    echo "ℹ️  開発用R2バケット 'pawmatch-images-dev' は既に存在します"
fi

# ローカルD1データベースの作成（開発用）
echo ""
echo "🗄️  ローカルD1データベースを作成中..."
DB_OUTPUT=$(wrangler d1 create pawmatch-db-dev 2>&1 || echo "exists")

if [[ $DB_OUTPUT == *"exists"* ]] || [[ $DB_OUTPUT == *"already exists"* ]]; then
    echo "ℹ️  開発用D1データベース 'pawmatch-db-dev' は既に存在します"
    DB_ID=$(wrangler d1 list | grep pawmatch-db-dev | awk '{print $1}' || echo "")
else
    # 新しいデータベースのIDを抽出
    DB_ID=$(echo "$DB_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2 || echo "")
    echo "✅ 開発用D1データベース 'pawmatch-db-dev' を作成しました"
fi

if [ -z "$DB_ID" ]; then
    echo "❌ データベースIDを取得できませんでした"
    exit 1
fi

echo "📝 開発用データベースID: $DB_ID"

# 開発用wrangler.tomlファイルの作成
echo ""
echo "⚙️  開発用設定ファイルを作成中..."

# Crawler Worker開発設定
cat > workers/crawler/wrangler.dev.toml << EOF
name = "pawmatch-crawler-dev"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ALLOWED_ORIGIN = "http://localhost:3004"
PET_HOME_BASE_URL = "https://www.pet-home.jp"

[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "pawmatch-images-dev"

[[d1_databases]]
binding = "DB"
database_name = "pawmatch-db-dev"
database_id = "$DB_ID"
EOF

# API Worker開発設定
cat > workers/api/wrangler.dev.toml << EOF
name = "pawmatch-api-dev"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ALLOWED_ORIGIN = "http://localhost:3004"

[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "pawmatch-images-dev"

[[d1_databases]]
binding = "DB"
database_name = "pawmatch-db-dev"
database_id = "$DB_ID"
EOF

echo "✅ 開発用設定ファイルを作成しました"

# 開発用データベーススキーマの適用
echo ""
echo "🗃️  開発用データベーススキーマを適用中..."
cd workers/crawler
if wrangler d1 execute pawmatch-db-dev --file=schema.sql; then
    echo "✅ 開発用スキーマを適用しました"
else
    echo "⚠️  スキーマ適用でエラーが発生しました（既存テーブルの場合は正常です）"
fi
cd ../..

# サンプルデータの投入
echo ""
echo "📊 サンプルデータを投入中..."
cat > workers/crawler/sample-data.sql << 'EOF'
INSERT OR REPLACE INTO pets (
  id, type, name, breed, age, gender, prefecture, city, location,
  description, personality, medical_info, care_requirements,
  image_url, shelter_name, shelter_contact, source_url, created_at,
  metadata
) VALUES 
('dev001', 'cat', 'テスト猫ちゃん', '雑種', 2, '女の子', '東京都', '新宿区', '東京都新宿区',
 'ローカル開発用のテスト猫です', '["人懐っこい", "甘えん坊"]', 'ワクチン接種済み', '["完全室内飼い"]',
 '/images/cats/cat-dev001.jpg', 'テスト保護センター', 'test@example.com', 'https://example.com/dev001',
 '2025-01-01 00:00:00', '{}'),
('dev002', 'dog', 'テスト犬ちゃん', '柴犬', 3, '男の子', '大阪府', '大阪市', '大阪府大阪市',
 'ローカル開発用のテスト犬です', '["元気", "遊び好き"]', 'ワクチン接種済み', '["散歩必要"]',
 '/images/dogs/dog-dev002.jpg', 'テスト保護センター', 'test@example.com', 'https://example.com/dev002',
 '2025-01-01 00:00:00', '{}');
EOF

cd workers/crawler
wrangler d1 execute pawmatch-db-dev --file=sample-data.sql
rm sample-data.sql
echo "✅ サンプルデータを投入しました"
cd ../..

# 依存関係のインストール
echo ""
echo "📦 依存関係をインストール中..."
cd workers/crawler && npm install &> /dev/null && cd ../..
echo "✅ crawler worker の依存関係をインストールしました"
cd workers/api && npm install &> /dev/null && cd ../..
echo "✅ api worker の依存関係をインストールしました"

echo ""
echo "🎉 ローカル開発環境のセットアップ完了！"
echo ""
echo "🚀 開発サーバーの起動方法:"
echo ""
echo "📟 ターミナル1でCrawler Worker起動:"
echo "  cd workers/crawler"
echo "  wrangler dev --config wrangler.dev.toml"
echo ""
echo "📡 ターミナル2でAPI Worker起動:"
echo "  cd workers/api"
echo "  wrangler dev --config wrangler.dev.toml"
echo ""
echo "🔗 アクセスURL（通常）:"
echo "  - Crawler: http://localhost:8787"
echo "  - API: http://localhost:8788"
echo ""
echo "🧪 動作確認コマンド:"
echo "  # ヘルスチェック"
echo "  curl http://localhost:8787"
echo "  curl http://localhost:8788"
echo ""
echo "  # ペット一覧取得"
echo "  curl http://localhost:8788/pets"
echo "  curl http://localhost:8788/pets/cat"
echo ""
echo "  # 手動クロール実行"
echo "  curl -X POST http://localhost:8787/crawl/cat"
echo ""
echo "  # 統計情報"
echo "  curl http://localhost:8788/stats"