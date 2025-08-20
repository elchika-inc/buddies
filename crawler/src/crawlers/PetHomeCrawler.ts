import { Pet } from '../types';
import { CrawlCheckpoint } from '../interfaces/ICrawler';
import { BaseCrawler } from './BaseCrawler';

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
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PawMatch-Bot/1.0)',
          },
        });
        
        if (!response.ok) {
          console.warn(`Failed to fetch page ${page}: ${response.status}`);
          continue;
        }
        
        const html = await response.text();
        const pagePets = this.parseHTMLContent(html, petType);
        
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
  private parseHTMLContent(html: string, petType: 'dog' | 'cat'): Pet[] {
    const pets: Pet[] = [];
    
    // ペットホーム固有のHTML構造をパース
    // TODO: より堅牢なHTMLパーサーに置き換える
    const petIdMatches = html.match(/pn(\d+)/g) || [];
    const nameMatches = html.match(/<h3[^>]*>([^<]+)<\/h3>/g) || [];
    
    for (let i = 0; i < Math.min(petIdMatches.length, nameMatches.length); i++) {
      const id = petIdMatches[i].replace('pn', '');
      const name = nameMatches[i].replace(/<[^>]*>/g, '').trim();
      
      if (id && name) {
        pets.push({
          id, // BaseCrawlerでsourceIdが付与される
          type: petType,
          name,
          breed: '雑種',
          age: 2,
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
          sourceUrl: `https://www.pet-home.jp/${petType}s/tokyo/pn${id}/`,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    return pets;
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