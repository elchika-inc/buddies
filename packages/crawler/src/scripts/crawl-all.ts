#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { format } from 'date-fns';
import { PetHomeCrawler } from '../crawlers/pet-home.js';
import { DogTransformer } from '../transformers/dog-transformer.js';
import { CatTransformer } from '../transformers/cat-transformer.js';
import { logger, LogLevel } from '../utils/logger.js';
import type { RawPetData, CrawlerConfig } from '../types/index.js';

interface CrawlOptions {
  output?: string;
  maxPages?: string;
  delay?: string;
  debug?: boolean;
  transform?: boolean;
  site?: string;
  animalType?: 'dogs' | 'cats';
}

async function crawlPetHome(options: CrawlOptions): Promise<void> {
  const config: Partial<CrawlerConfig> = {
    maxPages: options.maxPages ? parseInt(options.maxPages, 10) : 10,
    delayMs: options.delay ? parseInt(options.delay, 10) : 2000,
    outputDir: options.output || './data',
  };

  const animalType = options.animalType || 'dogs';
  logger.info(`Starting Pet Home crawler for ${animalType}...`);
  logger.info('Config:', config);

  const crawler = new PetHomeCrawler(config);
  const result = animalType === 'cats' 
    ? await crawler.crawlCats()
    : await crawler.crawlDogs();

  if (result.success) {
    logger.info(`✅ Crawling completed successfully!`);
    logger.info(`📊 Items found: ${result.itemsFound}`);
    logger.info(`✨ Items processed: ${result.itemsProcessed}`);
    logger.info(`⏱️  Duration: ${Math.round(result.duration / 1000)}s`);
    
    if (result.outputFile) {
      logger.info(`📁 Data saved to: ${result.outputFile}`);
      
      // データ変換オプションが有効な場合
      if (options.transform) {
        await transformData(result.outputFile, config.outputDir!, animalType);
      }
    }
    
    if (result.errors.length > 0) {
      logger.warn(`⚠️  Errors encountered: ${result.errors.length}`);
      result.errors.forEach(error => logger.warn(`   - ${error}`));
    }
  } else {
    logger.error(`❌ Crawling failed!`);
    result.errors.forEach(error => logger.error(`   - ${error}`));
    process.exit(1);
  }
}

async function transformData(inputFile: string, outputDir: string, animalType: 'dogs' | 'cats'): Promise<void> {
  logger.info(`🔄 Transforming ${animalType} data to PawMatch format...`);
  
  try {
    // 生データを読み込み
    const rawData: RawPetData[] = await fs.readJson(inputFile);
    
    // 適切な変換器を使用
    const transformedData = animalType === 'cats'
      ? CatTransformer.transformMany(rawData)
      : DogTransformer.transformMany(rawData);
    
    // 変換後のデータを保存
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const outputFile = path.join(outputDir, `pawmatch-${animalType}_${timestamp}.json`);
    
    await fs.writeJson(outputFile, transformedData, { spaces: 2 });
    
    logger.info(`✅ Data transformed and saved to: ${outputFile}`);
    logger.info(`📊 Transformed ${transformedData.length} ${animalType}`);
    
    // 統計情報を表示
    const stats = generateStats(transformedData, animalType);
    logger.info('📈 Statistics:');
    Object.entries(stats).forEach(([key, value]) => {
      logger.info(`   - ${key}: ${value}`);
    });
    
  } catch (error) {
    logger.error(`Failed to transform data: ${error}`);
    throw error;
  }
}

function generateStats(animals: any[], animalType: 'dogs' | 'cats'): Record<string, any> {
  const stats: Record<string, any> = {
    [`Total ${animalType}`]: animals.length,
    'By gender': {},
    'By location': {},
    'Average age': 0,
  };
  
  if (animalType === 'dogs') {
    stats['By size'] = {};
  } else {
    stats['By coat length'] = {};
    stats['By social level'] = {};
  }
  
  // 共通統計
  animals.forEach(animal => {
    stats['By gender'][animal.gender] = (stats['By gender'][animal.gender] || 0) + 1;
    stats['By location'][animal.location] = (stats['By location'][animal.location] || 0) + 1;
    
    if (animalType === 'dogs') {
      stats['By size'][animal.size] = (stats['By size'][animal.size] || 0) + 1;
    } else {
      stats['By coat length'][animal.coatLength] = (stats['By coat length'][animal.coatLength] || 0) + 1;
      stats['By social level'][animal.socialLevel] = (stats['By social level'][animal.socialLevel] || 0) + 1;
    }
  });
  
  // 平均年齢
  stats['Average age'] = Math.round(
    animals.reduce((sum, animal) => sum + animal.age, 0) / animals.length * 10
  ) / 10;
  
  return stats;
}

// コマンドライン設定
program
  .name('pawmatch-crawler')
  .description('PawMatch data crawler for pet adoption websites')
  .version('1.0.0');

program
  .command('pet-home')
  .description('Crawl pets from Pet Home website')
  .option('-o, --output <dir>', 'Output directory', './data')
  .option('-p, --max-pages <number>', 'Maximum pages to crawl', '10')
  .option('-d, --delay <ms>', 'Delay between requests in milliseconds', '2000')
  .option('-a, --animal-type <type>', 'Animal type to crawl (dogs or cats)', 'dogs')
  .option('--debug', 'Enable debug logging')
  .option('-t, --transform', 'Transform data to PawMatch format')
  .action(async (options: CrawlOptions) => {
    if (options.debug) {
      logger.setLevel(LogLevel.DEBUG);
    }
    
    // 動物タイプの検証
    if (options.animalType && !['dogs', 'cats'].includes(options.animalType)) {
      logger.error('Invalid animal type. Must be "dogs" or "cats"');
      process.exit(1);
    }
    
    try {
      await crawlPetHome(options);
    } catch (error) {
      logger.error('Crawler failed:', error);
      process.exit(1);
    }
  });

program
  .command('all')
  .description('Crawl from all supported sites')
  .option('-o, --output <dir>', 'Output directory', './data')
  .option('-p, --max-pages <number>', 'Maximum pages to crawl per site', '5')
  .option('-d, --delay <ms>', 'Delay between requests in milliseconds', '2000')
  .option('--debug', 'Enable debug logging')
  .option('-t, --transform', 'Transform data to PawMatch format')
  .action(async (options: CrawlOptions) => {
    if (options.debug) {
      logger.setLevel(LogLevel.DEBUG);
    }
    
    try {
      logger.info('🚀 Starting crawl from all supported sites...');
      
      // 犬と猫の両方をクロール
      logger.info('📶 Crawling dogs...');
      await crawlPetHome({ ...options, animalType: 'dogs' });
      
      logger.info('📶 Crawling cats...');
      await crawlPetHome({ ...options, animalType: 'cats' });
      
      logger.info('🎉 All crawlers completed!');
    } catch (error) {
      logger.error('Crawl all failed:', error);
      process.exit(1);
    }
  });

// プログラム実行
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}