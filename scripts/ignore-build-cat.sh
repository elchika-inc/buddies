#!/bin/bash

# Cat-app: packages/cat-app または packages/shared に変更があった場合のみビルド
echo "🔍 Checking for changes in cat-app or shared packages..."

if git diff HEAD^ HEAD --quiet -- packages/cat-app packages/shared; then
  echo "✅ No changes in cat-app or shared - skipping build"
  exit 0
else
  echo "🚀 Changes detected in cat-app or shared - proceeding with build"
  exit 1
fi