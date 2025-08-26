#!/bin/bash

echo "=== Checking Cron Status ==="

# 現在時刻とCronスケジュール
echo "Current time: $(date)"
echo ""
echo "Scheduled Cron times (UTC):"
echo "- Crawler:    0 */4 * * * (Every 4 hours at :00)"
echo "- Dispatcher: 15 */4 * * * (Every 4 hours at :15)"  
echo "- Converter:  30 */6 * * * (Every 6 hours at :30)"
echo ""

# 次の実行時刻を計算
current_hour=$(date +%H)
current_min=$(date +%M)

echo "Next execution times:"

# Crawler (4時間ごと、0分)
next_crawler_hour=$(( ((current_hour / 4) + 1) * 4 ))
if [ $next_crawler_hour -ge 24 ]; then
  next_crawler_hour=$(( next_crawler_hour - 24 ))
fi
echo "- Crawler:    ${next_crawler_hour}:00"

# Dispatcher (4時間ごと、15分)
if [ $current_min -lt 15 ]; then
  next_dispatcher_hour=$(( (current_hour / 4) * 4 ))
else
  next_dispatcher_hour=$(( ((current_hour / 4) + 1) * 4 ))
fi
if [ $next_dispatcher_hour -ge 24 ]; then
  next_dispatcher_hour=$(( next_dispatcher_hour - 24 ))
fi
echo "- Dispatcher: ${next_dispatcher_hour}:15"

# Converter (6時間ごと、30分)
if [ $current_min -lt 30 ]; then
  next_converter_hour=$(( (current_hour / 6) * 6 ))
else
  next_converter_hour=$(( ((current_hour / 6) + 1) * 6 ))
fi
if [ $next_converter_hour -ge 24 ]; then
  next_converter_hour=$(( next_converter_hour - 24 ))
fi
echo "- Converter:  ${next_converter_hour}:30"

echo ""
echo "To check if Cron is working:"
echo "1. Deploy: wrangler deploy (in each worker directory)"
echo "2. Monitor: wrangler tail <worker-name>"
echo "3. Dashboard: https://dash.cloudflare.com -> Workers & Pages -> Metrics"