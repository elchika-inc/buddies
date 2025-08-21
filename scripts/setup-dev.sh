#!/bin/bash

# PawMatch 開発環境セットアップスクリプト
# 新しい開発者が環境を構築するためのスクリプト

set -e

echo "🐱🐶 PawMatch 開発環境セットアップ開始"

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# 1. 依存関係のインストール
echo "📦 依存関係をインストール中..."
echo "  - ルートプロジェクト"
npm install

echo "  - App (Next.js)"
cd app && npm install && cd ..

echo "  - API (Cloudflare Workers)"
cd api && npm install && cd ..

echo "  - Workers/Crawler"
cd workers/crawler && npm install && cd ../..

# 2. 環境変数ファイルのセットアップ
echo "⚙️ 環境変数ファイルをセットアップ中..."

# API環境変数
if [ ! -f "api/.dev.vars" ]; then
    echo "  - api/.dev.vars を作成"
    cat > api/.dev.vars << 'EOF'
# Local development environment variables
ALLOWED_ORIGIN=http://localhost:3004
USE_LOCAL_IMAGES=true
EOF
fi

# App環境変数
if [ ! -f "app/.env.local" ]; then
    echo "  - app/.env.local を作成"
    cat > app/.env.local << 'EOF'
# Next.js App 環境変数
NEXT_PUBLIC_PET_TYPE=cat
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
EOF
fi

# 3. D1データベースの初期化
echo "🗄️ D1データベースを初期化中..."
cd api

echo "  - スキーマを作成中..."
npx wrangler d1 execute pawmatch-db --local --file=./migrations/0001_initial_schema.sql 2>/dev/null || echo "  (スキーマは既に作成済みの可能性があります)"

echo "  - shelter_urlカラムを追加中..."
npx wrangler d1 execute pawmatch-db --local --file=./migrations/0002_add_shelter_url.sql 2>/dev/null || echo "  (カラムは既に追加済みの可能性があります)"

# 4. サンプルデータを投入
echo "  - サンプルデータを投入中..."

# 既存データをクリア
npx wrangler d1 execute pawmatch-db --local --command="DELETE FROM pets;" 2>/dev/null || true

# サンプルデータを生成して投入（Node.jsのワンライナーで実行）
node -e "
const prefectures = ['東京都', '神奈川県', '大阪府', '愛知県', '福岡県'];
const catBreeds = ['三毛猫', '黒猫', '白猫', 'キジトラ', '茶トラ'];
const dogBreeds = ['柴犬', '秋田犬', 'トイプードル', 'チワワ', 'ダックスフンド'];

// SQLファイルを生成
const sqls = [];

// 猫データ50件
for (let i = 1; i <= 50; i++) {
  const id = 'cat-' + String(i).padStart(3, '0');
  const prefecture = prefectures[i % prefectures.length];
  const breed = catBreeds[i % catBreeds.length];
  sqls.push(\`
    INSERT INTO pets (id, type, name, breed, age, gender, prefecture, city, location,
      description, personality, medical_info, care_requirements,
      image_url, shelter_name, shelter_contact, source_url, adoption_fee,
      metadata, created_at)
    VALUES ('\${id}', 'cat', 'ネコちゃん\${i}号', '\${breed}', \${(i % 10) + 1}, 
      '\${i % 2 === 0 ? '男の子' : '女の子'}', '\${prefecture}', '市内', '\${prefecture}市内',
      '可愛い性格をしています。新しい家族を探しています。',
      '[\"人懐っこい\",\"甘えん坊\",\"遊び好き\"]',
      'ワクチン接種済み、健康チェック済み',
      '[\"完全室内飼い\",\"定期健診\",\"愛情たっぷり\"]',
      'http://localhost:8787/images/cats/\${id}.jpg',
      '\${prefecture.replace('都府県', '')}アニマルレスキュー',
      'shelter\${i}@example.com',
      'https://pet-home.jp/cats/listing/\${i}',
      0, '{}', datetime('now'));\`);
}

// 犬データ50件
for (let i = 1; i <= 50; i++) {
  const id = 'dog-' + String(i).padStart(3, '0');
  const prefecture = prefectures[i % prefectures.length];
  const breed = dogBreeds[i % dogBreeds.length];
  sqls.push(\`
    INSERT INTO pets (id, type, name, breed, age, gender, prefecture, city, location,
      description, personality, medical_info, care_requirements,
      image_url, shelter_name, shelter_contact, source_url, adoption_fee,
      metadata, created_at)
    VALUES ('\${id}', 'dog', 'ワンちゃん\${i}号', '\${breed}', \${(i % 10) + 1},
      '\${i % 2 === 0 ? '男の子' : '女の子'}', '\${prefecture}', '市内', '\${prefecture}市内',
      '友好的な性格をしています。新しい家族を探しています。',
      '[\"忠実\",\"活発\",\"友好的\"]',
      'ワクチン接種済み、健康チェック済み',
      '[\"毎日の散歩\",\"定期健診\",\"愛情たっぷり\"]',
      'http://localhost:8787/images/dogs/\${id}.jpg',
      '\${prefecture.replace('都府県', '')}ペット保護センター',
      'shelter\${i}@example.com',
      'https://pet-home.jp/dogs/listing/\${i}',
      0, '{}', datetime('now'));\`);
}

require('fs').writeFileSync('/tmp/seed-data.sql', sqls.join('\\n'));
"

# SQLファイルを実行
npx wrangler d1 execute pawmatch-db --local --file=/tmp/seed-data.sql 2>/dev/null
rm -f /tmp/seed-data.sql

echo "  ✅ サンプルデータ投入完了（猫50件、犬50件）"

# 5. サンプル画像のセットアップ
echo "📸 サンプル画像をセットアップ中..."

# R2にダミー画像をアップロード（簡易版）
# 実際の画像アップロードは以下のコマンドで後から実行可能：
# npx wrangler r2 object put pawmatch-images/cats/cat-001.jpg --file=path/to/image.jpg --local

echo "  ℹ️ 画像のアップロードはスキップされました"
echo "  必要に応じて、以下のコマンドで画像をアップロードしてください："
echo "  npx wrangler r2 object put pawmatch-images/[type]/[id].jpg --file=[画像ファイル] --local"

cd ..

echo ""
echo "✅ セットアップ完了！"
echo ""
echo "🚀 開発サーバーを起動するには："
echo "  npm run dev        # すべてのサービスを並行起動"
echo "  npm run dev:api    # APIサーバーのみ"
echo "  npm run dev:app    # Appサーバーのみ"
echo ""
echo "🔗 アクセス可能なURL："
echo "  App (CatMatch): http://localhost:3005"
echo "  App (DogMatch): http://localhost:3004"
echo "  API Server:     http://localhost:8787"