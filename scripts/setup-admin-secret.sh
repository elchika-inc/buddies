#!/bin/bash

# Admin APIのシークレットキーをセットアップするスクリプト

echo "🔐 Setting up Admin API Secret..."
echo "=================================="

# シークレットキーを生成
generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    # opensslがない場合の代替方法
    head -c 32 /dev/urandom | base64 | tr -d "=+/" | cut -c1-32
  fi
}

# 環境を選択
echo ""
echo "Select environment:"
echo "1) Production"
echo "2) Development (local)"
echo "3) Both"
read -p "Enter choice (1-3): " choice

SECRET_KEY=$(generate_secret)
echo ""
echo "Generated secret key: $SECRET_KEY"
echo ""

# APIシークレットキーも同じ値に設定するか確認
echo "Use the same key for API_SECRET_KEY? (recommended)"
read -p "Enter choice (y/n): " use_same
echo ""

case $choice in
  1)
    echo "📤 Setting production secret..."
    cd api || exit 1
    echo "$SECRET_KEY" | wrangler secret put API_ADMIN_SECRET --env production
    
    if [ "$use_same" = "y" ]; then
      echo "$SECRET_KEY" | wrangler secret put API_SECRET_KEY --env production
      echo "✅ Production secrets set (API_ADMIN_SECRET & API_SECRET_KEY)!"
    else
      echo "✅ Production secret set (API_ADMIN_SECRET only)!"
    fi
    ;;
  2)
    echo "📝 Setting development secret..."
    cd api || exit 1
    
    # .dev.varsファイルが存在しない場合は作成
    if [ ! -f .dev.vars ]; then
      touch .dev.vars
      echo "Created .dev.vars file"
    fi
    
    # 既存のキーを削除して新しいものを追加
    grep -v "^API_ADMIN_SECRET=" .dev.vars | grep -v "^API_SECRET_KEY=" > .dev.vars.tmp 2>/dev/null || true
    echo "API_ADMIN_SECRET=$SECRET_KEY" >> .dev.vars.tmp
    
    if [ "$use_same" = "y" ]; then
      echo "API_SECRET_KEY=$SECRET_KEY" >> .dev.vars.tmp
    fi
    
    mv .dev.vars.tmp .dev.vars
    
    if [ "$use_same" = "y" ]; then
      echo "✅ Development secrets set in api/.dev.vars (API_ADMIN_SECRET & API_SECRET_KEY)"
    else
      echo "✅ Development secret set in api/.dev.vars (API_ADMIN_SECRET only)"
    fi
    ;;
  3)
    echo "📤 Setting both production and development secrets..."
    cd api || exit 1
    
    # Production
    echo "$SECRET_KEY" | wrangler secret put API_ADMIN_SECRET --env production
    if [ "$use_same" = "y" ]; then
      echo "$SECRET_KEY" | wrangler secret put API_SECRET_KEY --env production
    fi
    
    # Development
    if [ ! -f .dev.vars ]; then
      touch .dev.vars
    fi
    grep -v "^API_ADMIN_SECRET=" .dev.vars | grep -v "^API_SECRET_KEY=" > .dev.vars.tmp 2>/dev/null || true
    echo "API_ADMIN_SECRET=$SECRET_KEY" >> .dev.vars.tmp
    if [ "$use_same" = "y" ]; then
      echo "API_SECRET_KEY=$SECRET_KEY" >> .dev.vars.tmp
    fi
    mv .dev.vars.tmp .dev.vars
    
    if [ "$use_same" = "y" ]; then
      echo "✅ Both environments set with API_ADMIN_SECRET & API_SECRET_KEY!"
    else
      echo "✅ Both environments set with API_ADMIN_SECRET!"
    fi
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "📋 Next steps:"
echo "1. Save this secret key securely"
echo "2. Update your scripts to use this key"
echo "3. Add to .env.local for local scripts:"
echo "   API_ADMIN_SECRET=$SECRET_KEY"
echo ""

# .env.localに追加するか確認
read -p "Add to .env.local? (y/n): " add_env
if [ "$add_env" = "y" ]; then
  cd .. || exit 1
  if [ -f .env.local ]; then
    grep -v "^API_ADMIN_SECRET=" .env.local > .env.local.tmp 2>/dev/null || true
    echo "API_ADMIN_SECRET=$SECRET_KEY" >> .env.local.tmp
    mv .env.local.tmp .env.local
    echo "✅ Added to .env.local"
  else
    echo "API_ADMIN_SECRET=$SECRET_KEY" > .env.local
    echo "✅ Created .env.local with secret"
  fi
fi

echo ""
echo "🎉 Setup complete!"