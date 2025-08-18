import { BrowserManager } from '../utils/browser-manager';
import { DataCleaner } from '../utils/data-cleaner';
import { CrawlerConfig, CrawlingResult, PageInfo, RawPetData, PetType, CrawlerError } from '../types';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export abstract class BaseCrawler {
  protected browserManager: BrowserManager;
  protected config: CrawlerConfig;
  protected petType: PetType;
  protected results: CrawlingResult;
  protected errors: CrawlerError[] = [];

  constructor(config: CrawlerConfig, petType: PetType) {
    this.config = config;
    this.petType = petType;
    this.browserManager = new BrowserManager(config);
    this.results = {
      success: false,
      totalPages: 0,
      totalItems: 0,
      successfulItems: 0,
      failedItems: 0,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString()
    };
  }

  abstract getListPageUrl(pageNumber?: number): string;
  abstract extractItemUrls(): Promise<string[]>;
  abstract extractPetData(url: string): Promise<RawPetData>;

  protected async initializeBrowser(): Promise<void> {
    try {
      await this.browserManager.initialize();
      console.log('Browser initialized successfully');
    } catch (error) {
      this.addError('browser', 'Failed to initialize browser', undefined, error as Error);
      throw error;
    }
  }

  protected async closeBrowser(): Promise<void> {
    try {
      await this.browserManager.close();
      console.log('Browser closed successfully');
    } catch (error) {
      this.addError('browser', 'Failed to close browser', undefined, error as Error);
    }
  }

  protected async delay(): Promise<void> {
    await this.browserManager.delay(this.config.requestDelay);
  }

  protected addError(type: CrawlerError['type'], message: string, url?: string, error?: Error): void {
    const crawlerError: CrawlerError = {
      type,
      message,
      url,
      timestamp: new Date().toISOString(),
      stack: error?.stack
    };

    this.errors.push(crawlerError);
    console.error(`[${type}] ${message}`, url ? `URL: ${url}` : '', error?.message || '');
  }

  protected async crawlListPages(): Promise<string[]> {
    const allUrls: string[] = [];
    
    console.log(`Starting to crawl list pages (max: ${this.config.maxPages})`);
    
    for (let pageNum = 1; pageNum <= this.config.maxPages; pageNum++) {
      try {
        const listUrl = this.getListPageUrl(pageNum);
        console.log(`Crawling list page ${pageNum}: ${listUrl}`);
        
        const success = await this.browserManager.navigateToPage(listUrl);
        if (!success) {
          this.addError('network', `Failed to load list page ${pageNum}`, listUrl);
          continue;
        }

        // ページの読み込み完了を待つ
        await this.browserManager.waitForSelector('body', 5000);
        await this.delay();

        const urls = await this.extractItemUrls();
        console.log(`Found ${urls.length} items on page ${pageNum}`);
        
        if (urls.length === 0) {
          console.log(`No items found on page ${pageNum}, stopping pagination`);
          break;
        }

        allUrls.push(...urls);
        this.results.totalPages = pageNum;
        
        // 次のページに進む前の待機
        await this.delay();
        
      } catch (error) {
        this.addError('parsing', `Error crawling list page ${pageNum}`, undefined, error as Error);
        continue;
      }
    }

    // 重複除去
    const uniqueUrls = [...new Set(allUrls)];
    console.log(`Total unique URLs collected: ${uniqueUrls.length}`);
    this.results.totalItems = uniqueUrls.length;

    return uniqueUrls;
  }

  protected async crawlPetDetails(urls: string[]): Promise<any[]> {
    const pets: any[] = [];
    let processed = 0;

    console.log(`Starting to crawl ${urls.length} pet detail pages`);

    for (const url of urls) {
      processed++;
      
      try {
        console.log(`Processing ${processed}/${urls.length}: ${url}`);
        
        const success = await this.browserManager.navigateToPage(url);
        if (!success) {
          this.addError('network', `Failed to load pet detail page`, url);
          this.results.failedItems++;
          continue;
        }

        // ページの読み込み完了を待つ
        await this.browserManager.waitForSelector('body', 5000);
        
        const rawData = await this.extractPetData(url);
        
        if (!rawData.name) {
          this.addError('validation', 'Pet data missing required fields', url);
          this.results.failedItems++;
          continue;
        }

        // データクレンジング
        const cleanedData = this.petType === 'dog' 
          ? DataCleaner.toDog(rawData, url)
          : DataCleaner.toCat(rawData, url);

        pets.push(cleanedData);
        this.results.successfulItems++;
        
        // プログレス表示
        if (processed % 10 === 0) {
          console.log(`Progress: ${processed}/${urls.length} (${Math.round(processed/urls.length*100)}%)`);
        }
        
        await this.delay();
        
      } catch (error) {
        this.addError('parsing', `Error extracting pet data`, url, error as Error);
        this.results.failedItems++;
        continue;
      }
    }

    return pets;
  }

  protected generateId(url: string, name: string): string {
    const urlMatch = url.match(/\/(\d+)\//);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // URLからIDが取れない場合は名前とタイムスタンプから生成
    const timestamp = Date.now().toString(36);
    const nameHash = name.replace(/\s/g, '').slice(0, 10);
    return `${nameHash}_${timestamp}`;
  }

  protected async saveResults(pets: any[]): Promise<void> {
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${this.petType}-data-${timestamp}.json`;
    const filepath = join(this.config.outputDir, filename);

    const outputData = {
      metadata: {
        type: this.petType,
        crawledAt: this.results.timestamp,
        totalItems: pets.length,
        source: this.config.baseUrl,
        crawlerVersion: '1.0.0'
      },
      data: pets
    };

    writeFileSync(filepath, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`Results saved to: ${filepath}`);

    // サマリーファイルも保存
    const summaryFilename = `crawler-summary-${timestamp}.json`;
    const summaryFilepath = join(this.config.outputDir, summaryFilename);
    
    const summary = {
      ...this.results,
      errors: this.errors.map(e => ({
        type: e.type,
        message: e.message,
        url: e.url,
        timestamp: e.timestamp
      }))
    };

    writeFileSync(summaryFilepath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`Summary saved to: ${summaryFilepath}`);
  }

  public async run(): Promise<CrawlingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting ${this.petType} crawler...`);
      console.log(`Target: ${this.config.baseUrl}`);
      console.log(`Max pages: ${this.config.maxPages}`);
      console.log(`Request delay: ${this.config.requestDelay}ms`);
      
      await this.initializeBrowser();
      
      // リストページからURLを収集
      const itemUrls = await this.crawlListPages();
      
      if (itemUrls.length === 0) {
        throw new Error('No pet URLs found');
      }
      
      // 詳細ページをクロール
      const pets = await this.crawlPetDetails(itemUrls);
      
      // 結果を保存
      await this.saveResults(pets);
      
      this.results.success = true;
      this.results.duration = Date.now() - startTime;
      this.results.errors = this.errors.map(e => e.message);
      
      console.log('\n=== Crawling Summary ===');
      console.log(`Total pages processed: ${this.results.totalPages}`);
      console.log(`Total items found: ${this.results.totalItems}`);
      console.log(`Successful extractions: ${this.results.successfulItems}`);
      console.log(`Failed extractions: ${this.results.failedItems}`);
      console.log(`Success rate: ${Math.round(this.results.successfulItems / this.results.totalItems * 100)}%`);
      console.log(`Duration: ${Math.round(this.results.duration / 1000)}s`);
      console.log(`Errors: ${this.errors.length}`);
      
    } catch (error) {
      this.addError('system', 'Crawler failed', undefined, error as Error);
      this.results.success = false;
      this.results.duration = Date.now() - startTime;
      this.results.errors = this.errors.map(e => e.message);
      
      console.error('Crawler failed:', error);
      throw error;
      
    } finally {
      await this.closeBrowser();
    }
    
    return this.results;
  }
}