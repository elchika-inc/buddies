#!/bin/bash

# sync-shared.sh - sharedパッケージを各パッケージにコピーするスクリプト

echo "🔄 Syncing shared code to packages..."

# スクリプトのディレクトリから相対パスを解決
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$ROOT_DIR"

# 既存のsharedディレクトリを削除
echo "📦 Removing existing shared directories..."
rm -rf packages/dog/src/shared
rm -rf packages/cat/src/shared

# sharedパッケージをコピー
echo "📋 Copying shared package to dog..."
mkdir -p packages/dog/src/shared
cp -r packages/shared/src/* packages/dog/src/shared/

echo "📋 Copying shared package to cat..."
mkdir -p packages/cat/src/shared
cp -r packages/shared/src/* packages/cat/src/shared/

# インポートパスを修正
echo "🔧 Fixing import paths in dog..."
find packages/dog/src/shared -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|'../|'@/shared/|g"

echo "🔧 Fixing import paths in cat..."
find packages/cat/src/shared -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|'../|'@/shared/|g"

echo "✅ Sync completed successfully!"