#!/bin/bash

# PawMatch D1データベースセットアップスクリプト

set -e

echo "🗄️ PawMatch D1データベースのセットアップを開始します..."

# 色付き出力用の関数
print_success() {
    echo -e "\033[32m✅ $1\033[0m"
}

print_info() {
    echo -e "\033[34mℹ️  $1\033[0m"
}

print_warning() {
    echo -e "\033[33m⚠️  $1\033[0m"
}

print_error() {
    echo -e "\033[31m❌ $1\033[0m"
}

# Wranglerがインストールされているかチェック
if ! command -v wrangler &> /dev/null; then
    print_error "Wranglerがインストールされていません。"
    echo "npm install -g wrangler を実行してください。"
    exit 1
fi

print_info "Wranglerバージョン: $(wrangler --version)"

# D1データベースの作成
print_info "D1データベースを作成しています..."
DB_OUTPUT=$(wrangler d1 create pawmatch-db 2>&1 || true)

if echo "$DB_OUTPUT" | grep -q "already exists"; then
    print_warning "データベース 'pawmatch-db' は既に存在します。"
    # 既存のデータベースIDを取得
    DB_ID=$(wrangler d1 list | grep "pawmatch-db" | awk '{print $2}' || echo "")
    if [ -z "$DB_ID" ]; then
        print_error "既存データベースのIDを取得できませんでした。"
        exit 1
    fi
else
    # 新しく作成されたデータベースのIDを取得
    DB_ID=$(echo "$DB_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2 || echo "")
    if [ -z "$DB_ID" ]; then
        print_error "データベースの作成に失敗しました。"
        echo "$DB_OUTPUT"
        exit 1
    fi
    print_success "データベース 'pawmatch-db' を作成しました。"
fi

print_info "データベースID: $DB_ID"

# wrangler.tomlファイルの更新
print_info "wrangler.tomlファイルを更新しています..."
if [ -f "wrangler.toml" ]; then
    # database_idを更新
    if grep -q "database_id.*your-database-id-here" wrangler.toml; then
        sed -i.bak "s/database_id = \"your-database-id-here\"/database_id = \"$DB_ID\"/" wrangler.toml
        rm -f wrangler.toml.bak
        print_success "wrangler.tomlを更新しました。"
    else
        print_warning "wrangler.tomlは既に正しいdatabase_idを持っているようです。"
    fi
else
    print_error "wrangler.tomlファイルが見つかりません。"
    exit 1
fi

# マイグレーションの実行
print_info "データベーススキーマを作成しています..."
if [ -f "migrations/001_initial_pets_schema.sql" ]; then
    wrangler d1 execute pawmatch-db --local --file=migrations/001_initial_pets_schema.sql
    print_success "ローカルデータベースのスキーマを作成しました。"
    
    # 本番環境にも適用するか確認
    echo ""
    read -p "本番環境にもスキーマを適用しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        wrangler d1 execute pawmatch-db --file=migrations/001_initial_pets_schema.sql
        print_success "本番データベースのスキーマを作成しました。"
    else
        print_info "本番環境へのスキーマ適用をスキップしました。"
        print_info "後で手動で実行する場合: wrangler d1 execute pawmatch-db --file=migrations/001_initial_pets_schema.sql"
    fi
else
    print_error "マイグレーションファイルが見つかりません: migrations/001_initial_pets_schema.sql"
    exit 1
fi

# package.jsonにD1関連のスクリプトを追加
print_info "package.jsonにD1関連のスクリプトを追加しています..."
if command -v node &> /dev/null; then
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        const newScripts = {
            'd1:local': 'wrangler d1 execute pawmatch-db --local --command',
            'd1:remote': 'wrangler d1 execute pawmatch-db --command',
            'd1:studio': 'wrangler d1 info pawmatch-db',
            'd1:backup': 'wrangler d1 export pawmatch-db --output=backup.sql',
            'migrate:local': 'wrangler d1 execute pawmatch-db --local --file=migrations/001_initial_pets_schema.sql',
            'migrate:remote': 'wrangler d1 execute pawmatch-db --file=migrations/001_initial_pets_schema.sql'
        };
        
        let updated = false;
        for (const [key, value] of Object.entries(newScripts)) {
            if (!pkg.scripts[key]) {
                pkg.scripts[key] = value;
                updated = true;
            }
        }
        
        if (updated) {
            fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
            console.log('✅ package.jsonにD1スクリプトを追加しました。');
        } else {
            console.log('ℹ️  D1スクリプトは既に存在します。');
        }
    "
else
    print_warning "Node.jsが見つからないため、package.jsonの更新をスキップしました。"
fi

echo ""
print_success "D1データベースのセットアップが完了しました！"
echo ""
print_info "利用可能なコマンド:"
echo "  npm run d1:local \"SELECT * FROM animals LIMIT 5\"  # ローカルDB照会"
echo "  npm run d1:remote \"SELECT * FROM animals LIMIT 5\" # 本番DB照会"
echo "  npm run d1:studio                                   # データベース情報表示"
echo "  npm run migrate:local                               # ローカルマイグレーション"
echo "  npm run migrate:remote                              # 本番マイグレーション"
echo ""
print_info "データベースID: $DB_ID"
print_info "次のステップ: npm run crawl を実行してデータを取得してください。"