#!/usr/bin/env node

import { PetHomeCrawler } from './crawlers/pet-home-crawler';
import { PET_HOME_CAT_CONFIG, PET_HOME_DOG_CONFIG, ConfigBuilder, validateConfig, loadConfigFromEnv } from './config/crawler-config';
import { PetType, CrawlerConfig } from './types';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const petType = args[1] as PetType;

  try {
    switch (command) {
      case 'crawl':
        if (!petType || !['cat', 'dog'].includes(petType)) {
          console.error('Usage: npm run dev crawl <cat|dog> [options]');
          process.exit(1);
        }
        await runCrawler(petType);
        break;

      case 'test':
        if (!petType || !['cat', 'dog'].includes(petType)) {
          console.error('Usage: npm run dev test <cat|dog>');
          process.exit(1);
        }
        await runTestCrawler(petType);
        break;

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function runCrawler(petType: PetType) {
  console.log(`Starting ${petType} crawler...`);

  // 環境変数から設定を読み込み
  const envConfig = loadConfigFromEnv();
  
  // デフォルト設定を選択
  const baseConfig = petType === 'cat' ? PET_HOME_CAT_CONFIG : PET_HOME_DOG_CONFIG;
  
  // 設定をマージ
  const config: CrawlerConfig = {
    ...baseConfig,
    ...Object.fromEntries(
      Object.entries(envConfig).filter(([, value]) => value !== undefined)
    )
  };

  // 設定の検証
  const validationErrors = validateConfig(config);
  if (validationErrors.length > 0) {
    console.error('Configuration errors:');
    validationErrors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
  }

  const crawler = new PetHomeCrawler(config, petType);
  const result = await crawler.run();

  if (result.success) {
    console.log('\n✅ Crawling completed successfully!');
    console.log(`📊 Results: ${result.successfulItems}/${result.totalItems} items extracted`);
  } else {
    console.log('\n❌ Crawling failed');
    console.log(`🔍 Check logs for details. Errors: ${result.errors.length}`);
    process.exit(1);
  }
}

async function runTestCrawler(petType: PetType) {
  console.log(`Running test crawler for ${petType}...`);

  const config = ConfigBuilder
    .forTesting()
    .setMaxPages(1)
    .setRequestDelay(1000)
    .build();

  const crawler = new PetHomeCrawler(config, petType);
  const result = await crawler.run();

  console.log('\n=== Test Results ===');
  console.log(`Success: ${result.success}`);
  console.log(`Items processed: ${result.successfulItems}/${result.totalItems}`);
  console.log(`Errors: ${result.errors.length}`);
  
  if (result.errors.length > 0) {
    console.log('\nFirst 3 errors:');
    result.errors.slice(0, 3).forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }
}

function showHelp() {
  console.log(`
PawMatch Web Crawler

Usage:
  npm run dev crawl <cat|dog>    Run full crawler for cats or dogs
  npm run dev test <cat|dog>     Run test crawler (1 page only)
  npm run dev help               Show this help

Environment Variables:
  CRAWLER_BASE_URL              Base URL for crawling (default: https://www.pet-home.jp)
  CRAWLER_MAX_PAGES             Maximum pages to crawl (default: 5)
  CRAWLER_REQUEST_DELAY         Delay between requests in ms (default: 2500)
  CRAWLER_MAX_RETRIES           Maximum retry attempts (default: 3)
  CRAWLER_TIMEOUT              Request timeout in ms (default: 30000)
  CRAWLER_USER_AGENT           User agent string
  CRAWLER_OUTPUT_DIR           Output directory path

Examples:
  npm run dev crawl cat         # Crawl cat data
  npm run dev crawl dog         # Crawl dog data
  npm run dev test cat          # Test cat crawler

Output:
  Results are saved to the output directory as JSON files with timestamps.
  Summary files are also generated with crawling statistics and errors.
  `);
}

// スクリプトが直接実行された場合のみmain()を呼び出す
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}