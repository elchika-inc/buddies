#!/usr/bin/env node

import { Browser, chromium, Page } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface DogData {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  size: string;
  color: string;
  weight: number;
  prefecture: string;
  city: string;
  location: string;
  description: string;
  personality: string[];
  medicalInfo: string;
  careRequirements: string[];
  imageUrl: string;
  localImagePath: string;
  shelterName: string;
  shelterContact: string;
  goodWithKids: boolean;
  goodWithDogs: boolean;
  exerciseLevel: string;
  trainingLevel: string;
  walkFrequency: string;
  needsYard: boolean;
  apartmentFriendly: boolean;
  createdAt: string;
  sourceUrl: string;
}

class DogTestCrawler {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init() {
    this.browser = await chromium.launch({
      headless: false, // デバッグのため一時的にfalse
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    this.page = await context.newPage();
    
    // CSS/フォントのみブロック（画像は必要）
    await this.page.route('**/*.{css,woff,woff2}', route => {
      route.abort();
    });
  }

  async testDogSite(): Promise<void> {
    console.log('🐕 犬データサイトのテストを開始...\n');
    
    // 画像保存ディレクトリを作成
    const imageDir = join(process.cwd(), 'test-output', 'dog-images');
    if (!existsSync(imageDir)) {
      mkdirSync(imageDir, { recursive: true });
    }

    try {
      // 犬一覧ページに移動
      console.log('📍 犬一覧ページにアクセス...');
      await this.page!.goto('https://www.pet-home.jp/dogs/', { 
        waitUntil: 'domcontentloaded' 
      });

      await this.page!.waitForTimeout(2000);
      
      // ページタイトルを確認
      const title = await this.page!.title();
      console.log(`📄 ページタイトル: ${title}`);
      
      // 犬のURLを取得
      const dogUrls = await this.extractDogUrls(5);
      console.log(`\n📋 ${dogUrls.length}件の犬URLを発見:`);
      dogUrls.forEach(url => console.log(`  - ${url}`));
      
      if (dogUrls.length === 0) {
        console.log('⚠️ 犬のURLが見つかりませんでした');
        return;
      }
      
      // 最初の犬の詳細を取得
      console.log('\n🔍 最初の犬の詳細を取得...');
      const firstDog = await this.crawlSingleDog(dogUrls[0], imageDir);
      
      if (firstDog) {
        console.log('\n✅ 取得した犬データ:');
        console.log(JSON.stringify(firstDog, null, 2));
        
        // テスト結果を保存
        const outputFile = join(process.cwd(), 'test-output', 'test-dog-data.json');
        writeFileSync(outputFile, JSON.stringify({
          testDate: new Date().toISOString(),
          source: 'https://www.pet-home.jp/dogs/',
          result: 'success',
          data: firstDog
        }, null, 2));
        
        console.log(`\n💾 テスト結果を保存: ${outputFile}`);
      }
      
    } catch (error) {
      console.error('❌ エラー:', error);
    }
  }

  private async extractDogUrls(limit: number): Promise<string[]> {
    const urls: string[] = [];
    
    // 犬URLを抽出（猫と同じパターンかチェック）
    const linkSelectors = [
      'a[href*="/dogs/"][href*="/pn"]',
      'a[href*="/dogs/"]',
      '.pet-list a',
      '.pet-item a'
    ];

    for (const selector of linkSelectors) {
      try {
        const hrefs = await this.page!.$$eval(selector, elements => 
          elements.map(el => (el as HTMLAnchorElement).href)
        );
        
        console.log(`  セレクター "${selector}" で ${hrefs.length}件発見`);
        
        for (const href of hrefs) {
          if (href && this.isValidDogUrl(href)) {
            urls.push(href);
          }
          
          if (urls.length >= limit) break;
        }
      } catch (e) {
        console.log(`  セレクター "${selector}" は見つかりませんでした`);
      }
      
      if (urls.length >= limit) break;
    }

    // 重複除去して指定件数に制限
    return [...new Set(urls)].slice(0, limit);
  }

  private isValidDogUrl(url: string): boolean {
    // 犬詳細ページのパターンをチェック
    return /\/dogs\/[^\/]+\/pn\d+\/$/.test(url);
  }

  private async crawlSingleDog(url: string, imageDir: string): Promise<DogData | null> {
    await this.page!.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page!.waitForTimeout(2000);
    
    // IDを抽出
    const idMatch = url.match(/\/pn(\d+)\//);
    if (!idMatch) return null;
    
    const id = idMatch[1];
    console.log(`  ID: ${id}`);
    
    // 基本情報を抽出
    const name = await this.extractText('h1, .pet-name, .title') || `犬ちゃん${id}`;
    console.log(`  名前: ${name}`);
    
    // 詳細情報を探索
    const details = await this.extractDetails();
    console.log(`  詳細情報:`, details);
    
    // 画像をダウンロード
    const localImagePath = await this.downloadDogImage(id, imageDir);
    
    // 地域情報を抽出
    const regionMatch = url.match(/\/dogs\/([^\/]+)\//);
    const region = regionMatch?.[1] || 'unknown';
    const locationInfo = this.getLocationFromRegion(region);

    // 説明文を抽出
    const description = await this.extractDescription() || 
      `${name}は素敵な犬ちゃんです。新しい家族を待っています。`;

    const dog: DogData = {
      id,
      name: this.cleanName(name),
      breed: details.breed || '雑種',
      age: this.extractAgeFromName(name),
      gender: this.extractGenderFromName(name),
      size: details.size || this.extractSizeFromName(name),
      color: this.extractColorFromName(name),
      weight: details.weight || Math.floor(Math.random() * 10) + 5,
      prefecture: locationInfo.prefecture,
      city: locationInfo.city,
      location: `${locationInfo.prefecture}${locationInfo.city}`,
      description,
      personality: this.extractPersonalityFromName(name),
      medicalInfo: 'ワクチン接種済み、健康チェック済み',
      careRequirements: ['定期的な散歩', '定期健診', '愛情たっぷり'],
      imageUrl: `/images/dog-${id}.jpg`,
      localImagePath,
      shelterName: `${locationInfo.prefecture}動物保護センター`,
      shelterContact: 'pethome@example.com',
      goodWithKids: true,
      goodWithDogs: true,
      exerciseLevel: '中',
      trainingLevel: '基本的なしつけ済み',
      walkFrequency: '1日2回',
      needsYard: false,
      apartmentFriendly: details.size === '小型' ? true : false,
      createdAt: new Date().toISOString(),
      sourceUrl: url
    };

    return dog;
  }

  private async extractDetails(): Promise<any> {
    const details: any = {};
    
    // テーブルや詳細セクションを探す
    const selectors = [
      'table tr',
      '.detail-item',
      '.pet-info li',
      'dl dt, dl dd'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = await this.page!.$$(selector);
        for (const element of elements) {
          const text = await element.textContent();
          if (text) {
            // サイズを探す
            if (text.includes('小型') || text.includes('中型') || text.includes('大型')) {
              details.size = text.includes('小型') ? '小型' : 
                           text.includes('中型') ? '中型' : '大型';
            }
            // 犬種を探す
            if (text.includes('犬種') || text.includes('品種')) {
              details.breed = text.replace(/犬種|品種|：|:/g, '').trim();
            }
            // 体重を探す
            if (text.includes('kg') || text.includes('キロ')) {
              const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*kg/);
              if (weightMatch) {
                details.weight = parseFloat(weightMatch[1]);
              }
            }
          }
        }
      } catch {}
    }
    
    return details;
  }

  private async downloadDogImage(id: string, imageDir: string): Promise<string> {
    const filename = `dog-${id}.jpg`;
    const filepath = join(imageDir, filename);
    
    // 現在のページURLから地域を取得
    const currentUrl = await this.page!.url();
    const regionMatch = currentUrl.match(/\/dogs\/([^\/]+)\//);
    const region = regionMatch?.[1] || 'tokyo';
    
    // 直接画像ページのURLを構築（猫と同じパターンか確認）
    const imagePageUrl = `https://www.pet-home.jp/dogs/${region}/pn${id}/images_1/`;
    console.log(`    🔍 画像ページへアクセス: ${imagePageUrl}`);
    
    try {
      // 画像ページに移動
      await this.page!.goto(imagePageUrl, { waitUntil: 'domcontentloaded' });
      await this.page!.waitForTimeout(1000);
      
      // メイン画像を取得
      const mainImageSelector = 'figure img, img[alt*="サムネイル1"], .main-image img';
      const imgElement = await this.page!.$(mainImageSelector);
      
      if (imgElement) {
        const src = await imgElement.getAttribute('src');
        if (src && this.isValidImageUrl(src)) {
          const fullImageUrl = src.startsWith('http') ? src : `https://www.pet-home.jp${src}`;
          console.log(`    📷 画像URL: ${fullImageUrl}`);
          
          // 画像をダウンロード
          const response = await this.page!.goto(fullImageUrl);
          if (response && response.ok()) {
            const buffer = await response.body();
            writeFileSync(filepath, buffer);
            console.log(`    💾 保存: ${filename}`);
            return filepath;
          }
        }
      }
      
      console.log(`    ❌ メイン画像が見つかりませんでした`);
      
    } catch (error) {
      console.log(`    ⚠️ 画像取得エラー: ${error.message}`);
    }
    
    return '';
  }

  private async extractText(selector: string): Promise<string> {
    try {
      const element = await this.page!.$(selector);
      if (element) {
        const text = await element.textContent();
        return text?.trim() || '';
      }
    } catch {}
    return '';
  }

  private async extractDescription(): Promise<string> {
    const selectors = ['.description', '.pet-description', '.detail', '.content', 'p'];
    
    for (const selector of selectors) {
      try {
        const elements = await this.page!.$$(selector);
        for (const element of elements) {
          const text = await element.textContent();
          if (text && text.length > 20 && !text.includes('©') && !text.includes('広告')) {
            return text.trim().substring(0, 200);
          }
        }
      } catch {}
    }
    return '';
  }

  private isValidImageUrl(url: string): boolean {
    if (!url) return false;
    
    const excludePatterns = ['icon', 'logo', 'banner', 'ad', 'button', 'bg'];
    if (excludePatterns.some(pattern => url.toLowerCase().includes(pattern))) {
      return false;
    }
    
    return /\.(jpg|jpeg|png|gif|webp)/i.test(url);
  }

  private cleanName(name: string): string {
    return name
      .replace(/「|」/g, '')
      .replace(/\.\.\.$/, '')
      .replace(/\s*-\s*犬の里親募集\(\d+\)/, '')
      .replace(/[県府]$/, '')
      .trim();
  }

  private extractAgeFromName(name: string): number {
    if (name.includes('子犬') || name.includes('パピー')) return 0.5;
    if (name.includes('1歳')) return 1;
    if (name.includes('シニア') || name.includes('高齢')) return 8;
    return 3; // デフォルト
  }

  private extractGenderFromName(name: string): string {
    if (name.includes('くん') || name.includes('男の子') || name.includes('♂')) return '男の子';
    if (name.includes('ちゃん') || name.includes('女の子') || name.includes('♀')) return '女の子';
    return '不明';
  }

  private extractSizeFromName(name: string): string {
    if (name.includes('小型')) return '小型';
    if (name.includes('中型')) return '中型';
    if (name.includes('大型')) return '大型';
    return '中型'; // デフォルト
  }

  private extractColorFromName(name: string): string {
    if (name.includes('茶') || name.includes('ブラウン')) return '茶色';
    if (name.includes('白')) return '白';
    if (name.includes('黒')) return '黒';
    if (name.includes('柴')) return '茶色';
    return '茶白';
  }

  private extractPersonalityFromName(name: string): string[] {
    const personalities: string[] = [];
    if (name.includes('甘え') || name.includes('甘い')) personalities.push('甘えん坊');
    if (name.includes('元気') || name.includes('やんちゃ')) personalities.push('元気', '遊び好き');
    if (name.includes('おとなしい') || name.includes('静か')) personalities.push('おとなしい');
    if (name.includes('人懐っこい') || name.includes('フレンドリー')) personalities.push('人懐っこい');
    
    if (personalities.length === 0) {
      personalities.push('人懐っこい', '忠実');
    }
    return personalities;
  }

  private getLocationFromRegion(region: string): { prefecture: string; city: string } {
    const regionMap: Record<string, { prefecture: string; city: string }> = {
      'tokyo': { prefecture: '東京都', city: '新宿区' },
      'osaka': { prefecture: '大阪府', city: '大阪市' },
      'kyoto': { prefecture: '京都府', city: '京都市' },
      'hyogo': { prefecture: '兵庫県', city: '神戸市' },
      'aichi': { prefecture: '愛知県', city: '名古屋市' },
      'kanagawa': { prefecture: '神奈川県', city: '横浜市' },
      'saitama': { prefecture: '埼玉県', city: 'さいたま市' },
      'chiba': { prefecture: '千葉県', city: '千葉市' },
      'fukuoka': { prefecture: '福岡県', city: '福岡市' },
      'hukuoka': { prefecture: '福岡県', city: '福岡市' },
      'hokkaido': { prefecture: '北海道', city: '札幌市' },
      'sendai': { prefecture: '宮城県', city: '仙台市' },
      'hiroshima': { prefecture: '広島県', city: '広島市' },
    };

    return regionMap[region] || { prefecture: '東京都', city: '新宿区' };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const crawler = new DogTestCrawler();
  
  try {
    await crawler.init();
    console.log('🚀 犬データクローラーテスト開始...\n');
    
    await crawler.testDogSite();
    
    console.log('\n✅ テスト完了!');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await crawler.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}