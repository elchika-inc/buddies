import { BaseCrawler } from './base-crawler';
import { CrawlerConfig, RawPetData, PetType } from '../types';

export class PetHomeCrawler extends BaseCrawler {
  constructor(config: CrawlerConfig, petType: PetType) {
    super(config, petType);
  }

  getListPageUrl(pageNumber = 1): string {
    const petPath = this.petType === 'dog' ? 'dogs' : 'cats';
    // 里親募集中の猫・犬のみに絞り込む
    return `${this.config.baseUrl}/${petPath}/status_2/?page=${pageNumber}`;
  }

  async extractItemUrls(): Promise<string[]> {
    const urls: string[] = [];
    
    try {
      // ペットカードのリンクを抽出
      const linkSelectors = [
        'a[href*="/cats/"]',
        'a[href*="/dogs/"]', 
        '.pet_box a',
        '.pet-card a',
        '.pet-item a',
        '.search_result_main a',
        '.search_result_item a',
        '.result_item a',
        '.result_list a',
        '[class*="result"] a',
        '[class*="item"] a',
        '[class*="list"] a'
      ];

      for (const selector of linkSelectors) {
        const hrefs = await this.browserManager.extractAttributes(selector, 'href');
        
        for (const href of hrefs) {
          if (href && this.isValidPetUrl(href)) {
            const fullUrl = href.startsWith('http') ? href : `${this.config.baseUrl}${href}`;
            urls.push(fullUrl);
          }
        }
        
        if (urls.length > 0) break; // 有効なセレクタが見つかったら他は試さない
      }

      return [...new Set(urls)]; // 重複除去
      
    } catch (error) {
      this.addError('parsing', 'Failed to extract item URLs', await this.browserManager.getCurrentUrl(), error as Error);
      return [];
    }
  }

  private isValidPetUrl(url: string): boolean {
    // ブログページではなく、実際のペット詳細ページを探す
    if (url.includes('/blog/')) return false;
    
    const petPath = this.petType === 'dog' ? 'dogs' : 'cats';
    
    // 実際のURL パターンに対応: /cats/都道府県/pn番号/
    const patterns = [
      new RegExp(`/${petPath}/[^/]+/pn\\d+/?$`),  // /cats/hukuoka/pn523504/
      new RegExp(`/${petPath}/[^/]+/\\d+/?$`),    // /cats/tokyo/12345/
      new RegExp(`/${petPath}/\\d+/?$`),           // /cats/12345/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }

  async extractPetData(url: string): Promise<RawPetData> {
    const data: RawPetData = {};
    
    try {
      // ID抽出 - pnXXXXXX パターンに対応
      const idMatch = url.match(/\/(?:cats|dogs)\/[^\/]+\/pn(\d+)\//);
      if (idMatch) {
        data.id = idMatch[1];
      } else {
        // フォールバック: 数字のみのパターン
        const numMatch = url.match(/\/(?:cats|dogs)\/[^\/]+\/(\d+)\//);
        data.id = numMatch ? numMatch[1] : this.generateId(url, '');
      }

      // 基本情報の抽出を試行
      await this.extractBasicInfo(data);
      await this.extractDetailInfo(data);
      await this.extractLocationInfo(data);
      await this.extractImageInfo(data);
      await this.extractShelterInfo(data);
      
    } catch (error) {
      this.addError('parsing', 'Failed to extract pet data', url, error as Error);
    }

    return data;
  }

  private async extractBasicInfo(data: RawPetData): Promise<void> {
    // 名前
    const nameSelectors = [
      'h1',
      '.pet-name',
      '.pet_name',
      '.title',
      'h2',
      '.pet-title'
    ];

    for (const selector of nameSelectors) {
      const name = await this.browserManager.extractText(selector);
      if (name) {
        data.name = name;
        break;
      }
    }

    // 品種
    const breedSelectors = [
      '[class*="breed"]',
      '[class*="種類"]',
      '.pet-breed',
      '.breed-info'
    ];

    for (const selector of breedSelectors) {
      const breed = await this.browserManager.extractText(selector);
      if (breed && !breed.includes('募集') && !breed.includes('里親')) {
        data.breed = breed;
        break;
      }
    }

    // 年齢、性別、体重を含むテキストから抽出
    const infoSelectors = [
      '.pet-info',
      '.pet_info',
      '.basic-info',
      '.pet-details',
      '.info-list',
      'table td',
      '.data-row'
    ];

    const allInfoTexts: string[] = [];
    for (const selector of infoSelectors) {
      const texts = await this.browserManager.extractTexts(selector);
      allInfoTexts.push(...texts);
    }

    // 年齢の抽出
    for (const text of allInfoTexts) {
      if (text.match(/\d+歳|\d+ヶ月|生後|子猫|子犬/)) {
        data.age = text;
        break;
      }
    }

    // 性別の抽出
    for (const text of allInfoTexts) {
      if (text.match(/♂|♀|オス|メス|男の子|女の子/)) {
        data.gender = text;
        break;
      }
    }

    // 体重の抽出
    for (const text of allInfoTexts) {
      if (text.match(/\d+(\.\d+)?\s*kg/)) {
        data.weight = text;
        break;
      }
    }

    // 毛色の抽出
    for (const text of allInfoTexts) {
      if (text.match(/色|カラー/) && !text.match(/募集|里親|連絡/)) {
        data.color = text;
        break;
      }
    }
  }

  private async extractDetailInfo(data: RawPetData): Promise<void> {
    // 説明文
    const descriptionSelectors = [
      '.description',
      '.pet-description',
      '.detail',
      '.content',
      '.pet-detail-text',
      '.comment',
      'p'
    ];

    const descriptions: string[] = [];
    for (const selector of descriptionSelectors) {
      const texts = await this.browserManager.extractTexts(selector);
      descriptions.push(...texts.filter(text => 
        text.length > 20 && 
        !text.includes('©') && 
        !text.includes('広告')
      ));
    }

    if (descriptions.length > 0) {
      data.description = descriptions.join('\n');
    }

    // 医療情報（ワクチン、去勢など）
    const medicalKeywords = ['ワクチン', '去勢', '避妊', '手術', '健康', '病気', 'FIV', 'FeLV'];
    const medicalInfo: string[] = [];
    
    for (const text of descriptions) {
      if (medicalKeywords.some(keyword => text.includes(keyword))) {
        medicalInfo.push(text);
      }
    }

    if (medicalInfo.length > 0) {
      data.medicalInfo = medicalInfo.join('\n');
    }

    // 性格情報
    const personalityKeywords = ['性格', '特徴', '人懐', 'おとなしい', '活発', '甘えん坊', 'やんちゃ'];
    const personalities: string[] = [];
    
    for (const text of descriptions) {
      if (personalityKeywords.some(keyword => text.includes(keyword))) {
        personalities.push(text);
      }
    }

    if (personalities.length > 0) {
      data.personality = personalities.join('、');
    }
  }

  private async extractLocationInfo(data: RawPetData): Promise<void> {
    // 所在地
    const locationSelectors = [
      '.location',
      '.address',
      '.area',
      '.prefecture',
      '.region'
    ];

    for (const selector of locationSelectors) {
      const location = await this.browserManager.extractText(selector);
      if (location && location.length > 2) {
        data.location = location;
        break;
      }
    }

    // より詳細な住所情報
    const addressSelectors = [
      '.full-address',
      '.detailed-address',
      '.complete-address'
    ];

    for (const selector of addressSelectors) {
      const address = await this.browserManager.extractText(selector);
      if (address && address.length > data.location?.length) {
        data.fullLocation = address;
        break;
      }
    }
  }

  private async extractImageInfo(data: RawPetData): Promise<void> {
    const currentUrl = await this.browserManager.getCurrentUrl();
    console.log(`📍 現在のURL: ${currentUrl}`);
    
    // まず構築パターンを試す
    const constructedImageUrl = this.constructImageUrl(currentUrl);
    console.log(`🔨 構築した画像URL: ${constructedImageUrl}`);
    
    if (constructedImageUrl) {
      // 構築したURLが有効かチェックして画像をダウンロード
      const downloadedImagePath = await this.downloadImage(constructedImageUrl, data.id);
      if (downloadedImagePath) {
        data.imageUrl = downloadedImagePath;
        console.log(`🖼️ 画像ダウンロード成功: ${downloadedImagePath}`);
        return;
      }
    }

    // フォールバック: ページ内の画像を探してダウンロード
    console.log(`🔍 フォールバック: ページ内の画像を探します`);
    const imageSelectors = [
      '.main-image img',
      '.pet-image img', 
      '.photo img',
      'img[src*="pet"]',
      '.gallery img:first-child',
      'img'
    ];

    for (const selector of imageSelectors) {
      const src = await this.browserManager.extractAttribute(selector, 'src');
      if (src && this.isValidImageUrl(src)) {
        const fullImageUrl = src.startsWith('http') ? src : `${this.config.baseUrl}${src}`;
        const downloadedImagePath = await this.downloadImage(fullImageUrl, data.id);
        if (downloadedImagePath) {
          data.imageUrl = downloadedImagePath;
          console.log(`🖼️ フォールバック画像ダウンロード成功: ${downloadedImagePath}`);
          return;
        }
      }
    }
  }

  private async downloadImage(imageUrl: string, petId?: string): Promise<string | null> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const https = await import('https');
      const http = await import('http');
      
      // 画像保存用ディレクトリを作成
      const imageDir = path.join(process.cwd(), 'output', 'images');
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      // ファイル名を生成
      const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `pet-${petId || Date.now()}.${ext}`;
      const filepath = path.join(imageDir, filename);

      console.log(`⬇️ 画像ダウンロード開始: ${imageUrl} -> ${filename}`);

      return new Promise((resolve, reject) => {
        const client = imageUrl.startsWith('https') ? https : http;
        
        client.get(imageUrl, (response) => {
          if (response.statusCode !== 200) {
            console.log(`❌ 画像ダウンロード失敗: HTTP ${response.statusCode}`);
            resolve(null);
            return;
          }

          const fileStream = fs.createWriteStream(filepath);
          response.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            console.log(`✅ 画像保存完了: ${filename}`);
            resolve(filepath);
          });

          fileStream.on('error', (err) => {
            console.error(`❌ ファイル書き込みエラー:`, err);
            fs.unlinkSync(filepath).catch(() => {});
            resolve(null);
          });
        }).on('error', (err) => {
          console.error(`❌ 画像ダウンロードエラー:`, err);
          resolve(null);
        });
      });
    } catch (error) {
      console.error(`❌ 画像処理エラー:`, error);
      return null;
    }
  }

  private constructImageUrl(petUrl: string): string | null {
    // URLパターンから画像URLを構築
    // 例: https://www.pet-home.jp/cats/hukuoka/pn523504/ 
    //  => https://www.pet-home.jp/cats/hukuoka/pn523504/images_1/
    
    if (petUrl.endsWith('/')) {
      return petUrl + 'images_1/';
    } else {
      return petUrl + '/images_1/';
    }
  }

  private isValidImageUrl(url: string): boolean {
    if (!url) return false;
    
    // 除外するパターン
    const excludePatterns = [
      'icon',
      'logo',
      'banner',
      'ad',
      'button',
      'bg',
      'background'
    ];

    if (excludePatterns.some(pattern => url.toLowerCase().includes(pattern))) {
      return false;
    }

    return /\.(jpg|jpeg|png|gif|webp)/i.test(url);
  }

  private async extractShelterInfo(data: RawPetData): Promise<void> {
    // 保護施設・投稿者情報
    const shelterSelectors = [
      '.shelter',
      '.owner',
      '.poster',
      '.contact',
      '.user-info',
      '.breeder'
    ];

    for (const selector of shelterSelectors) {
      const shelter = await this.browserManager.extractText(selector);
      if (shelter && !shelter.includes('連絡') && !shelter.includes('メール')) {
        data.shelterName = shelter;
        break;
      }
    }

    // 連絡先情報
    const contactSelectors = [
      '.contact-info',
      '.phone',
      '.email',
      '.contact'
    ];

    for (const selector of contactSelectors) {
      const contact = await this.browserManager.extractText(selector);
      if (contact && (contact.includes('@') || contact.includes('連絡'))) {
        data.shelterContact = contact;
        break;
      }
    }

    // 譲渡費用
    const feeSelectors = [
      '.fee',
      '.price',
      '.cost',
      '.adoption-fee'
    ];

    for (const selector of feeSelectors) {
      const fee = await this.browserManager.extractText(selector);
      if (fee && fee.match(/\d+円|\d+,\d+円/)) {
        const feeMatch = fee.match(/(\d+(?:,\d+)?)/);
        if (feeMatch) {
          data.adoptionFee = feeMatch[1].replace(',', '');
        }
        break;
      }
    }
  }
}