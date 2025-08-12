#!/bin/bash

# Dog-app: packages/dog-app または packages/shared に変更があった場合のみビルド
echo "🔍 Checking for changes in dog-app or shared packages..."

if git diff HEAD^ HEAD --quiet -- packages/dog-app packages/shared; then
  echo "✅ No changes in dog-app or shared - skipping build"
  exit 0
else
  echo "🚀 Changes detected in dog-app or shared - proceeding with build"
  exit 1
fi