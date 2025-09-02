#!/bin/bash

# APIキー管理サービスのURL
API_URL="https://pawmatch-api-keys.naoto24kawa.workers.dev"

# マスターシークレット（環境変数から読み込み）
if [ -z "$MASTER_SECRET" ]; then
  echo "❌ MASTER_SECRET環境変数が設定されていません"
  echo "export MASTER_SECRET=<your-master-secret> を実行してください"
  exit 1
fi

echo "🔑 APIキーを作成します..."

# 1. パブリックキー（フロントエンド用）
echo "1️⃣ パブリックキー（フロントエンド用）を作成中..."
PUBLIC_KEY_RESPONSE=$(curl -s -X POST "$API_URL/admin/keys" \
  -H "X-Master-Secret: $MASTER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Frontend Application",
    "type": "public",
    "permissions": ["pets:read", "images:read"],
    "rate_limit": 1000,
    "expires_in_days": 365
  }')

if echo "$PUBLIC_KEY_RESPONSE" | grep -q '"success":true'; then
  PUBLIC_KEY=$(echo "$PUBLIC_KEY_RESPONSE" | grep -o '"key":"[^"]*' | sed 's/"key":"//')
  echo "✅ パブリックキー作成成功: $PUBLIC_KEY"
else
  echo "❌ パブリックキー作成失敗:"
  echo "$PUBLIC_KEY_RESPONSE"
fi

# 2. インターナルキー（サービス間通信用）
echo "2️⃣ インターナルキー（サービス間通信用）を作成中..."
INTERNAL_KEY_RESPONSE=$(curl -s -X POST "$API_URL/admin/keys" \
  -H "X-Master-Secret: $MASTER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Internal Services",
    "type": "internal",
    "permissions": ["pets:read", "pets:write", "images:read", "images:write", "crawl:execute"],
    "rate_limit": 5000,
    "expires_in_days": 90
  }')

if echo "$INTERNAL_KEY_RESPONSE" | grep -q '"success":true'; then
  INTERNAL_KEY=$(echo "$INTERNAL_KEY_RESPONSE" | grep -o '"key":"[^"]*' | sed 's/"key":"//')
  echo "✅ インターナルキー作成成功: $INTERNAL_KEY"
else
  echo "❌ インターナルキー作成失敗:"
  echo "$INTERNAL_KEY_RESPONSE"
fi

# 3. 管理者キー（管理機能用）
echo "3️⃣ 管理者キー（管理機能用）を作成中..."
ADMIN_KEY_RESPONSE=$(curl -s -X POST "$API_URL/admin/keys" \
  -H "X-Master-Secret: $MASTER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Dashboard",
    "type": "admin",
    "permissions": ["*"],
    "rate_limit": 100,
    "expires_in_days": 30
  }')

if echo "$ADMIN_KEY_RESPONSE" | grep -q '"success":true'; then
  ADMIN_KEY=$(echo "$ADMIN_KEY_RESPONSE" | grep -o '"key":"[^"]*' | sed 's/"key":"//')
  echo "✅ 管理者キー作成成功: $ADMIN_KEY"
else
  echo "❌ 管理者キー作成失敗:"
  echo "$ADMIN_KEY_RESPONSE"
fi

echo ""
echo "==============================================="
echo "🎉 APIキー作成完了！"
echo "==============================================="
echo ""
echo "以下のキーを環境変数に設定してください："
echo ""
echo "# フロントエンド (.env.local)"
echo "NEXT_PUBLIC_API_KEY=$PUBLIC_KEY"
echo ""
echo "# GitHub Actions Secrets"
echo "API_KEY_INTERNAL=$INTERNAL_KEY"
echo ""
echo "# 管理者用"
echo "API_KEY_ADMIN=$ADMIN_KEY"
echo ""
echo "==============================================="

# 環境変数ファイルに保存（オプション）
if [ ! -z "$PUBLIC_KEY" ] && [ ! -z "$INTERNAL_KEY" ] && [ ! -z "$ADMIN_KEY" ]; then
  cat > api-keys.env << EOF
# Generated API Keys - $(date)
PUBLIC_KEY=$PUBLIC_KEY
INTERNAL_KEY=$INTERNAL_KEY
ADMIN_KEY=$ADMIN_KEY
EOF
  echo "💾 キーを api-keys.env に保存しました"
fi