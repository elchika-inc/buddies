#!/bin/bash

# ローカルでQueueのテスト

echo "=== PawMatch Queue Local Test ==="

# 1. Dispatcher のテスト
echo "Testing Dispatcher..."
curl -X POST http://localhost:8787/dispatch \
  -H "Content-Type: application/json" \
  -d '{"limit": 1}'

echo -e "\n\n=== Testing Dispatcher History ==="
curl http://localhost:8787/history

# 2. Crawler のテスト
echo -e "\n\n=== Testing Crawler ==="
curl http://localhost:8788/health

# 3. Converter のテスト
echo -e "\n\n=== Testing Converter ==="
curl http://localhost:8789/status

echo -e "\n\nTest completed!"