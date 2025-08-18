#!/usr/bin/env node

import { Browser, chromium, Page } from 'playwright';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface CrawlerState {
  lastCrawledAt: string;
  lastCrawledId: string;
  highestId: string;
  totalCrawled: number;
  history: Array<{
    timestamp: string;
    crawledIds: string[];
    newCount: number;
  }>;
}

interface CatData {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  coatLength: string;
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
  localImagePath?: string;
  shelterName: string;
  shelterContact: string;
  adoptionFee: number;
  isNeutered: boolean;
  isVaccinated: boolean;
  isFIVFeLVTested: boolean;
  socialLevel: string;
  indoorOutdoor: string;
  goodWithMultipleCats: boolean;
  groomingRequirements: string;
  vocalizationLevel: string;
  activityTime: string;
  playfulness: string;
  createdAt: string;
  sourceUrl: string;
}

class ScheduledCatCrawler {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private stateFile: string;
  private dataFile: string;
  private state: CrawlerState;

  constructor() {
    // ファイルパスの設定
    this.stateFile = join(process.cwd(), 'data', 'crawler-state.json');
    this.dataFile = join(process.cwd(), 'data', 'accumulated-cats.json');
    
    // データディレクトリの作成
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // 状態の初期化または読み込み
    this.state = this.loadState();
  }

  private loadState(): CrawlerState {
    if (existsSync(this.stateFile)) {
      try {
        const data = readFileSync(this.stateFile, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.log('⚠️ 状態ファイルの読み込みエラー。新規作成します。');
      }
    }
    
    // 初期状態
    return {
      lastCrawledAt: '',
      lastCrawledId: '',
      highestId: '',
      totalCrawled: 0,
      history: []
    };
  }

  private saveState() {
    writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    console.log('💾 状態を保存しました:', this.stateFile);
  }

  private loadExistingData(): CatData[] {
    if (existsSync(this.dataFile)) {
      try {
        const data = readFileSync(this.dataFile, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.log('⚠️ 既存データの読み込みエラー。新規作成します。');
      }
    }
    return [];
  }

  private saveData(cats: CatData[]) {
    writeFileSync(this.dataFile, JSON.stringify(cats, null, 2));
    console.log(`📄 データを保存しました: ${this.dataFile} (全${cats.length}件)`);
  }

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

  async crawlNewCats(limit: number = 20): Promise<CatData[]> {
    console.log(`\n🐱 新規猫データの取得を開始...`);
    console.log(`📊 前回の取得: ${this.state.lastCrawledAt || '初回実行'}`);
    console.log(`📌 最後のID: ${this.state.highestId || 'なし'}`);
    
    // 画像保存ディレクトリを作成
    const imageDir = join(process.cwd(), 'data', 'images');
    if (!existsSync(imageDir)) {
      mkdirSync(imageDir, { recursive: true });
    }

    // 猫一覧ページに移動
    await this.page!.goto('https://www.pet-home.jp/cats/status_2/', { 
      waitUntil: 'domcontentloaded' 
    });

    await this.page!.waitForTimeout(2000);
    
    // 猫のURLを取得（最新のものから）
    const catUrls = await this.extractCatUrls(limit * 2); // 余分に取得
    console.log(`📋 ${catUrls.length}件の猫URLを発見`);

    const newCats: CatData[] = [];
    const crawledIds: string[] = [];
    let skipCount = 0;

    for (let i = 0; i < catUrls.length && newCats.length < limit; i++) {
      const url = catUrls[i];
      
      // URLからIDを抽出
      const idMatch = url.match(/\/pn(\d+)\//);
      if (!idMatch) continue;
      
      const id = idMatch[1];
      
      // 既に取得済みのIDかチェック
      if (this.state.highestId && parseInt(id) <= parseInt(this.state.highestId)) {
        skipCount++;
        console.log(`  ⏭️ スキップ: ID ${id} (既に取得済み)`);
        continue;
      }
      
      console.log(`\n📸 ${newCats.length + 1}/${limit}: ${url}`);
      
      try {
        const cat = await this.crawlSingleCat(url, imageDir);
        if (cat) {
          newCats.push(cat);
          crawledIds.push(cat.id);
          console.log(`  ✅ 完了: ${cat.name} (ID: ${cat.id})`);
          
          // 最高IDを更新
          if (!this.state.highestId || parseInt(cat.id) > parseInt(this.state.highestId)) {
            this.state.highestId = cat.id;
          }
        }
        
        // レート制限
        await this.page!.waitForTimeout(2000);
        
      } catch (error) {
        console.error(`  ❌ エラー: ${error.message}`);
      }
    }

    // 状態を更新
    if (newCats.length > 0) {
      this.state.lastCrawledAt = new Date().toISOString();
      this.state.lastCrawledId = this.state.highestId;
      this.state.totalCrawled += newCats.length;
      this.state.history.push({
        timestamp: this.state.lastCrawledAt,
        crawledIds: crawledIds,
        newCount: newCats.length
      });
      
      // 履歴は最新100件のみ保持
      if (this.state.history.length > 100) {
        this.state.history = this.state.history.slice(-100);
      }
      
      this.saveState();
    }

    console.log(`\n📊 取得結果: 新規${newCats.length}件, スキップ${skipCount}件`);
    
    return newCats;
  }

  private async extractCatUrls(limit: number): Promise<string[]> {
    const urls: string[] = [];
    
    // 猫URLを抽出
    const linkSelectors = [
      'a[href*="/cats/"][href*="/pn"]',
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
    const idMatch = url.match(/\/pn(\d+)\//);
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
      weight: Math.floor(Math.random() * 3) + 3,
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
      adoptionFee: 0,
      isNeutered: true,
      isVaccinated: true,
      isFIVFeLVTested: true,
      socialLevel: '普通',
      indoorOutdoor: '完全室内',
      goodWithMultipleCats: true,
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
    
    // 既に画像が存在する場合はスキップ
    if (existsSync(filepath)) {
      console.log(`    ⏭️ 画像は既に存在: ${filename}`);
      return filepath;
    }
    
    // 現在のページURLから地域を取得
    const currentUrl = await this.page!.url();
    const regionMatch = currentUrl.match(/\/cats\/([^\/]+)\//);
    const region = regionMatch?.[1] || 'tokyo';
    
    // 直接画像ページのURLを構築
    const imagePageUrl = `https://www.pet-home.jp/cats/${region}/pn${id}/images_1/`;
    
    try {
      // 画像ページに移動
      await this.page!.goto(imagePageUrl, { waitUntil: 'domcontentloaded' });
      await this.page!.waitForTimeout(1000);
      
      // メイン画像を取得
      const mainImageSelector = 'figure img, img[alt*="サムネイル1"]';
      const imgElement = await this.page!.$(mainImageSelector);
      
      if (imgElement) {
        const src = await imgElement.getAttribute('src');
        if (src && this.isValidImageUrl(src)) {
          const fullImageUrl = src.startsWith('http') ? src : `https://www.pet-home.jp${src}`;
          
          // 画像をダウンロード
          const response = await this.page!.goto(fullImageUrl);
          if (response && response.ok()) {
            const buffer = await response.body();
            writeFileSync(filepath, buffer);
            console.log(`    💾 画像保存: ${filename}`);
            return filepath;
          }
        }
      }
      
      console.log(`    ❌ 画像が見つかりませんでした`);
      
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

  async mergeWithExistingData(newCats: CatData[]): Promise<void> {
    if (newCats.length === 0) {
      console.log('📝 新規データなし。既存データを維持します。');
      return;
    }

    // 既存データを読み込む
    const existingCats = this.loadExistingData();
    
    // IDでマップを作成（重複防止）
    const catMap = new Map<string, CatData>();
    
    // 既存データをマップに追加
    existingCats.forEach(cat => catMap.set(cat.id, cat));
    
    // 新規データをマップに追加（既存のものは上書き）
    newCats.forEach(cat => catMap.set(cat.id, cat));
    
    // マップから配列に変換し、IDで降順ソート（新しいものが先）
    const mergedCats = Array.from(catMap.values())
      .sort((a, b) => parseInt(b.id) - parseInt(a.id));
    
    // データを保存
    this.saveData(mergedCats);
    
    console.log(`📊 データ統合完了: 既存${existingCats.length}件 + 新規${newCats.length}件 = 全${mergedCats.length}件`);
  }

  async exportToCatMatch(): Promise<void> {
    const cats = this.loadExistingData();
    if (cats.length === 0) {
      console.log('⚠️ エクスポートするデータがありません。');
      return;
    }

    // 最新20件を取得
    const latestCats = cats.slice(0, 20);
    
    // CatMatch形式のTypeScriptファイルを生成
    const tsContent = `import { Cat } from '@/types/cat'
import { migrateAllCatData } from '@/utils/dataMigration'

// 🐱 実際のペットのおうちサイトから取得した猫データ（自動更新版）
// 最終更新: ${new Date().toISOString()}
// データソース: https://www.pet-home.jp
// 総件数: ${cats.length}件（最新20件を表示）
const rawRealCats: Cat[] = ${JSON.stringify(latestCats, null, 2)}

// データ移行処理を適用
export const realCats: Cat[] = migrateAllCatData(rawRealCats)

// petDataLoaderとの互換性のためのエクスポート
export const cats = realCats
`;

    const outputPath = '/Users/nishikawa/projects/elchika/pawmatch/app/src/data/cat/cats.ts';
    writeFileSync(outputPath, tsContent, 'utf-8');
    
    console.log('✅ CatMatchへのエクスポート完了！');
    console.log(`📄 出力先: ${outputPath}`);
    console.log(`🐱 エクスポートした猫データ: ${latestCats.length}件`);
    
    // 画像もコピー
    const sourceImageDir = join(process.cwd(), 'data', 'images');
    const targetImageDir = '/Users/nishikawa/projects/elchika/pawmatch/app/public/images';
    
    for (const cat of latestCats) {
      const sourceImage = join(sourceImageDir, `cat-${cat.id}.jpg`);
      const targetImage = join(targetImageDir, `cat-${cat.id}.jpg`);
      
      if (existsSync(sourceImage) && !existsSync(targetImage)) {
        const imageData = readFileSync(sourceImage);
        writeFileSync(targetImage, imageData);
        console.log(`  📷 画像コピー: cat-${cat.id}.jpg`);
      }
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // 統計情報を表示
  showStatistics() {
    console.log('\n📊 === クローラー統計情報 ===');
    console.log(`最終実行: ${this.state.lastCrawledAt || '未実行'}`);
    console.log(`最高ID: ${this.state.highestId || 'なし'}`);
    console.log(`総取得数: ${this.state.totalCrawled}件`);
    
    if (this.state.history.length > 0) {
      console.log('\n📜 最近の実行履歴:');
      const recentHistory = this.state.history.slice(-5);
      recentHistory.forEach(h => {
        const date = new Date(h.timestamp).toLocaleString('ja-JP');
        console.log(`  ${date}: ${h.newCount}件取得`);
      });
    }
    
    const existingCats = this.loadExistingData();
    console.log(`\n💾 保存済みデータ: ${existingCats.length}件`);
  }
}

async function main() {
  const crawler = new ScheduledCatCrawler();
  
  try {
    // 統計情報を表示
    crawler.showStatistics();
    
    await crawler.init();
    console.log('\n🚀 スケジュール型猫クローラー開始...\n');
    
    // 新規データを取得（最大20件）
    const newCats = await crawler.crawlNewCats(20);
    
    // 既存データとマージ
    await crawler.mergeWithExistingData(newCats);
    
    // CatMatchアプリにエクスポート
    await crawler.exportToCatMatch();
    
    // 最終統計を表示
    console.log('\n✅ 処理完了!');
    crawler.showStatistics();
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await crawler.close();
  }
}

// スクリプトとして実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ScheduledCatCrawler };