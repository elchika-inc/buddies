#!/bin/bash

# PawMatch - 共通ローカルD1データベース設定スクリプト
# wrangler v4対応

echo "🔗 PawMatch - 共通ローカルD1データベースを設定中..."

# APIのD1データベースファイルのパス
API_D1_PATH="/Users/nishikawa/projects/elchika/pawmatch/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
API_DB_FILE="$API_D1_PATH/database.sqlite"

# APIのD1が存在することを確認
if [ ! -f "$API_DB_FILE" ]; then
    echo "❌ APIのD1データベースが見つかりません: $API_DB_FILE"
    echo "まず api/ ディレクトリで 'npm run dev' を実行してください"
    exit 1
fi

echo "✅ APIのD1データベースを確認: $API_DB_FILE"

# 各サービスに対してシンボリックリンクを作成
SERVICES=("crawler" "converter" "dispatcher")

for service in "${SERVICES[@]}"; do
    echo "🔧 $service のD1共有を設定中..."
    
    # サービスのwranglerディレクトリ構造を作成
    SERVICE_D1_DIR="/Users/nishikawa/projects/elchika/pawmatch/$service/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
    
    # ディレクトリが既に存在する場合は削除
    if [ -d "$SERVICE_D1_DIR" ]; then
        echo "  既存のD1ディレクトリを削除: $SERVICE_D1_DIR"
        rm -rf "$SERVICE_D1_DIR"
    fi
    
    # 親ディレクトリを作成
    mkdir -p "$(dirname "$SERVICE_D1_DIR")"
    
    # シンボリックリンクを作成
    ln -sf "$API_D1_PATH" "$SERVICE_D1_DIR"
    
    if [ -L "$SERVICE_D1_DIR" ]; then
        echo "  ✅ シンボリックリンク作成完了: $service"
    else
        echo "  ❌ シンボリックリンク作成失敗: $service"
    fi
done

echo ""
echo "🎉 共通D1データベース設定が完了しました！"
echo ""
echo "📋 確認事項:"
echo "1. 全サービスが同じD1データベースファイルを共有します"
echo "2. APIでデータベースの変更を行うと、他のサービスからも即座に確認できます"
echo "3. マイグレーションはAPIで実行してください (npm run api:db:migrate)"
echo ""
echo "🚀 テスト方法:"
echo "  1. cd api && npm run dev (ポート: 8787)"
echo "  2. cd crawler && npm run dev (ポート: 9787)"
echo "  3. 両方から同じD1データベースにアクセスできることを確認"
echo ""

