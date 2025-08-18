#!/usr/bin/env node

import { PetHomeCrawler } from './pet-home-crawler';
import { PET_HOME_DOG_CONFIG } from '../config/crawler-config';

async function main() {
  console.log('🐕 Starting Dog Crawler...');
  
  const crawler = new PetHomeCrawler(PET_HOME_DOG_CONFIG, 'dog');
  
  try {
    const result = await crawler.run();
    
    if (result.success) {
      console.log('\n✅ Dog crawling completed successfully!');
    } else {
      console.log('\n❌ Dog crawling failed');
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