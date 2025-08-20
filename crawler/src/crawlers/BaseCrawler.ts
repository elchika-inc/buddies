import { Env, Pet, CrawlResult } from '../types';
import { ICrawler, CrawlOptions, CrawlCheckpoint, CrawlerState } from '../interfaces/ICrawler';

/**
 * ベースクローラークラス
 * 共通処理を実装し、サイト固有の処理は継承先で実装
 */
export abstract class BaseCrawler implements ICrawler {
  abstract readonly sourceId: string;
  abstract readonly sourceName: string;
  
  constructor(protected env: Env) {}
  
  /**
   * メインのクロール処理
   */
  async crawl(
    petType: 'dog' | 'cat',
    options: CrawlOptions
  ): Promise<CrawlResult> {
    const result: CrawlResult = {
      success: false,
      totalPets: 0,
      newPets: 0,
      updatedPets: 0,
      errors: []
    };
    
    try {
      console.log(`Starting ${petType} crawling from ${this.sourceName} (differential: ${options.useDifferential})...`);
      
      // 前回のクロール状態を取得
      const lastCheckpoint = options.useDifferential && !options.forceFullScan
        ? await this.getLastCheckpoint(petType)
        : null;
      
      if (lastCheckpoint) {
        console.log('Using checkpoint:', lastCheckpoint);
      }
      
      // ペット情報を取得
      const pets = await this.fetchPets(petType, options.limit, lastCheckpoint || undefined);
      result.totalPets = pets.length;
      
      // 処理したアイテムのIDリスト
      const processedIds: string[] = [];
      
      for (const pet of pets) {
        try {
          // ユニークIDを生成（source_petId形式）
          const uniqueId = this.generateUniqueId(pet.id);
          pet.id = uniqueId;
          
          // 既存データチェック
          const existingPet = await this.env.DB
            .prepare('SELECT id FROM pets WHERE id = ?')
            .bind(uniqueId)
            .first();
          
          if (existingPet) {
            await this.updatePetData(pet);
            result.updatedPets++;
          } else {
            await this.createPetData(pet);
            result.newPets++;
          }
          
          processedIds.push(pet.id);
          
          // 画像保存
          await this.saveImageToR2(pet);
          
        } catch (error) {
          result.errors.push(`Failed to process pet ${pet.id}: ${error}`);
          console.error(`Error processing pet ${pet.id}:`, error);
        }
      }
      
      // チェックポイントを更新
      if (processedIds.length > 0 && options.useDifferential) {
        await this.updateCheckpoint(petType, processedIds);
      }
      
      result.success = result.errors.length === 0;
      console.log('Crawling completed:', result);
      
      return result;
      
    } catch (error) {
      result.errors.push(`Crawling failed: ${error}`);
      console.error('Crawling error:', error);
      return result;
    }
  }
  
  /**
   * サイト固有のペット取得処理（継承先で実装）
   */
  abstract fetchPets(
    petType: 'dog' | 'cat',
    limit: number,
    lastCheckpoint?: CrawlCheckpoint
  ): Promise<Pet[]>;
  
  /**
   * ユニークIDを生成
   */
  protected generateUniqueId(petId: string): string {
    return `${this.sourceId}_${petId}`;
  }
  
  /**
   * 最終チェックポイントを取得
   */
  protected async getLastCheckpoint(petType: 'dog' | 'cat'): Promise<CrawlCheckpoint | null> {
    try {
      const state = await this.env.DB
        .prepare(`
          SELECT checkpoint 
          FROM crawler_states 
          WHERE source_id = ? AND pet_type = ?
        `)
        .bind(this.sourceId, petType)
        .first<{ checkpoint: string }>();
      
      return state ? JSON.parse(state.checkpoint) : null;
    } catch (error) {
      console.error('Failed to get checkpoint:', error);
      return null;
    }
  }
  
  /**
   * チェックポイントを更新
   */
  protected async updateCheckpoint(
    petType: 'dog' | 'cat',
    processedIds: string[]
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      const checkpoint: CrawlCheckpoint = {
        lastItemId: processedIds[0], // 最新のID
        lastCrawlAt: now,
        metadata: {
          processedCount: processedIds.length,
          processedIds: processedIds.slice(0, 20) // 最新20件を保存
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
    } catch (error) {
      console.error('Failed to update checkpoint:', error);
    }
  }
  
  /**
   * ペットデータを作成
   */
  protected async createPetData(pet: Pet): Promise<void> {
    await this.env.DB
      .prepare(`
        INSERT INTO pets (
          id, type, name, breed, age, gender, prefecture, city, location,
          description, personality, medical_info, care_requirements,
          image_url, shelter_name, shelter_contact, source_url, 
          adoption_fee, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        pet.id,
        pet.type,
        pet.name,
        pet.breed,
        pet.age,
        pet.gender,
        pet.prefecture,
        pet.city,
        pet.location,
        pet.description,
        JSON.stringify(pet.personality),
        pet.medicalInfo,
        JSON.stringify(pet.careRequirements),
        pet.imageUrl,
        pet.shelterName,
        pet.shelterContact,
        pet.sourceUrl,
        0, // adoption_fee (デフォルト値)
        JSON.stringify({ ...pet, sourceId: this.sourceId }), // metadataにsourceIdを含める
        pet.createdAt
      )
      .run();
  }
  
  /**
   * ペットデータを更新
   */
  protected async updatePetData(pet: Pet): Promise<void> {
    await this.env.DB
      .prepare(`
        UPDATE pets SET
          name = ?, breed = ?, age = ?, gender = ?, prefecture = ?, city = ?,
          location = ?, description = ?, personality = ?, medical_info = ?,
          care_requirements = ?, image_url = ?, shelter_name = ?, shelter_contact = ?,
          source_url = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        pet.name,
        pet.breed,
        pet.age,
        pet.gender,
        pet.prefecture,
        pet.city,
        pet.location,
        pet.description,
        JSON.stringify(pet.personality),
        pet.medicalInfo,
        JSON.stringify(pet.careRequirements),
        pet.imageUrl,
        pet.shelterName,
        pet.shelterContact,
        pet.sourceUrl,
        JSON.stringify({ ...pet, sourceId: this.sourceId }),
        pet.id
      )
      .run();
  }
  
  /**
   * 画像をR2に保存
   */
  protected async saveImageToR2(pet: Pet): Promise<void> {
    try {
      // デフォルト実装：継承先でオーバーライド可能
      const imageUrl = pet.imageUrl;
      if (!imageUrl || !imageUrl.startsWith('http')) {
        return;
      }
      
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PawMatch-Bot/1.0)',
        },
      });
      
      if (imageResponse.ok) {
        const imageBlob = await imageResponse.blob();
        const key = `${pet.type}s/${pet.id}.jpg`;
        
        await this.env.IMAGES_BUCKET.put(key, imageBlob, {
          httpMetadata: {
            contentType: 'image/jpeg',
          },
          customMetadata: {
            petId: pet.id,
            petType: pet.type,
            sourceId: this.sourceId,
            uploadedAt: new Date().toISOString(),
          },
        });
        
        console.log(`Image saved to R2: ${key}`);
      }
    } catch (error) {
      console.error(`Failed to save image for pet ${pet.id}:`, error);
    }
  }
}