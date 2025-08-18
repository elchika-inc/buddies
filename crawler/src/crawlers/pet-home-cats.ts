#!/usr/bin/env node

import { PetHomeCrawler } from './pet-home-crawler';
import { PET_HOME_CAT_CONFIG } from '../config/crawler-config';

async function main() {
  console.log('🐱 Starting Cat Crawler...');
  
  const crawler = new PetHomeCrawler(PET_HOME_CAT_CONFIG, 'cat');
  
  try {
    const result = await crawler.run();
    
    if (result.success) {
      console.log('\n✅ Cat crawling completed successfully!');
    } else {
      console.log('\n❌ Cat crawling failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}