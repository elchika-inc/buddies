import { Pet } from '../types';
import { CrawlCheckpoint } from '../interfaces/ICrawler';
import { BaseCrawler } from './BaseCrawler';

/**
 * HUGOOO（ハグー）専用クローラー
 * https://hugoo.jp/
 */
export class HugoooCrawler extends BaseCrawler {
  readonly sourceId = 'hugooo';
  readonly sourceName = 'ハグー';
  
  /**
   * HUGOOOからペット情報を取得
   */
  async fetchPets(
    petType: 'dog' | 'cat',
    limit: number,
    lastCheckpoint?: CrawlCheckpoint
  ): Promise<Pet[]> {
    const pets: Pet[] = [];
    
    try {
      // HUGOOO固有のエンドポイント（HTMLスクレイピング）
      const baseUrl = petType === 'dog'
        ? 'https://hugoo.jp/dog/tokyo'
        : 'https://hugoo.jp/cat/tokyo';
      
      // 複数ページを取得
      const petsPerPage = 12; // HUGOOOは1ページ12件
      const maxPages = Math.ceil(limit / petsPerPage);
      
      for (let page = 1; page <= Math.min(maxPages, 5); page++) {
        const url = `${baseUrl}?page=${page}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PawMatch-Bot/1.0)',
          },
        });
        
        if (!response.ok) {
          console.warn(`Failed to fetch HUGOOO page ${page}: ${response.status}`);
          continue;
        }
        
        const html = await response.text();
        const pagePets = this.parseHugoooHTML(html, petType);
        
        // 差分チェック（最後のIDより新しいもののみ）
        if (lastCheckpoint?.metadata?.lastPetNumber) {
          const lastNum = parseInt(lastCheckpoint.metadata.lastPetNumber);
          for (const pet of pagePets) {
            const petNum = this.extractPetNumber(pet.id);
            if (petNum > lastNum) {
              pets.push(pet);
            }
          }
        } else {
          pets.push(...pagePets);
        }
        
        if (pets.length >= limit) break;
      }
      
    } catch (error) {
      console.error('HUGOOO scraping error:', error);
    }
    
    return pets.slice(0, limit);
  }
  
  /**
   * HUGOOOのHTMLをパース
   */
  private parseHugoooHTML(html: string, petType: 'dog' | 'cat'): Pet[] {
    const pets: Pet[] = [];
    
    // HUGOOOのHTML構造に合わせたパース
    // 実際のHTML構造に合わせて調整が必要
    const petCardRegex = /<div class="pet-card"[^>]*>([\s\S]*?)<\/div>/g;
    const matches = Array.from(html.matchAll(petCardRegex));
    
    for (const match of matches) {
      const cardHtml = match[1];
      const pet = this.parsePetCard(cardHtml, petType);
      if (pet) {
        pets.push(pet);
      }
    }
    
    // 代替パース方法（より詳細なセレクター）
    if (pets.length === 0) {
      pets.push(...this.parseAlternativeFormat(html, petType));
    }
    
    return pets;
  }
  
  /**
   * ペットカード要素をパース
   */
  private parsePetCard(cardHtml: string, petType: 'dog' | 'cat'): Pet | null {
    try {
      // ID抽出
      const idMatch = cardHtml.match(/pet-id["\s:]+(\d+)/i);
      const id = idMatch ? idMatch[1] : String(Date.now());
      
      // 名前抽出
      const nameMatch = cardHtml.match(/<h[23][^>]*>([^<]+)<\/h[23]>/);
      const name = nameMatch ? nameMatch[1].trim() : `${petType === 'dog' ? '犬' : '猫'}ちゃん`;
      
      // 画像URL抽出
      const imageMatch = cardHtml.match(/<img[^>]+src=["']([^"']+)["']/);
      const imageUrl = imageMatch ? this.normalizeImageUrl(imageMatch[1]) : '';
      
      // 年齢・性別抽出
      const ageMatch = cardHtml.match(/(\d+)[\s]*歳/);
      const age = ageMatch ? parseInt(ageMatch[1]) : 2;
      
      const genderMatch = cardHtml.match(/(オス|メス|♂|♀)/);
      const gender = this.normalizeGender(genderMatch?.[1]);
      
      // 地域情報
      const locationMatch = cardHtml.match(/(東京都|神奈川県|埼玉県|千葉県)([^<\s]+[市区町村])?/);
      const prefecture = locationMatch?.[1] || '東京都';
      const city = locationMatch?.[2] || '';
      
      return {
        id,
        type: petType,
        name,
        breed: this.extractBreed(cardHtml) || '雑種',
        age,
        gender,
        prefecture,
        city,
        location: `${prefecture}${city}`,
        description: this.buildDescription(name, petType),
        personality: ['人懐っこい', '元気'],
        medicalInfo: 'ワクチン接種済み、健康チェック済み',
        careRequirements: ['室内飼い推奨', '定期健診'],
        imageUrl,
        shelterName: 'HUGOOO登録保護団体',
        shelterContact: 'contact@hugoo.jp',
        sourceUrl: `https://hugoo.jp/pets/${id}`,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to parse pet card:', error);
      return null;
    }
  }
  
  /**
   * 代替フォーマットでのパース
   */
  private parseAlternativeFormat(html: string, petType: 'dog' | 'cat'): Pet[] {
    const pets: Pet[] = [];
    
    // JSON-LD構造データを探す
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData && Array.isArray(jsonData.itemListElement)) {
          for (const item of jsonData.itemListElement) {
            const pet = this.parseJsonLdItem(item, petType);
            if (pet) pets.push(pet);
          }
        }
      } catch (error) {
        console.error('Failed to parse JSON-LD:', error);
      }
    }
    
    return pets;
  }
  
  /**
   * JSON-LDアイテムをパース
   */
  private parseJsonLdItem(item: any, petType: 'dog' | 'cat'): Pet | null {
    try {
      return {
        id: item.identifier || String(Date.now()),
        type: petType,
        name: item.name || '名前なし',
        breed: item.breed || '雑種',
        age: parseInt(item.age) || 2,
        gender: this.normalizeGender(item.gender),
        prefecture: '東京都',
        city: item.location || '',
        location: `東京都${item.location || ''}`,
        description: item.description || '',
        personality: ['人懐っこい'],
        medicalInfo: 'ワクチン接種済み',
        careRequirements: ['愛情たっぷり'],
        imageUrl: item.image || '',
        shelterName: item.organization || 'HUGOOO保護団体',
        shelterContact: 'contact@hugoo.jp',
        sourceUrl: item.url || `https://hugoo.jp/pets/${item.identifier}`,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * 品種情報を抽出
   */
  private extractBreed(html: string): string | null {
    const breedMatch = html.match(/品種[:\s]*([^<\s,]+)/);
    return breedMatch ? breedMatch[1].trim() : null;
  }
  
  /**
   * 画像URLを正規化
   */
  private normalizeImageUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `https://hugoo.jp${url}`;
    return url;
  }
  
  /**
   * 性別を正規化
   */
  private normalizeGender(gender?: string): string {
    if (!gender) return '不明';
    if (gender.includes('オス') || gender === '♂') return 'オス';
    if (gender.includes('メス') || gender === '♀') return 'メス';
    return '不明';
  }
  
  /**
   * 説明文を生成
   */
  private buildDescription(name: string, petType: 'dog' | 'cat'): string {
    return `${name}は新しい家族を探している素敵な${petType === 'dog' ? '犬' : '猫'}ちゃんです。` +
           `愛情いっぱいの家庭で幸せに暮らせることを願っています。`;
  }
  
  /**
   * ペット番号を抽出
   */
  private extractPetNumber(petId: string): number {
    const match = petId.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
  
  /**
   * チェックポイント更新（HUGOOO固有）
   */
  protected async updateCheckpoint(
    petType: 'dog' | 'cat',
    processedIds: string[]
  ): Promise<void> {
    const maxPetNumber = Math.max(...processedIds.map(id => 
      this.extractPetNumber(id.replace(`${this.sourceId}_`, ''))
    ));
    
    const now = new Date().toISOString();
    const checkpoint: CrawlCheckpoint = {
      lastItemId: processedIds[0],
      lastCrawlAt: now,
      metadata: {
        lastPetNumber: String(maxPetNumber),
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