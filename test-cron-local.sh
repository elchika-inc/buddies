#!/bin/bash

echo "=== PawMatch Cron Test (Local) ==="

# Cronトリガーをシミュレート（手動で呼び出し）

echo "1. Testing Crawler scheduled trigger..."
curl -X POST http://localhost:8788/scheduled \
  -H "Content-Type: application/json"

sleep 2

echo -e "\n2. Testing Dispatcher scheduled trigger (15分後想定)..."
curl -X POST http://localhost:8787/scheduled \
  -H "Content-Type: application/json"

sleep 2

echo -e "\n3. Testing Converter scheduled trigger..."
curl -X POST http://localhost:8789/scheduled \
  -H "Content-Type: application/json"

echo -e "\n\n=== Checking Queue status ==="
echo "Dispatcher history:"
curl -s http://localhost:8787/history | jq '.'

echo -e "\nConverter status:"
curl -s http://localhost:8789/status | jq '.'

echo -e "\nCron test completed!"