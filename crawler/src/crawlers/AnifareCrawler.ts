import { Pet } from '../types';
import { CrawlCheckpoint } from '../interfaces/ICrawler';
import { BaseCrawler } from './BaseCrawler';

/**
 * Anifare（アニファレ）専用クローラー
 * https://www.anifare.jp/
 */
export class AnifareCrawler extends BaseCrawler {
  readonly sourceId = 'anifare';
  readonly sourceName = 'アニファレ';
  
  /**
   * Anifareからペット情報を取得
   */
  async fetchPets(
    petType: 'dog' | 'cat',
    limit: number,
    lastCheckpoint?: CrawlCheckpoint
  ): Promise<Pet[]> {
    const pets: Pet[] = [];
    
    try {
      // Anifare固有のAPIエンドポイント
      const baseUrl = `https://www.anifare.jp/api/pets`;
      const params = new URLSearchParams({
        type: petType,
        limit: limit.toString(),
        area: 'tokyo'
      });
      
      // 差分取得用のパラメータ
      if (lastCheckpoint?.metadata?.lastUpdateTime) {
        params.append('since', lastCheckpoint.metadata.lastUpdateTime);
      }
      
      const response = await fetch(`${baseUrl}?${params}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PawMatch-Bot/1.0)',
          'Accept': 'application/json'
        },
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch from Anifare: ${response.status}`);
        return pets;
      }
      
      const data = await response.json() as any;
      
      // Anifareのレスポンス形式に合わせてパース
      if (data && Array.isArray(data.pets)) {
        for (const item of data.pets) {
          pets.push(this.parseAnifarePet(item, petType));
          if (pets.length >= limit) break;
        }
      }
      
    } catch (error) {
      console.error('Anifare scraping error:', error);
    }
    
    return pets.slice(0, limit);
  }
  
  /**
   * AnifareのデータをPet形式に変換
   */
  private parseAnifarePet(data: any, petType: 'dog' | 'cat'): Pet {
    return {
      id: data.petId || data.id,
      type: petType,
      name: data.name || '名前なし',
      breed: data.breed || '雑種',
      age: this.parseAge(data.age),
      gender: this.parseGender(data.gender),
      prefecture: data.prefecture || '東京都',
      city: data.city || data.area || '',
      location: `${data.prefecture || '東京都'}${data.city || ''}`,
      description: data.description || data.comment || '',
      personality: this.parsePersonality(data.personality),
      medicalInfo: data.medicalInfo || this.buildMedicalInfo(data),
      careRequirements: data.careRequirements || ['愛情たっぷり'],
      imageUrl: data.imageUrl || data.image || '',
      shelterName: data.shelterName || data.organizationName || 'Anifare保護団体',
      shelterContact: data.contact || 'info@anifare.jp',
      sourceUrl: `https://www.anifare.jp/pets/${data.petId || data.id}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
  }
  
  /**
   * 年齢情報をパース
   */
  private parseAge(ageStr: any): number {
    if (typeof ageStr === 'number') return ageStr;
    if (!ageStr) return 1;
    
    // "2歳", "3ヶ月" などの形式に対応
    const match = ageStr.toString().match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (ageStr.includes('ヶ月') || ageStr.includes('ヵ月')) {
        return Math.max(1, Math.floor(num / 12));
      }
      return num;
    }
    return 1;
  }
  
  /**
   * 性別情報をパース
   */
  private parseGender(gender: any): string {
    if (!gender) return '不明';
    const genderStr = gender.toString().toLowerCase();
    if (genderStr.includes('オス') || genderStr.includes('♂') || genderStr === 'male') {
      return 'オス';
    }
    if (genderStr.includes('メス') || genderStr.includes('♀') || genderStr === 'female') {
      return 'メス';
    }
    return '不明';
  }
  
  /**
   * 性格情報をパース
   */
  private parsePersonality(personality: any): string[] {
    if (Array.isArray(personality)) return personality;
    if (typeof personality === 'string') {
      return personality.split(/[、,]/).map(p => p.trim());
    }
    return ['人懐っこい'];
  }
  
  /**
   * 医療情報を構築
   */
  private buildMedicalInfo(data: any): string {
    const info: string[] = [];
    if (data.vaccinated) info.push('ワクチン接種済み');
    if (data.neutered) info.push('去勢・避妊済み');
    if (data.healthChecked) info.push('健康チェック済み');
    return info.length > 0 ? info.join('、') : 'ワクチン接種済み';
  }
  
  /**
   * チェックポイント更新（Anifare固有の処理）
   */
  protected async updateCheckpoint(
    petType: 'dog' | 'cat',
    processedIds: string[]
  ): Promise<void> {
    const now = new Date().toISOString();
    const checkpoint: CrawlCheckpoint = {
      lastItemId: processedIds[0],
      lastCrawlAt: now,
      metadata: {
        lastUpdateTime: now,
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