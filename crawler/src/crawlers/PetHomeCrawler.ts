import { Pet } from '../types';
import { CrawlCheckpoint } from '../interfaces/ICrawler';
import { BaseCrawler } from './BaseCrawler';
import { HtmlParser } from '../utils/HtmlParser';
import { RetryHandler } from '../utils/RetryHandler';

/**
 * ペットホーム専用クローラー
 */
export class PetHomeCrawler extends BaseCrawler {
  readonly sourceId = 'pet-home';
  readonly sourceName = 'ペットホーム';
  
  /**
   * ペットホームからペット情報を取得
   */
  async fetchPets(
    petType: 'dog' | 'cat',
    limit: number,
    lastCheckpoint?: CrawlCheckpoint
  ): Promise<Pet[]> {
    const pets: Pet[] = [];
    
    // 前回処理した最大ID（pn番号）を取得
    const lastPetId = this.extractLastPetId(lastCheckpoint);
    
    try {
      const baseUrl = petType === 'dog'
        ? `${this.env.PET_HOME_BASE_URL}/dogs/tokyo/`
        : `${this.env.PET_HOME_BASE_URL}/cats/tokyo/`;
      
      const petsPerPage = 20;
      const maxPages = Math.ceil(limit / petsPerPage);
      let newPetsFound = 0;
      
      for (let page = 1; page <= Math.min(maxPages, 10); page++) {
        const url = `${baseUrl}?page=${page}`;
        
        const pagePets = await RetryHandler.execute(async () => {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; PawMatch-Bot/1.0)',
            },
            signal: AbortSignal.timeout(15000), // 15秒タイムアウト
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const html = await response.text();
          return this.parseHTMLContent(html, petType, url);
        }, RetryHandler.getHttpRetryConfig());
        
        // 差分チェック
        if (lastCheckpoint && lastPetId) {
          for (const pet of pagePets) {
            const petIdNum = this.extractPetNumber(pet.id);
            
            // 既に処理済みのペットはスキップ
            if (petIdNum <= lastPetId) {
              console.log(`Skipping already processed pet: pn${pet.id}`);
              continue;
            }
            
            pets.push(pet);
            newPetsFound++;
            
            if (pets.length >= limit) break;
          }
          
          // 新規ペットが見つからなくなったら終了
          if (newPetsFound === 0 && page > 1) {
            console.log('No new pets found, stopping crawl');
            break;
          }
        } else {
          // 初回または全件取得モード
          pets.push(...pagePets);
        }
        
        if (pets.length >= limit || pagePets.length === 0) break;
      }
      
    } catch (error) {
      console.error('Scraping error:', error);
    }
    
    return pets.slice(0, limit);
  }
  
  /**
   * チェックポイントから最後のペットID（pn番号）を抽出
   */
  private extractLastPetId(checkpoint?: CrawlCheckpoint): number {
    if (!checkpoint?.metadata?.lastPetNumber) {
      return 0;
    }
    return parseInt(checkpoint.metadata.lastPetNumber) || 0;
  }
  
  /**
   * ペットIDから番号部分を抽出
   */
  private extractPetNumber(petId: string): number {
    const match = petId.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
  
  /**
   * HTMLコンテンツをパース
   */
  private parseHTMLContent(html: string, petType: 'dog' | 'cat', baseUrl: string): Pet[] {
    const pets: Pet[] = [];
    
    try {
      const parser = new HtmlParser(html);
      
      // ペットカード要素を取得（実際のセレクターは要調整）
      const petCardSelector = '.pet-card, .pet-item, [data-pet-id]';
      const petElements = parser.document.querySelectorAll(petCardSelector);
      
      if (petElements.length === 0) {
        // フォールバック: 旧来の正規表現パース
        return this.parseHTMLContentFallback(html, petType, baseUrl);
      }
      
      for (const element of petElements) {
        try {
          const pet = this.parsePetElement(element, petType, baseUrl);
          if (pet) pets.push(pet);
        } catch (error) {
          console.warn('Failed to parse pet element:', error);
        }
      }
      
    } catch (error) {
      console.warn('Failed to parse HTML with HtmlParser, using fallback:', error);
      return this.parseHTMLContentFallback(html, petType, baseUrl);
    }
    
    return pets;
  }
  
  /**
   * ペット要素を解析してPetオブジェクトを作成
   */
  private parsePetElement(element: Element, petType: 'dog' | 'cat', baseUrl: string): Pet | null {
    try {
      // ID取得（data属性またはURLから）
      const idAttr = element.getAttribute('data-pet-id') || 
                    element.getAttribute('data-id') ||
                    element.querySelector('[data-pet-id]')?.getAttribute('data-pet-id');
      
      let id = idAttr;
      if (!id) {
        // リンクからIDを抽出
        const link = element.querySelector('a[href*="pn"]');
        if (link) {
          const match = link.getAttribute('href')?.match(/pn(\d+)/);
          id = match ? match[1] : null;
        }
      }
      
      if (!id) return null;
      
      // 名前取得
      const nameElement = element.querySelector('h3, .pet-name, .name, [data-name]');
      const name = HtmlParser.cleanText(nameElement?.textContent);
      if (!name) return null;
      
      // 詳細情報取得
      const breed = this.extractPetInfo(element, ['breed', '犬種', '猫種']) || '雑種';
      const ageText = this.extractPetInfo(element, ['age', '年齢', '月齢']);
      const age = HtmlParser.parseNumber(ageText) || 2;
      const gender = this.extractPetInfo(element, ['gender', '性別']) || '不明';
      
      // 場所情報取得
      const locationText = this.extractPetInfo(element, ['location', '場所', '地域']) || '東京都';
      const [prefecture, city] = this.parseLocation(locationText);
      
      // 画像URL取得
      const imgElement = element.querySelector('img');
      const imageUrl = imgElement ? 
        new URL(imgElement.getAttribute('src') || '', baseUrl).href :
        `https://www.pet-home.jp/images/${petType}-${id}.jpg`;
      
      // 詳細ページURL取得
      const linkElement = element.querySelector('a[href]');
      const sourceUrl = linkElement ?
        new URL(linkElement.getAttribute('href') || '', baseUrl).href :
        `https://www.pet-home.jp/${petType}s/tokyo/pn${id}/`;
      
      // 説明文取得
      const descElement = element.querySelector('.description, .pet-desc, p');
      const description = HtmlParser.cleanText(descElement?.textContent) ||
        `${name} - 素敵な${petType === 'dog' ? '犬' : '猫'}ちゃんです。新しい家族を待っています。`;
      
      return {
        id,
        type: petType,
        name,
        breed,
        age: age.toString(),
        gender,
        prefecture,
        city,
        location: `${prefecture}${city}`,
        description,
        personality: ['人懐っこい', '甘えん坊'],
        medicalInfo: 'ワクチン接種済み、健康チェック済み',
        careRequirements: ['完全室内飼い', '定期健診', '愛情たっぷり'],
        imageUrl,
        shelterName: '動物保護センター',
        shelterContact: 'contact@pet-home.jp',
        sourceUrl,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('Failed to parse pet element:', error);
      return null;
    }
  }
  
  /**
   * フォールバック: 正規表現ベースのHTMLパース
   */
  private parseHTMLContentFallback(html: string, petType: 'dog' | 'cat', baseUrl: string): Pet[] {
    const pets: Pet[] = [];
    
    const petIdMatches = html.match(/pn(\d+)/g) || [];
    const nameMatches = html.match(/<h3[^>]*>([^<]+)<\/h3>/g) || [];
    
    for (let i = 0; i < Math.min(petIdMatches.length, nameMatches.length); i++) {
      const id = petIdMatches[i].replace('pn', '');
      const name = HtmlParser.cleanText(nameMatches[i].replace(/<[^>]*>/g, ''));
      
      if (id && name) {
        pets.push({
          id,
          type: petType,
          name,
          breed: '雑種',
          age: '2',
          gender: '不明',
          prefecture: '東京都',
          city: '新宿区',
          location: '東京都新宿区',
          description: `${name} - 素敵な${petType === 'dog' ? '犬' : '猫'}ちゃんです。新しい家族を待っています。`,
          personality: ['人懐っこい', '甘えん坊'],
          medicalInfo: 'ワクチン接種済み、健康チェック済み',
          careRequirements: ['完全室内飼い', '定期健診', '愛情たっぷり'],
          imageUrl: `https://www.pet-home.jp/images/${petType}-${id}.jpg`,
          shelterName: '東京都動物保護センター',
          shelterContact: 'pethome@example.com',
          sourceUrl: new URL(`/${petType}s/tokyo/pn${id}/`, baseUrl).href,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    return pets;
  }
  
  /**
   * 要素から特定情報を抽出
   */
  private extractPetInfo(element: Element, keywords: string[]): string | null {
    for (const keyword of keywords) {
      // data属性から検索
      const dataValue = element.getAttribute(`data-${keyword.toLowerCase()}`);
      if (dataValue) return dataValue;
      
      // テキスト内容から検索
      const text = element.textContent || '';
      for (const kw of keywords) {
        const regex = new RegExp(`${kw}[：:\\s]*([^\\s\\n,，]+)`, 'i');
        const match = text.match(regex);
        if (match) return match[1].trim();
      }
    }
    return null;
  }
  
  /**
   * 場所文字列をパースして都道府県と市区町村に分割
   */
  private parseLocation(locationText: string): [string, string] {
    if (!locationText) return ['東京都', ''];
    
    const prefectures = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
      '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
      '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
      '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
      '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県',
      '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];
    
    for (const pref of prefectures) {
      if (locationText.includes(pref)) {
        const city = locationText.replace(pref, '').trim();
        return [pref, city];
      }
    }
    
    return [locationText, ''];
  }
  
  /**
   * チェックポイント更新時にペットホーム固有の情報を追加
   */
  protected async updateCheckpoint(
    petType: 'dog' | 'cat',
    processedIds: string[]
  ): Promise<void> {
    // 最大のpn番号を記録
    const maxPetNumber = Math.max(...processedIds.map(id => {
      const parts = id.split('_');
      return this.extractPetNumber(parts[1] || '0');
    }));
    
    const now = new Date().toISOString();
    const checkpoint: CrawlCheckpoint = {
      lastItemId: processedIds[0],
      lastCrawlAt: now,
      metadata: {
        lastPetNumber: maxPetNumber,
        processedCount: processedIds.length,
        processedIds: processedIds.slice(0, 20)
      }
    };
    
    await this.env.DB
      .prepare(`
        INSERT INTO crawler_states (source_id, pet_type, checkpoint, total_processed, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(source_id, pet_type) DO UPDATE SET
          checkpoint = excluded.checkpoint,
          total_processed = total_processed + excluded.total_processed,
          updated_at = excluded.updated_at
      `)
      .bind(
        this.sourceId,
        petType,
        JSON.stringify(checkpoint),
        processedIds.length,
        now
      )
      .run();
  }
}