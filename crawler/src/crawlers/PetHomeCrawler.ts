import { Pet } from '../types';
import { CrawlCheckpoint } from '../interfaces/ICrawler';
import { BaseCrawler } from './BaseCrawler';
import { HtmlParser } from '../utils/HtmlParser';
import { RetryHandler } from '../utils/RetryHandler';
// import { ImageDownloader } from '../utils/ImageDownloader';

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
        ? `${this.env.PET_HOME_BASE_URL}/dogs/`
        : `${this.env.PET_HOME_BASE_URL}/cats/`;
      
      const petsPerPage = 20;
      const maxPages = Math.ceil(limit / petsPerPage);
      let newPetsFound = 0;
      
      console.log(`Fetching ${limit} ${petType}s from Pet-Home...`);
      
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
          return await this.parseHTMLContent(html, petType, url);
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
   * 詳細ページから実際の画像URLを取得
   */
  private async fetchImageFromDetailPage(detailUrl: string, petId: string): Promise<string> {
    try {
      const response = await RetryHandler.execute(async () => {
        const res = await fetch(detailUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PawMatch-Bot/1.0)',
          },
          signal: AbortSignal.timeout(10000),
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        return res;
      });
      
      const html = await response.text();
      
      // Pet-Homeの画像URLパターンを検索
      const imageMatch = html.match(/<img[^>]+src="(https:\/\/image\.pet-home\.jp\/user_file\/[^"]+?)(?:_th\d+)?\.jpe?g"[^>]*alt="[^"]*"[^>]*\/>/i);
      
      if (imageMatch && imageMatch[1]) {
        // サムネイルサイズを除去してフルサイズ画像URLを取得
        const fullImageUrl = imageMatch[1].replace(/_th\d+$/, '') + '.jpg';
        console.log(`  ✓ Found image URL: ${fullImageUrl}`);
        return fullImageUrl;
      }
      
      // 代替パターン：任意のimage.pet-home.jp画像
      const fallbackMatch = html.match(/https:\/\/image\.pet-home\.jp\/user_file\/[\d\/]+\/\d+\.jpe?g/i);
      if (fallbackMatch) {
        console.log(`  ✓ Found fallback image URL: ${fallbackMatch[0]}`);
        return fallbackMatch[0];
      }
      
      console.log(`  ⚠ No image URL found for pet ${petId}`);
      return `https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&h=600&fit=crop`;
      
    } catch (error) {
      console.log(`  ⚠ Failed to fetch image for pet ${petId}:`, error);
      return `https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&h=600&fit=crop`;
    }
  }

  /**
   * HTMLコンテンツをパース
   */
  private async parseHTMLContent(html: string, petType: 'dog' | 'cat', baseUrl: string): Promise<Pet[]> {
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
          const pet = await this.parsePetElement(element, petType, baseUrl);
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
  private async parsePetElement(element: Element, petType: 'dog' | 'cat', baseUrl: string): Promise<Pet | null> {
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
      
      // 詳細ページURL取得
      const linkElement = element.querySelector('a[href]');
      const sourceUrl = linkElement ?
        new URL(linkElement.getAttribute('href') || '', baseUrl).href :
        `https://www.pet-home.jp/${petType}s/tokyo/pn${id}/`;
      
      // 画像URL取得（詳細ページから取得）
      const imageUrl = await this.fetchImageFromDetailPage(sourceUrl, id);
      
      // 画像をダウンロードして保存 (Cloudflare Workers環境では無効化)
      let finalImageUrl = imageUrl;
      // if (imageUrl && !imageUrl.includes('unsplash.com')) {
      //   const downloadResult = await ImageDownloader.downloadAndSave(
      //     imageUrl,
      //     id,
      //     petType,
      //     '/Users/nishikawa/projects/elchika/pawmatch/data/images'
      //   );
      //   
      //   if (downloadResult) {
      //     // ローカル画像パスを使用
      //     finalImageUrl = ImageDownloader.getLocalImagePath(id, petType, 'original');
      //   }
      // }
      
      // 性格・特徴情報取得（リストページでは限定的）
      const personalityElement = element.querySelector('.personality, .trait, .characteristic');
      let personality: string[] = [];
      if (personalityElement) {
        const personalityText = HtmlParser.cleanText(personalityElement.textContent);
        if (personalityText) {
          personality = personalityText.split(/[　、。]/).filter(trait => trait.trim().length > 1);
        }
      }
      
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
        personality: personality.length > 0 ? personality : ['人懐っこい', '甘えん坊'],
        medicalInfo: 'ワクチン接種済み、健康チェック済み',
        careRequirements: ['完全室内飼い', '定期健診', '愛情たっぷり'],
        imageUrl: finalImageUrl,
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
   * フォールバック: 正規表現ベースのHTMLパース（改善版）
   */
  private async parseHTMLContentFallback(html: string, petType: 'dog' | 'cat', baseUrl: string): Promise<Pet[]> {
    const pets: Pet[] = [];
    
    // より詳細なリンクパターンから抽出 - 都道府県部分も含めて取得
    const linkPattern = /<a[^>]+href=["']([^"']*\/(\w+)\/pn(\d+)\/)['"]/gi;
    const linkMatches = Array.from(html.matchAll(linkPattern));
    
    for (let i = 0; i < Math.min(linkMatches.length, 20); i++) {
      const match = linkMatches[i];
      const relativeUrl = match[1];
      const prefectureCode = match[2]; // URLから都道府県コードを取得
      const id = match[3];
      
      // 詳細ページのURLを構築
      const detailUrl = new URL(relativeUrl, baseUrl).href;
      
      try {
        // 詳細ページから実際のペット情報を取得
        const petDetails = await this.fetchPetDetails(detailUrl, id, petType, prefectureCode);
        if (petDetails) {
          pets.push(petDetails);
        }
      } catch (error) {
        console.error(`Failed to fetch details for pet ${id}:`, error);
        // フォールバックとして基本情報だけでペットを作成
        const prefecture = this.normalizePrefecture(prefectureCode);
        pets.push({
          id,
          type: petType,
          name: `${petType === 'dog' ? '犬' : '猫'} ID:${id}`,
          breed: '不明',
          age: '不明',
          gender: '不明',
          prefecture,
          city: '',
          location: prefecture,
          description: `保護${petType === 'dog' ? '犬' : '猫'}の里親募集中`,
          personality: [],
          medicalInfo: '',
          careRequirements: [],
          imageUrl: detailUrl, // スクリーンショット用に詳細ページURLを保存
          shelterName: '',
          shelterContact: '',
          sourceUrl: detailUrl,
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

  /**
   * 詳細ページから実際のペット情報を取得
   */
  private async fetchPetDetails(url: string, id: string, petType: 'dog' | 'cat', prefectureCode: string): Promise<Pet | null> {
    try {
      const response = await RetryHandler.execute(async () => {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PawMatch-Bot/1.0)',
          },
          signal: AbortSignal.timeout(15000),
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        return res.text();
      }, RetryHandler.getHttpRetryConfig());
      
      // 正規表現でHTMLから直接データを抽出
      console.log(`[DEBUG] Fetching details for ${url}`);
      
      // 名前を取得 - h3 class="main_title"から
      const nameMatch = response.match(/<h3[^>]*class="main_title"[^>]*>([^<]+)<\/h3>/i);
      const name = nameMatch ? HtmlParser.cleanText(nameMatch[1]) : `${petType === 'dog' ? '犬' : '猫'} ID:${id}`;
      console.log(`[DEBUG] Name found: ${name}`);
      
      // 犬種・猫種を取得 - /dogs/cg_ または /cats/cg_ を含むリンクから
      let breed = '不明';
      const breedPattern = petType === 'dog' 
        ? /<a[^>]*href="\/dogs\/cg_[^"]*"[^>]*>([^<]+)<\/a>/i
        : /<a[^>]*href="\/cats\/cg_[^"]*"[^>]*>([^<]+)<\/a>/i;
      const breedMatch = response.match(breedPattern);
      if (breedMatch) {
        breed = HtmlParser.cleanText(breedMatch[1]) || '不明';
      }
      console.log(`[DEBUG] Breed found: ${breed}`);
      
      // 年齢を取得 - 「成犬」「子犬」「成猫」「子猫」を含むdd要素から
      let age = '不明';
      const agePattern = /<dd[^>]*class="[^"]*inline[^"]*"[^>]*>([^<]*<a[^>]*>(?:成犬|子犬|成猫|子猫)[^<]*<\/a>[^<]*)<\/dd>/gi;
      const ageMatches = response.match(agePattern);
      if (ageMatches) {
        for (const match of ageMatches) {
          const textMatch = match.match(/>([^<]+)<\/a>([^<]*)<\/dd>/);
          if (textMatch) {
            const fullText = textMatch[1] + textMatch[2];
            console.log(`[DEBUG] Age text found: ${fullText}`);
            // 括弧内の年齢情報を抽出
            const ageDetailMatch = fullText.match(/（([^）]+)）/);
            if (ageDetailMatch) {
              age = ageDetailMatch[1];
            } else {
              age = HtmlParser.cleanText(fullText) || '不明';
            }
            break;
          }
        }
      }
      
      // 性別を取得 - dd class="right inline"から
      let gender = '不明';
      const genderMatch = response.match(/<dd[^>]*class="right inline"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/dd>/i);
      if (genderMatch) {
        const genderText = genderMatch[1];
        console.log(`[DEBUG] Gender text found: ${genderText}`);
        if (genderText.includes('♀') || genderText.includes('メス') || genderText.includes('girl')) {
          gender = 'メス';
        } else if (genderText.includes('♂') || genderText.includes('オス') || genderText.includes('boy')) {
          gender = 'オス';
        }
      }
      
      // 募集地域を取得
      let location = '';
      const locationMatch = response.match(/<dt[^>]*>(?:募集地域|地域)[^<]*<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/i);
      if (locationMatch) {
        location = HtmlParser.cleanText(locationMatch[1]) || '';
      }
      
      // 都道府県を正規化
      const prefecture = location ? this.extractPrefectureFromText(location) : this.normalizePrefecture(prefectureCode);
      const city = location.replace(prefecture, '').trim();
      
      // 性格・特徴を取得
      let personality: string[] = [];
      const personalityMatch = response.match(/<p[^>]*class="info"[^>]*>([^<]+)<\/p>/gi);
      if (personalityMatch) {
        // 複数のp.info要素を処理
        for (const match of personalityMatch) {
          const textMatch = match.match(/<p[^>]*class="info"[^>]*>([^<]+)<\/p>/i);
          if (textMatch) {
            const personalityText = HtmlParser.cleanText(textMatch[1]);
            if (personalityText && personalityText.length > 5) { // 最小文字数チェック
              // 全角スペースや句読点で分割して複数の特徴に分ける
              const traits = personalityText.split(/[　、。]/);
              for (const trait of traits) {
                const cleanTrait = trait.trim();
                if (cleanTrait.length > 1) {
                  personality.push(cleanTrait);
                }
              }
            }
          }
        }
      }
      
      console.log(`[DEBUG] Personality found: ${JSON.stringify(personality)}`);
      
      // 説明文を取得
      let description = `${name}の里親募集中です。`;
      const descMatch = response.match(/<div[^>]*class="[^"]*(?:description|pet-description|comment|message)[^"]*"[^>]*>([^<]+(?:<[^>]*>[^<]*)*)<\/div>/i);
      if (descMatch) {
        const cleanDesc = HtmlParser.cleanText(descMatch[1].replace(/<[^>]+>/g, ' '));
        if (cleanDesc) {
          description = cleanDesc;
        }
      }
      
      // 画像URLは詳細ページのURLを使用（スクリーンショット用）
      const imageUrl = url; // スクリーンショット用に詳細ページURLを保存
      
      console.log(`[DEBUG] Final pet data - Name: ${name}, Breed: ${breed}, Age: ${age}, Gender: ${gender}, Prefecture: ${prefecture}`);
      
      return {
        id,
        type: petType,
        name,
        breed,
        age,
        gender,
        prefecture,
        city,
        location: location || prefecture,
        description,
        personality: personality.length > 0 ? personality : ['人懐っこい'],
        medicalInfo: '',
        careRequirements: [],
        imageUrl,
        shelterName: '',
        shelterContact: '',
        sourceUrl: url,
        createdAt: new Date().toISOString(),
      };
      
    } catch (error) {
      console.error(`Failed to fetch pet details from ${url}:`, error);
      return null;
    }
  }

  /**
   * 都道府県コードを正規化
   */
  private normalizePrefecture(code: string): string {
    const prefectureMap: { [key: string]: string } = {
      'hokkaido': '北海道',
      'aomori': '青森県',
      'iwate': '岩手県',
      'miyagi': '宮城県',
      'akita': '秋田県',
      'yamagata': '山形県',
      'hukusima': '福島県',
      'fukushima': '福島県',
      'ibaraki': '茨城県',
      'tochigi': '栃木県',
      'gunma': '群馬県',
      'saitama': '埼玉県',
      'chiba': '千葉県',
      'tokyo': '東京都',
      'kanagawa': '神奈川県',
      'niigata': '新潟県',
      'toyama': '富山県',
      'ishikawa': '石川県',
      'fukui': '福井県',
      'yamanashi': '山梨県',
      'nagano': '長野県',
      'gifu': '岐阜県',
      'shizuoka': '静岡県',
      'aichi': '愛知県',
      'mie': '三重県',
      'shiga': '滋賀県',
      'kyoto': '京都府',
      'osaka': '大阪府',
      'hyogo': '兵庫県',
      'nara': '奈良県',
      'wakayama': '和歌山県',
      'tottori': '鳥取県',
      'shimane': '島根県',
      'okayama': '岡山県',
      'hiroshima': '広島県',
      'yamaguchi': '山口県',
      'tokushima': '徳島県',
      'kagawa': '香川県',
      'ehime': '愛媛県',
      'kochi': '高知県',
      'hukuoka': '福岡県',
      'fukuoka': '福岡県',
      'saga': '佐賀県',
      'nagasaki': '長崎県',
      'kumamoto': '熊本県',
      'oita': '大分県',
      'miyazaki': '宮崎県',
      'kagoshima': '鹿児島県',
      'okinawa': '沖縄県'
    };
    
    return prefectureMap[code.toLowerCase()] || '東京都';
  }

  /**
   * テキストから都道府県を抽出
   */
  private extractPrefectureFromText(text: string): string {
    const prefectures = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
      '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
      '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
      '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
      '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県',
      '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];
    
    for (const pref of prefectures) {
      if (text.includes(pref)) {
        return pref;
      }
    }
    
    return '東京都';
  }

  /**
   * 性別を正規化
   */
  private normalizeGender(text: string): string {
    if (text.includes('メス') || text.includes('女') || text.includes('♀')) {
      return 'メス';
    } else if (text.includes('オス') || text.includes('男') || text.includes('♂')) {
      return 'オス';
    }
    return '不明';
  }
}