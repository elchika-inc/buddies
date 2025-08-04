import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import { format } from 'date-fns';
import { logger } from '../utils/logger.js';
import { delay, randomDelay } from '../utils/delay.js';
import type { RawPetData, CrawlerConfig, CrawlerResult, DogSpecificData, CatSpecificData } from '../types/index.js';

export class PetHomeCrawler {
  private browser: Browser | null = null;
  private config: CrawlerConfig;

  constructor(config: Partial<CrawlerConfig> = {}) {
    this.config = {
      baseUrl: 'https://www.pet-home.jp',
      maxPages: 10,
      delayMs: 2000,
      outputDir: './data',
      enableImages: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...config,
    };
  }

  async init(): Promise<void> {
    logger.info('Initializing Pet Home crawler...');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    const page = await this.browser.newPage();
    await page.setUserAgent(this.config.userAgent!);
    await page.setViewportSize({ width: 1280, height: 720 });
    
    return page;
  }

  async crawlDogs(): Promise<CrawlerResult> {
    return this.crawlPets('dogs');
  }

  async crawlCats(): Promise<CrawlerResult> {
    return this.crawlPets('cats');
  }

  private async crawlPets(animalType: 'dogs' | 'cats'): Promise<CrawlerResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsFound = 0;
    let itemsProcessed = 0;
    const species = animalType === 'dogs' ? 'dog' : 'cat';

    try {
      await this.init();
      logger.info(`Starting ${animalType} data crawling from Pet Home...`);

      const page = await this.createPage();
      const allPets: RawPetData[] = [];

      // 動物の里親募集ページをクロール
      for (let pageNum = 1; pageNum <= this.config.maxPages!; pageNum++) {
        try {
          logger.info(`Crawling page ${pageNum}...`);
          
          const petsUrl = `${this.config.baseUrl}/${animalType}/pg:${pageNum}/`;
          await page.goto(petsUrl, { waitUntil: 'networkidle' });
          
          // ページが正しく読み込まれているかチェック
          const content = await page.content();
          if (content.includes('404') || content.includes('ページが見つかりません')) {
            logger.warn(`Page ${pageNum} not found, stopping crawl`);
            break;
          }

          // 動物の一覧を取得
          const petCards = await page.$$('.animal-card, .pet-card, [data-pet-id]');
          
          if (petCards.length === 0) {
            logger.warn(`No ${animalType} cards found on page ${pageNum}`);
            break;
          }

          itemsFound += petCards.length;

          for (const card of petCards) {
            try {
              // 各動物の詳細ページリンクを取得
              const linkElement = await card.$(`a[href*="/${animalType}/"]`);
              if (!linkElement) continue;

              const detailUrl = await linkElement.getAttribute('href');
              if (!detailUrl) continue;

              const fullUrl = detailUrl.startsWith('http') 
                ? detailUrl 
                : `${this.config.baseUrl}${detailUrl}`;

              // 詳細ページをクロール
              const petData = await this.crawlPetDetail(fullUrl, species);
              if (petData) {
                allPets.push(petData);
                itemsProcessed++;
                logger.debug(`Processed ${species}: ${petData.name}`);
              }

              // レート制限対策
              await randomDelay(1000, 3000);

            } catch (error) {
              const errorMessage = `Failed to process ${species} card: ${error}`;
              logger.error(errorMessage);
              errors.push(errorMessage);
            }
          }

          // ページ間の遅延
          await delay(this.config.delayMs!);

        } catch (error) {
          const errorMessage = `Failed to crawl page ${pageNum}: ${error}`;
          logger.error(errorMessage);
          errors.push(errorMessage);
        }
      }

      await page.close();

      // データを保存
      const outputFile = await this.saveData(allPets, animalType);
      
      const duration = Date.now() - startTime;
      logger.info(`Crawling completed. Found ${itemsFound} items, processed ${itemsProcessed} items in ${duration}ms`);

      return {
        success: true,
        itemsFound,
        itemsProcessed,
        errors,
        outputFile,
        duration,
      };

    } catch (error) {
      const errorMessage = `Crawler failed: ${error}`;
      logger.error(errorMessage);
      errors.push(errorMessage);

      return {
        success: false,
        itemsFound,
        itemsProcessed,
        errors,
        duration: Date.now() - startTime,
      };
    } finally {
      await this.close();
    }
  }

  private async crawlPetDetail(url: string, species: 'dog' | 'cat'): Promise<RawPetData | null> {
    const page = await this.createPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      const content = await page.content();
      const $ = cheerio.load(content);

      // 基本情報を抽出
      const name = this.extractText($, '.pet-name, .animal-name, h1');
      const breed = this.extractText($, '.breed, .pet-breed, [class*="breed"]');
      const age = this.extractText($, '.age, .pet-age, [class*="age"]');
      const gender = this.extractGender($, '.gender, .pet-gender, [class*="gender"]');
      const size = this.extractText($, '.size, .pet-size, [class*="size"]');
      const location = this.extractText($, '.location, .pet-location, [class*="location"]');
      const description = this.extractText($, '.description, .pet-description, .detail-text');

      // 画像を取得
      const imageUrls = this.extractImages($);

      // 保護団体情報
      const rescueOrganization = this.extractText($, '.organization, .shelter, [class*="organization"]');
      const contact = this.extractText($, '.contact, .phone, [class*="contact"]');

      // 健康情報
      const healthInfo = this.extractHealthInfo($);

      // 性格情報
      const personality = this.extractPersonality($);

      // 種別専用情報
      const specificInfo = species === 'dog' 
        ? this.extractDogSpecificInfo($)
        : this.extractCatSpecificInfo($);

      if (!name || !breed) {
        logger.warn(`Incomplete data for ${url}`);
        return null;
      }

      const petData: RawPetData = {
        name: name.trim(),
        species,
        breed: breed.trim(),
        age: age.trim(),
        gender: gender === 'オス' || gender.includes('男') ? 'male' : 'female',
        size: species === 'dog' ? this.normalizeDogSize(size) : undefined,
        description: description.trim(),
        imageUrls,
        location: location.trim(),
        rescueOrganization: rescueOrganization.trim(),
        contact: contact.trim(),
        healthInfo,
        personality,
        sourceUrl: url,
        scrapedAt: new Date(),
      };

      return petData;

    } catch (error) {
      logger.error(`Failed to crawl ${species} detail from ${url}:`, error);
      return null;
    } finally {
      await page.close();
    }
  }

  private extractText($: cheerio.CheerioAPI, selector: string): string {
    return $(selector).first().text().trim() || '';
  }

  private extractGender($: cheerio.CheerioAPI, selector: string): string {
    const text = this.extractText($, selector);
    return text || '';
  }

  private extractImages($: cheerio.CheerioAPI): string[] {
    const images: string[] = [];
    
    $('.pet-image img, .animal-image img, .photo img').each((_, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (src) {
        const fullUrl = src.startsWith('http') ? src : `${this.config.baseUrl}${src}`;
        images.push(fullUrl);
      }
    });

    return images;
  }

  private extractHealthInfo($: cheerio.CheerioAPI) {
    const healthText = this.extractText($, '.health, .medical, [class*="health"]');
    
    return {
      vaccination: healthText.includes('ワクチン') || healthText.includes('予防接種'),
      sterilization: healthText.includes('去勢') || healthText.includes('避妊'),
      healthCondition: healthText || undefined,
    };
  }

  private extractPersonality($: cheerio.CheerioAPI): string[] {
    const personality: string[] = [];
    const personalityText = this.extractText($, '.personality, .character, [class*="personality"]');
    
    if (personalityText) {
      // 一般的な性格キーワードを抽出
      const keywords = ['人懐っこい', '元気', '穏やか', '活発', '甘えん坊', '賢い', '忠実', '優しい'];
      keywords.forEach(keyword => {
        if (personalityText.includes(keyword)) {
          personality.push(keyword);
        }
      });
    }

    return personality;
  }

  private extractDogSpecificInfo($: cheerio.CheerioAPI): DogSpecificData {
    const infoText = $('.detail, .info, [class*="detail"]').text();
    
    return {
      exerciseNeeds: infoText.includes('運動量') ? this.extractText($, '[class*="exercise"]') : undefined,
      childFriendly: infoText.includes('子供') ? !infoText.includes('苦手') : undefined,
      otherDogFriendly: infoText.includes('他の犬') ? !infoText.includes('苦手') : undefined,
      apartmentFriendly: infoText.includes('マンション') || infoText.includes('アパート') ? true : undefined,
    };
  }

  private extractCatSpecificInfo($: cheerio.CheerioAPI): CatSpecificData {
    const infoText = $('.detail, .info, [class*="detail"]').text();
    
    return {
      coatLength: this.extractCoatLength(infoText),
      indoorOutdoor: this.extractIndoorOutdoor(infoText),
      multiCatFriendly: infoText.includes('多頭飼い') ? !infoText.includes('苦手') : undefined,
      vocalLevel: this.extractVocalLevel(infoText),
      activityTime: this.extractActivityTime(infoText),
      groomingRequirements: this.extractGroomingRequirements(infoText),
    };
  }

  private extractCoatLength(text: string): 'short' | 'long' | undefined {
    if (text.includes('長毛') || text.includes('ロング')) return 'long';
    if (text.includes('短毛') || text.includes('ショート')) return 'short';
    return undefined;
  }

  private extractIndoorOutdoor(text: string): 'indoor' | 'outdoor' | 'both' | undefined {
    if (text.includes('完全室内') || text.includes('室内のみ')) return 'indoor';
    if (text.includes('室内外自由') || text.includes('外にも出る')) return 'both';
    return 'indoor'; // デフォルトは室内飼い
  }

  private extractVocalLevel(text: string): string | undefined {
    if (text.includes('よく鳴く') || text.includes('おしゃべり')) return 'よく鳴く';
    if (text.includes('静か') || text.includes('無口')) return '静か';
    return '普通';
  }

  private extractActivityTime(text: string): string | undefined {
    if (text.includes('夜型') || text.includes('夜行性')) return '夜型';
    if (text.includes('昼型') || text.includes('朝型')) return '昼型';
    return 'どちらでも';
  }

  private extractGroomingRequirements(text: string): string | undefined {
    if (text.includes('ブラッシング必要') || text.includes('手入れ必要')) return '高';
    if (text.includes('長毛')) return '高';
    if (text.includes('短毛')) return '低';
    return '低';
  }

  private normalizeDogSize(size: string): string {
    const sizeStr = size.toLowerCase();
    if (sizeStr.includes('小') || sizeStr.includes('small')) return '小型犬';
    if (sizeStr.includes('中') || sizeStr.includes('medium')) return '中型犬';
    if (sizeStr.includes('大') || sizeStr.includes('large')) return '大型犬';
    return size;
  }

  private async saveData(data: RawPetData[], animalType: 'dogs' | 'cats'): Promise<string> {
    await fs.ensureDir(this.config.outputDir!);
    
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `pet-home-${animalType}_${timestamp}.json`;
    const filepath = path.join(this.config.outputDir!, filename);
    
    await fs.writeJson(filepath, data, { spaces: 2 });
    
    logger.info(`Data saved to ${filepath}`);
    return filepath;
  }
}

// 実行可能なスクリプトとして使用する場合
if (import.meta.url === `file://${process.argv[1]}`) {
  const crawler = new PetHomeCrawler({
    maxPages: 5, // テスト用に少なめに設定
  });

  crawler.crawlDogs()
    .then(result => {
      console.log('Crawling result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Crawler error:', error);
      process.exit(1);
    });
}