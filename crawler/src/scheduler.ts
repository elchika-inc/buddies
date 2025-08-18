#!/usr/bin/env node

import { ScheduledCatCrawler } from './scheduled-cat-crawler';
import { CronJob } from 'cron';

console.log('🕐 PawMatch自動クローラースケジューラー起動');
console.log('📅 スケジュール: 6時間ごとに実行');
console.log('⏰ 実行時刻: 0:00, 6:00, 12:00, 18:00');

// クローラーの実行関数
async function runCrawler() {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 自動クローラー実行開始: ${new Date().toLocaleString('ja-JP')}`);
  console.log('='.repeat(60));
  
  const crawler = new ScheduledCatCrawler();
  
  try {
    await crawler.init();
    
    // 新規データを取得
    const newCats = await crawler.crawlNewCats(20);
    
    // 既存データとマージ
    await crawler.mergeWithExistingData(newCats);
    
    // CatMatchアプリにエクスポート
    if (newCats.length > 0) {
      await crawler.exportToCatMatch();
      console.log('🔄 アプリケーションデータを更新しました');
    }
    
    // 統計情報を表示
    crawler.showStatistics();
    
  } catch (error) {
    console.error('❌ クローラーエラー:', error);
  } finally {
    await crawler.close();
  }
  
  console.log('\n⏭️ 次回実行まで待機中...\n');
}

// 6時間ごとに実行するCronJobを設定
// cronパターン: '0 */6 * * *' = 毎日0,6,12,18時に実行
const job = new CronJob(
  '0 */6 * * *',
  runCrawler,
  null,
  true,
  'Asia/Tokyo'
);

// 即座に1回実行（デバッグ/初回実行用）
if (process.argv.includes('--run-now')) {
  console.log('📌 --run-now オプション: 即座に実行します');
  runCrawler().catch(console.error);
}

// プロセス終了時の処理
process.on('SIGINT', () => {
  console.log('\n👋 スケジューラーを停止しています...');
  job.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 スケジューラーを停止しています...');
  job.stop();
  process.exit(0);
});

console.log('✅ スケジューラーが開始されました');
console.log('💡 ヒント: Ctrl+C で停止できます');
console.log('💡 --run-now オプションで即座に実行できます\n');