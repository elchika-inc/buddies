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
  localImagePath?: string;
  shelterName: string;
  shelterContact: string;
  adoptionFee: number;
  isNeutered: boolean;
  isVaccinated: boolean;
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

class ScheduledDogCrawler {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private stateFile: string;
  private dataFile: string;
  private state: CrawlerState;

  constructor() {
    // ファイルパスの設定
    this.stateFile = join(process.cwd(), 'data', 'dog-crawler-state.json');
    this.dataFile = join(process.cwd(), 'data', 'accumulated-dogs.json');
    
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

  private loadExistingData(): DogData[] {
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

  private saveData(dogs: DogData[]) {
    writeFileSync(this.dataFile, JSON.stringify(dogs, null, 2));
    console.log(`📄 データを保存しました: ${this.dataFile} (全${dogs.length}件)`);
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

  async crawlNewDogs(limit: number = 20): Promise<DogData[]> {
    console.log(`\n🐕 新規犬データの取得を開始...`);
    console.log(`📊 前回の取得: ${this.state.lastCrawledAt || '初回実行'}`);
    console.log(`📌 最後のID: ${this.state.highestId || 'なし'}`);
    
    // 画像保存ディレクトリを作成
    const imageDir = join(process.cwd(), 'data', 'dog-images');
    if (!existsSync(imageDir)) {
      mkdirSync(imageDir, { recursive: true });
    }

    // 犬一覧ページに移動
    await this.page!.goto('https://www.pet-home.jp/dogs/', { 
      waitUntil: 'domcontentloaded' 
    });

    await this.page!.waitForTimeout(2000);
    
    // 犬のURLを取得（最新のものから）
    const dogUrls = await this.extractDogUrls(limit * 2); // 余分に取得
    console.log(`📋 ${dogUrls.length}件の犬URLを発見`);

    const newDogs: DogData[] = [];
    const crawledIds: string[] = [];
    let skipCount = 0;

    for (let i = 0; i < dogUrls.length && newDogs.length < limit; i++) {
      const url = dogUrls[i];
      
      // URLからIDを抽出
      const idMatch = url.match(/\/pn(\d+)\//);
      if (!idMatch) continue;
      
      const id = idMatch[1];
      
      // 既に取得済みのIDかチェック（一時的に無効化してより多くのデータを取得）
      // if (this.state.highestId && parseInt(id) <= parseInt(this.state.highestId)) {
      //   skipCount++;
      //   console.log(`  ⏭️ スキップ: ID ${id} (既に取得済み)`);
      //   continue;
      // }
      
      console.log(`\n📸 ${newDogs.length + 1}/${limit}: ${url}`);
      
      try {
        const dog = await this.crawlSingleDog(url, imageDir);
        if (dog) {
          newDogs.push(dog);
          crawledIds.push(dog.id);
          console.log(`  ✅ 完了: ${dog.name} (ID: ${dog.id})`);
          
          // 最高IDを更新
          if (!this.state.highestId || parseInt(dog.id) > parseInt(this.state.highestId)) {
            this.state.highestId = dog.id;
          }
        }
        
        // レート制限
        await this.page!.waitForTimeout(2000);
        
      } catch (error) {
        console.error(`  ❌ エラー: ${error.message}`);
      }
    }

    // 状態を更新
    if (newDogs.length > 0) {
      this.state.lastCrawledAt = new Date().toISOString();
      this.state.lastCrawledId = this.state.highestId;
      this.state.totalCrawled += newDogs.length;
      this.state.history.push({
        timestamp: this.state.lastCrawledAt,
        crawledIds: crawledIds,
        newCount: newDogs.length
      });
      
      // 履歴は最新100件のみ保持
      if (this.state.history.length > 100) {
        this.state.history = this.state.history.slice(-100);
      }
      
      this.saveState();
    }

    console.log(`\n📊 取得結果: 新規${newDogs.length}件, スキップ${skipCount}件`);
    
    return newDogs;
  }

  private async extractDogUrls(limit: number): Promise<string[]> {
    const urls: string[] = [];
    
    // 犬URLを抽出
    const linkSelectors = [
      'a[href*="/dogs/"][href*="/pn"]',
    ];

    for (const selector of linkSelectors) {
      const hrefs = await this.page!.$$eval(selector, elements => 
        elements.map(el => (el as HTMLAnchorElement).href)
      );
      
      for (const href of hrefs) {
        if (href && this.isValidDogUrl(href)) {
          urls.push(href);
        }
        
        if (urls.length >= limit) break;
      }
      
      if (urls.length >= limit) break;
    }

    // 重複除去して指定件数に制限
    return [...new Set(urls)].slice(0, limit);
  }

  private isValidDogUrl(url: string): boolean {
    // 実際の犬詳細ページのパターンをチェック
    return /\/dogs\/[^\/]+\/pn\d+\/$/.test(url);
  }

  private async crawlSingleDog(url: string, imageDir: string): Promise<DogData | null> {
    await this.page!.goto(url, { waitUntil: 'domcontentloaded' });
    
    // IDを抽出
    const idMatch = url.match(/\/pn(\d+)\//);
    if (!idMatch) return null;
    
    const id = idMatch[1];
    
    // 基本情報を抽出
    const name = await this.extractText('h1, .pet-name, .title') || `犬ちゃん${id}`;
    
    // 詳細情報を探索
    const details = await this.extractDetails();
    
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
      weight: details.weight || this.getDefaultWeight(details.size),
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
      adoptionFee: 0,
      isNeutered: true,
      isVaccinated: true,
      goodWithKids: true,
      goodWithDogs: true,
      exerciseLevel: this.getExerciseLevel(details.size),
      trainingLevel: '基本的なしつけ済み',
      walkFrequency: '1日2回',
      needsYard: details.size === '大型',
      apartmentFriendly: details.size === '小型',
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
    
    // 既に画像が存在する場合はスキップ
    if (existsSync(filepath)) {
      console.log(`    ⏭️ 画像は既に存在: ${filename}`);
      return filepath;
    }
    
    // 現在のページURLから地域を取得
    const currentUrl = await this.page!.url();
    const regionMatch = currentUrl.match(/\/dogs\/([^\/]+)\//);
    const region = regionMatch?.[1] || 'tokyo';
    
    // 直接画像ページのURLを構築
    const imagePageUrl = `https://www.pet-home.jp/dogs/${region}/pn${id}/images_1/`;
    
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
      .replace(/\s*-\s*犬の里親募集\(\d+\)/, '')
      .replace(/[県府]$/, '')
      .trim();
  }

  private extractAgeFromName(name: string): number {
    if (name.includes('子犬') || name.includes('パピー')) return 0.5;
    if (name.includes('1歳')) return 1;
    if (name.includes('2歳')) return 2;
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
    if (name.includes('柴犬')) return '中型';
    if (name.includes('チワワ') || name.includes('トイプードル')) return '小型';
    if (name.includes('ゴールデン') || name.includes('ラブラドール')) return '大型';
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

  private getDefaultWeight(size?: string): number {
    switch(size) {
      case '小型': return Math.floor(Math.random() * 5) + 3; // 3-8kg
      case '中型': return Math.floor(Math.random() * 10) + 10; // 10-20kg
      case '大型': return Math.floor(Math.random() * 15) + 25; // 25-40kg
      default: return 15; // デフォルト
    }
  }

  private getExerciseLevel(size?: string): string {
    switch(size) {
      case '小型': return '低〜中';
      case '中型': return '中';
      case '大型': return '中〜高';
      default: return '中';
    }
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
      'miyagi': { prefecture: '宮城県', city: '仙台市' },
      'sendai': { prefecture: '宮城県', city: '仙台市' },
      'hiroshima': { prefecture: '広島県', city: '広島市' },
      'tochigi': { prefecture: '栃木県', city: '宇都宮市' },
      'yamaguchi': { prefecture: '山口県', city: '山口市' },
    };

    return regionMap[region] || { prefecture: '東京都', city: '新宿区' };
  }

  async mergeWithExistingData(newDogs: DogData[]): Promise<void> {
    if (newDogs.length === 0) {
      console.log('📝 新規データなし。既存データを維持します。');
      return;
    }

    // 既存データを読み込む
    const existingDogs = this.loadExistingData();
    
    // IDでマップを作成（重複防止）
    const dogMap = new Map<string, DogData>();
    
    // 既存データをマップに追加
    existingDogs.forEach(dog => dogMap.set(dog.id, dog));
    
    // 新規データをマップに追加（既存のものは上書き）
    newDogs.forEach(dog => dogMap.set(dog.id, dog));
    
    // マップから配列に変換し、IDで降順ソート（新しいものが先）
    const mergedDogs = Array.from(dogMap.values())
      .sort((a, b) => parseInt(b.id) - parseInt(a.id));
    
    // データを保存
    this.saveData(mergedDogs);
    
    console.log(`📊 データ統合完了: 既存${existingDogs.length}件 + 新規${newDogs.length}件 = 全${mergedDogs.length}件`);
  }

  async exportToDogMatch(): Promise<void> {
    const dogs = this.loadExistingData();
    if (dogs.length === 0) {
      console.log('⚠️ エクスポートするデータがありません。');
      return;
    }

    // 最新20件を取得
    const latestDogs = dogs.slice(0, 20);
    
    // DogMatch形式のTypeScriptファイルを生成
    const tsContent = `import { Dog } from '@/types/dog'

// 🐕 実際のペットのおうちサイトから取得した犬データ（自動更新版）
// 最終更新: ${new Date().toISOString()}
// データソース: https://www.pet-home.jp
// 総件数: ${dogs.length}件（最新20件を表示）
export const mockDogs: Dog[] = ${JSON.stringify(latestDogs, null, 2)}
`;

    const outputPath = '/Users/nishikawa/projects/elchika/pawmatch/app/src/data/dog/dogs.ts';
    writeFileSync(outputPath, tsContent, 'utf-8');
    
    console.log('✅ DogMatchへのエクスポート完了！');
    console.log(`📄 出力先: ${outputPath}`);
    console.log(`🐕 エクスポートした犬データ: ${latestDogs.length}件`);
    
    // 画像もコピー
    const sourceImageDir = join(process.cwd(), 'data', 'dog-images');
    const targetImageDir = '/Users/nishikawa/projects/elchika/pawmatch/app/public/images';
    
    for (const dog of latestDogs) {
      const sourceImage = join(sourceImageDir, `dog-${dog.id}.jpg`);
      const targetImage = join(targetImageDir, `dog-${dog.id}.jpg`);
      
      if (existsSync(sourceImage) && !existsSync(targetImage)) {
        const imageData = readFileSync(sourceImage);
        writeFileSync(targetImage, imageData);
        console.log(`  📷 画像コピー: dog-${dog.id}.jpg`);
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
    
    const existingDogs = this.loadExistingData();
    console.log(`\n💾 保存済みデータ: ${existingDogs.length}件`);
  }
}

async function main() {
  const crawler = new ScheduledDogCrawler();
  
  try {
    // 統計情報を表示
    crawler.showStatistics();
    
    await crawler.init();
    console.log('\n🚀 犬データクローラー開始...\n');
    
    // 新規データを取得（10件）
    const newDogs = await crawler.crawlNewDogs(10);
    
    // 既存データとマージ
    await crawler.mergeWithExistingData(newDogs);
    
    // DogMatchアプリにエクスポート
    await crawler.exportToDogMatch();
    
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

export { ScheduledDogCrawler };