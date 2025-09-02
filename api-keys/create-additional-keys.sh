#!/bin/bash

# APIキー管理サービスのURL
API_URL="https://pawmatch-api-keys.naoto24kawa.workers.dev"

# マスターシークレット
MASTER_SECRET="F3v4iAEBWNkmI/6N8p2AF3eJ4VECH7YXNKkeiHsMMKg="

echo "🔑 追加のAPIキーを作成します..."

# 1. Crawler用キー
echo "1️⃣ Crawler用キーを作成中..."
CRAWLER_KEY_RESPONSE=$(curl -s -X POST "$API_URL/admin/keys" \
  -H "X-Master-Secret: $MASTER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Crawler Service",
    "type": "internal",
    "permissions": ["pets:write", "images:write", "crawl:execute"],
    "rate_limit": 1000,
    "expires_in_days": 365,
    "metadata": {
      "service": "crawler",
      "environment": "production"
    }
  }')

if echo "$CRAWLER_KEY_RESPONSE" | grep -q '"success":true'; then
  CRAWLER_KEY=$(echo "$CRAWLER_KEY_RESPONSE" | grep -o '"key":"[^"]*' | sed 's/"key":"//')
  echo "✅ Crawler用キー作成成功: $CRAWLER_KEY"
else
  echo "❌ Crawler用キー作成失敗:"
  echo "$CRAWLER_KEY_RESPONSE"
fi

# 2. Dispatcher用キー
echo "2️⃣ Dispatcher用キーを作成中..."
DISPATCHER_KEY_RESPONSE=$(curl -s -X POST "$API_URL/admin/keys" \
  -H "X-Master-Secret: $MASTER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dispatcher Service",
    "type": "internal",
    "permissions": ["tasks:create", "tasks:read", "tasks:execute", "crawl:trigger"],
    "rate_limit": 500,
    "expires_in_days": 365,
    "metadata": {
      "service": "dispatcher",
      "environment": "production"
    }
  }')

if echo "$DISPATCHER_KEY_RESPONSE" | grep -q '"success":true'; then
  DISPATCHER_KEY=$(echo "$DISPATCHER_KEY_RESPONSE" | grep -o '"key":"[^"]*' | sed 's/"key":"//')
  echo "✅ Dispatcher用キー作成成功: $DISPATCHER_KEY"
else
  echo "❌ Dispatcher用キー作成失敗:"
  echo "$DISPATCHER_KEY_RESPONSE"
fi

# 3. GitHub Actions用キー
echo "3️⃣ GitHub Actions用キーを作成中..."
GITHUB_KEY_RESPONSE=$(curl -s -X POST "$API_URL/admin/keys" \
  -H "X-Master-Secret: $MASTER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub Actions Workflow",
    "type": "internal",
    "permissions": ["pets:write", "images:write", "admin:update-flags"],
    "rate_limit": 100,
    "expires_in_days": 365,
    "metadata": {
      "service": "github-actions",
      "environment": "ci-cd"
    }
  }')

if echo "$GITHUB_KEY_RESPONSE" | grep -q '"success":true'; then
  GITHUB_KEY=$(echo "$GITHUB_KEY_RESPONSE" | grep -o '"key":"[^"]*' | sed 's/"key":"//')
  echo "✅ GitHub Actions用キー作成成功: $GITHUB_KEY"
else
  echo "❌ GitHub Actions用キー作成失敗:"
  echo "$GITHUB_KEY_RESPONSE"
fi

# 4. 開発環境用キー
echo "4️⃣ 開発環境用キーを作成中..."
DEV_KEY_RESPONSE=$(curl -s -X POST "$API_URL/admin/keys" \
  -H "X-Master-Secret: $MASTER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Development Environment",
    "type": "internal",
    "permissions": ["*"],
    "rate_limit": 10000,
    "expires_in_days": 30,
    "metadata": {
      "environment": "development",
      "purpose": "local-testing"
    }
  }')

if echo "$DEV_KEY_RESPONSE" | grep -q '"success":true'; then
  DEV_KEY=$(echo "$DEV_KEY_RESPONSE" | grep -o '"key":"[^"]*' | sed 's/"key":"//')
  echo "✅ 開発環境用キー作成成功: $DEV_KEY"
else
  echo "❌ 開発環境用キー作成失敗:"
  echo "$DEV_KEY_RESPONSE"
fi

# 5. モニタリング用キー（読み取り専用）
echo "5️⃣ モニタリング用キーを作成中..."
MONITORING_KEY_RESPONSE=$(curl -s -X POST "$API_URL/admin/keys" \
  -H "X-Master-Secret: $MASTER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monitoring Service",
    "type": "public",
    "permissions": ["pets:read", "stats:read", "health:check"],
    "rate_limit": 1000,
    "expires_in_days": 365,
    "metadata": {
      "service": "monitoring",
      "purpose": "health-checks"
    }
  }')

if echo "$MONITORING_KEY_RESPONSE" | grep -q '"success":true'; then
  MONITORING_KEY=$(echo "$MONITORING_KEY_RESPONSE" | grep -o '"key":"[^"]*' | sed 's/"key":"//')
  echo "✅ モニタリング用キー作成成功: $MONITORING_KEY"
else
  echo "❌ モニタリング用キー作成失敗:"
  echo "$MONITORING_KEY_RESPONSE"
fi

echo ""
echo "==============================================="
echo "🎉 追加APIキー作成完了！"
echo "==============================================="
echo ""
echo "# Crawler Service"
echo "CRAWLER_API_KEY=$CRAWLER_KEY"
echo ""
echo "# Dispatcher Service"
echo "DISPATCHER_API_KEY=$DISPATCHER_KEY"
echo ""
echo "# GitHub Actions"
echo "GITHUB_ACTIONS_API_KEY=$GITHUB_KEY"
echo ""
echo "# Development Environment"
echo "DEV_API_KEY=$DEV_KEY"
echo ""
echo "# Monitoring Service"
echo "MONITORING_API_KEY=$MONITORING_KEY"
echo ""
echo "==============================================="

# 環境変数ファイルに追記
if [ ! -z "$CRAWLER_KEY" ] && [ ! -z "$DISPATCHER_KEY" ] && [ ! -z "$GITHUB_KEY" ] && [ ! -z "$DEV_KEY" ] && [ ! -z "$MONITORING_KEY" ]; then
  cat >> api-keys.env << EOF

# Additional API Keys - $(date)
CRAWLER_API_KEY=$CRAWLER_KEY
DISPATCHER_API_KEY=$DISPATCHER_KEY
GITHUB_ACTIONS_API_KEY=$GITHUB_KEY
DEV_API_KEY=$DEV_KEY
MONITORING_API_KEY=$MONITORING_KEY
EOF
  echo "💾 追加キーを api-keys.env に保存しました"
fi