#!/usr/bin/env node

import { Browser, chromium, Page } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface CatData {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  coatLength: string;
  color: string;
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
  socialLevel: string;
  indoorOutdoor: string;
  groomingRequirements: string;
  vocalizationLevel: string;
  activityTime: string;
  playfulness: string;
  createdAt: string;
  sourceUrl: string;
}

class IntegratedCatCrawler {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init() {
    this.browser = await chromium.launch({
      headless: true,
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

  async crawlNewCats(limit: number = 5): Promise<CatData[]> {
    console.log(`🐱 新たに${limit}件の猫データ＋画像を取得開始...`);
    
    // 画像保存ディレクトリを作成
    const imageDir = join(process.cwd(), 'output', 'images');
    if (!existsSync(imageDir)) {
      mkdirSync(imageDir, { recursive: true });
    }

    // 猫一覧ページに移動
    await this.page!.goto('https://www.pet-home.jp/cats/status_2/', { 
      waitUntil: 'domcontentloaded' 
    });

    await this.page!.waitForTimeout(2000);
    
    // 猫のURLを取得
    const catUrls = await this.extractCatUrls(limit);
    console.log(`📋 ${catUrls.length}件の猫URLを発見`);

    const catData: CatData[] = [];

    for (let i = 0; i < catUrls.length; i++) {
      const url = catUrls[i];
      console.log(`\n📸 ${i + 1}/${catUrls.length}: ${url}`);
      
      try {
        const cat = await this.crawlSingleCat(url, imageDir);
        if (cat) {
          catData.push(cat);
          console.log(`  ✅ 完了: ${cat.name} (画像: ${cat.localImagePath})`);
        }
        
        // レート制限
        await this.page!.waitForTimeout(3000);
        
      } catch (error) {
        console.error(`  ❌ エラー: ${error.message}`);
      }
    }

    return catData;
  }

  private async extractCatUrls(limit: number): Promise<string[]> {
    const urls: string[] = [];
    
    // 猫URLを抽出
    const linkSelectors = [
      'a[href*="/cats/"]',
      'a[href*="pn"]'
    ];

    for (const selector of linkSelectors) {
      const hrefs = await this.page!.$$eval(selector, elements => 
        elements.map(el => (el as HTMLAnchorElement).href)
      );
      
      for (const href of hrefs) {
        if (href && this.isValidCatUrl(href)) {
          urls.push(href);
        }
        
        if (urls.length >= limit) break;
      }
      
      if (urls.length >= limit) break;
    }

    // 重複除去して指定件数に制限
    return [...new Set(urls)].slice(0, limit);
  }

  private isValidCatUrl(url: string): boolean {
    // 実際の猫詳細ページのパターンをチェック
    return /\/cats\/[^\/]+\/pn\d+\/$/.test(url);
  }

  private async crawlSingleCat(url: string, imageDir: string): Promise<CatData | null> {
    await this.page!.goto(url, { waitUntil: 'domcontentloaded' });
    
    // IDを抽出
    const idMatch = url.match(/\/cats\/[^\/]+\/pn(\d+)\//);
    if (!idMatch) return null;
    
    const id = idMatch[1];
    
    // 基本情報を抽出
    const name = await this.extractText('h1, .pet-name, .title') || `猫ちゃん${id}`;
    
    // 画像をダウンロード
    const localImagePath = await this.downloadCatImage(id, imageDir);
    
    // 地域情報を抽出
    const regionMatch = url.match(/\/cats\/([^\/]+)\//);
    const region = regionMatch?.[1] || 'unknown';
    const locationInfo = this.getLocationFromRegion(region);

    // 説明文を抽出
    const description = await this.extractDescription() || 
      `${name}は素敵な猫ちゃんです。新しい家族を待っています。`;

    const cat: CatData = {
      id,
      name: this.cleanName(name),
      breed: '雑種',
      age: this.extractAgeFromName(name),
      gender: this.extractGenderFromName(name),
      coatLength: '短毛',
      color: this.extractColorFromName(name),
      prefecture: locationInfo.prefecture,
      city: locationInfo.city,
      location: `${locationInfo.prefecture}${locationInfo.city}`,
      description,
      personality: this.extractPersonalityFromName(name),
      medicalInfo: 'ワクチン接種済み、健康チェック済み',
      careRequirements: ['完全室内飼い', '定期健診', '愛情たっぷり'],
      imageUrl: `/images/cat-${id}.jpg`,
      localImagePath,
      shelterName: `${locationInfo.prefecture}動物保護センター`,
      shelterContact: 'pethome@example.com',
      socialLevel: '普通',
      indoorOutdoor: '完全室内',
      groomingRequirements: '中',
      vocalizationLevel: '普通',
      activityTime: 'どちらでも',
      playfulness: '中',
      createdAt: new Date().toISOString(),
      sourceUrl: url
    };

    return cat;
  }

  private async downloadCatImage(id: string, imageDir: string): Promise<string> {
    const filename = `cat-${id}.jpg`;
    const filepath = join(imageDir, filename);
    
    // 現在のページURLから地域を取得
    const currentUrl = await this.page!.url();
    const regionMatch = currentUrl.match(/\/cats\/([^\/]+)\//);
    const region = regionMatch?.[1] || 'tokyo';
    
    // 直接画像ページのURLを構築
    const imagePageUrl = `https://www.pet-home.jp/cats/${region}/pn${id}/images_1/`;
    console.log(`    🔍 画像ページへアクセス: ${imagePageUrl}`);
    
    try {
      // 画像ページに移動
      await this.page!.goto(imagePageUrl, { waitUntil: 'domcontentloaded' });
      await this.page!.waitForTimeout(1000);
      
      // メイン画像を取得（figure内のimg要素）
      const mainImageSelector = 'figure img, img[alt*="サムネイル1"]';
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
      .replace(/\s*-\s*猫の里親募集\(\d+\)/, '')
      .replace(/[県府]$/, '')
      .trim();
  }

  private extractAgeFromName(name: string): number {
    if (name.includes('子猫') || name.includes('3ヶ月') || name.includes('4ヶ月')) return 0.3;
    if (name.includes('1歳')) return 1;
    if (name.includes('シニア') || name.includes('高齢')) return 8;
    return 2; // デフォルト
  }

  private extractGenderFromName(name: string): string {
    if (name.includes('くん') || name.includes('男の子') || name.includes('♂')) return '男の子';
    if (name.includes('ちゃん') || name.includes('女の子') || name.includes('♀')) return '女の子';
    return '不明';
  }

  private extractColorFromName(name: string): string {
    if (name.includes('茶') || name.includes('茶トラ')) return '茶トラ';
    if (name.includes('白')) return '白';
    if (name.includes('黒') || name.includes('クロ')) return '黒';
    if (name.includes('三毛')) return '三毛';
    if (name.includes('キジ')) return 'キジトラ';
    if (name.includes('ハチワレ')) return 'ハチワレ';
    return '茶白';
  }

  private extractPersonalityFromName(name: string): string[] {
    const personalities: string[] = [];
    if (name.includes('甘え') || name.includes('甘い')) personalities.push('甘えん坊');
    if (name.includes('元気') || name.includes('やんちゃ')) personalities.push('元気', '遊び好き');
    if (name.includes('おとなしい') || name.includes('静か')) personalities.push('おとなしい');
    if (name.includes('人懐っこい') || name.includes('フレンドリー')) personalities.push('人懐っこい');
    
    if (personalities.length === 0) {
      personalities.push('人懐っこい', '甘えん坊');
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
  const crawler = new IntegratedCatCrawler();
  
  try {
    await crawler.init();
    console.log('🚀 統合猫クローラー開始...');
    
    const cats = await crawler.crawlNewCats(10);
    
    // 結果を保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = join(process.cwd(), 'output', `new-cats-${timestamp}.json`);
    
    const result = {
      metadata: {
        type: 'cat',
        crawledAt: new Date().toISOString(),
        totalItems: cats.length,
        source: 'https://www.pet-home.jp',
        crawlerVersion: '2.0.0'
      },
      data: cats
    };
    
    writeFileSync(outputFile, JSON.stringify(result, null, 2));
    
    console.log(`\n✅ 完了!`);
    console.log(`📊 取得: ${cats.length}/10件`);
    console.log(`📄 データファイル: ${outputFile}`);
    console.log(`🖼️ 画像: crawler/output/images/ に保存`);
    
    // 取得した猫の概要表示
    console.log('\n📋 取得した猫たち:');
    cats.forEach((cat, i) => {
      console.log(`${i + 1}. ${cat.name} (${cat.age}歳, ${cat.gender}) - ${cat.prefecture}`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await crawler.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}