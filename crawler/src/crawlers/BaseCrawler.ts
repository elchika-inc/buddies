import { Env, Pet, CrawlResult } from '../types';
import { ICrawler, CrawlOptions, CrawlCheckpoint, CrawlerState } from '../interfaces/ICrawler';
import { RetryHandler } from '../utils/RetryHandler';
import { ImageProcessor } from '../utils/ImageProcessor';

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
          const existingPet = await RetryHandler.execute(async () => {
            const stmt = this.env.DB.prepare('SELECT id FROM pets WHERE id = ?');
            return await stmt.bind(uniqueId).first();
          }, RetryHandler.getDatabaseRetryConfig());
          
          if (existingPet) {
            await this.updatePetData(pet);
            result.updatedPets++;
          } else {
            await this.createPetData(pet);
            result.newPets++;
          }
          
          processedIds.push(pet.id);
          
          // 画像保存（リトライ付き）
          await RetryHandler.execute(
            () => this.saveImageToR2(pet),
            RetryHandler.getHttpRetryConfig()
          );
          
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
    // IDのサニタイゼーション
    const sanitizedPetId = petId.replace(/[^a-zA-Z0-9_-]/g, '');
    return `${this.sourceId}_${sanitizedPetId}`;
  }
  
  /**
   * 最終チェックポイントを取得
   */
  protected async getLastCheckpoint(petType: 'dog' | 'cat'): Promise<CrawlCheckpoint | null> {
    try {
      return await RetryHandler.execute(async () => {
        const stmt = this.env.DB.prepare(`
          SELECT checkpoint 
          FROM crawler_states 
          WHERE source_id = ? AND pet_type = ?
        `);
        
        const state = await stmt.bind(this.sourceId, petType).first<{ checkpoint: string }>();
        
        return state ? JSON.parse(state.checkpoint) : null;
      }, RetryHandler.getDatabaseRetryConfig());
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
      await RetryHandler.execute(async () => {
        const now = new Date().toISOString();
        const checkpoint: CrawlCheckpoint = {
          lastItemId: processedIds[0], // 最新のID
          lastCrawlAt: now,
          metadata: {
            processedCount: processedIds.length,
            processedIds: processedIds.slice(0, 20) // 最新20件を保存
          }
        };
        
        const stmt = this.env.DB.prepare(`
          INSERT INTO crawler_states (source_id, pet_type, checkpoint, total_processed, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(source_id, pet_type) DO UPDATE SET
            checkpoint = excluded.checkpoint,
            total_processed = total_processed + excluded.total_processed,
            updated_at = excluded.updated_at
        `);
        
        await stmt.bind(
          this.sourceId,
          petType,
          JSON.stringify(checkpoint),
          processedIds.length,
          now
        ).run();
      }, RetryHandler.getDatabaseRetryConfig());
    } catch (error) {
      console.error('Failed to update checkpoint:', error);
    }
  }
  
  /**
   * ペットデータを作成
   */
  protected async createPetData(pet: Pet): Promise<void> {
    // 入力値のサニタイゼーション
    const sanitizedPet = this.sanitizePetData(pet);
    
    await RetryHandler.execute(async () => {
      const stmt = this.env.DB.prepare(`
        INSERT INTO pets (
          id, type, name, breed, age, gender, prefecture, city, location,
          description, personality, medical_info, care_requirements,
          image_url, shelter_name, shelter_contact, source_url, 
          adoption_fee, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      await stmt.bind(
        sanitizedPet.id,
        sanitizedPet.type,
        sanitizedPet.name,
        sanitizedPet.breed,
        sanitizedPet.age,
        sanitizedPet.gender,
        sanitizedPet.prefecture,
        sanitizedPet.city,
        sanitizedPet.location,
        sanitizedPet.description,
        JSON.stringify(sanitizedPet.personality),
        sanitizedPet.medicalInfo,
        JSON.stringify(sanitizedPet.careRequirements),
        sanitizedPet.imageUrl,
        sanitizedPet.shelterName,
        sanitizedPet.shelterContact,
        sanitizedPet.sourceUrl,
        0, // adoption_fee (デフォルト値)
        JSON.stringify({ ...sanitizedPet, sourceId: this.sourceId }),
        sanitizedPet.createdAt
      ).run();
    }, RetryHandler.getDatabaseRetryConfig());
  }
  
  /**
   * ペットデータを更新
   */
  protected async updatePetData(pet: Pet): Promise<void> {
    // 入力値のサニタイゼーション
    const sanitizedPet = this.sanitizePetData(pet);
    
    await RetryHandler.execute(async () => {
      const stmt = this.env.DB.prepare(`
        UPDATE pets SET
          name = ?, breed = ?, age = ?, gender = ?, prefecture = ?, city = ?,
          location = ?, description = ?, personality = ?, medical_info = ?,
          care_requirements = ?, image_url = ?, shelter_name = ?, shelter_contact = ?,
          source_url = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      await stmt.bind(
        sanitizedPet.name,
        sanitizedPet.breed,
        sanitizedPet.age,
        sanitizedPet.gender,
        sanitizedPet.prefecture,
        sanitizedPet.city,
        sanitizedPet.location,
        sanitizedPet.description,
        JSON.stringify(sanitizedPet.personality),
        sanitizedPet.medicalInfo,
        JSON.stringify(sanitizedPet.careRequirements),
        sanitizedPet.imageUrl,
        sanitizedPet.shelterName,
        sanitizedPet.shelterContact,
        sanitizedPet.sourceUrl,
        JSON.stringify({ ...sanitizedPet, sourceId: this.sourceId }),
        sanitizedPet.id
      ).run();
    }, RetryHandler.getDatabaseRetryConfig());
  }
  
  /**
   * 入力データのサニタイゼーション
   */
  protected sanitizePetData(pet: Pet): Pet {
    return {
      ...pet,
      id: this.sanitizeString(pet.id, 100),
      name: this.sanitizeString(pet.name, 255),
      breed: this.sanitizeString(pet.breed, 100),
      age: this.sanitizeString(pet.age, 20),
      gender: this.sanitizeString(pet.gender, 10),
      prefecture: this.sanitizeString(pet.prefecture, 50),
      city: this.sanitizeString(pet.city, 100),
      location: this.sanitizeString(pet.location, 255),
      description: this.sanitizeString(pet.description, 2000),
      medicalInfo: this.sanitizeString(pet.medicalInfo, 1000),
      shelterName: this.sanitizeString(pet.shelterName, 255),
      shelterContact: this.sanitizeString(pet.shelterContact, 255),
      sourceUrl: this.sanitizeUrl(pet.sourceUrl),
      imageUrl: this.sanitizeUrl(pet.imageUrl),
    };
  }

  /**
   * 文字列のサニタイゼーション
   */
  protected sanitizeString(value: string, maxLength: number): string {
    if (!value || typeof value !== 'string') return '';
    
    return value
      .trim()
      .slice(0, maxLength)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 制御文字除去
      .replace(/'/g, "''"); // SQLエスケープ
  }

  /**
   * URLのサニタイゼーション
   */
  protected sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') return '';
    
    try {
      const parsedUrl = new URL(url);
      // HTTPSまたはHTTPのみ許可
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return '';
      }
      return url.slice(0, 500); // 長さ制限
    } catch {
      return '';
    }
  }

  /**
   * 画像をR2に保存（オリジナルとWebPの両方）
   */
  protected async saveImageToR2(pet: Pet): Promise<void> {
    try {
      const imageUrl = pet.imageUrl;
      if (!imageUrl || !imageUrl.startsWith('http')) {
        return;
      }
      
      const imageResponse = await RetryHandler.execute(async () => {
        return await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PawMatch-Bot/1.0)',
          },
          signal: AbortSignal.timeout(10000), // 10秒タイムアウト
        });
      }, RetryHandler.getHttpRetryConfig());
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      
      // 画像データを取得
      const imageArrayBuffer = await imageResponse.arrayBuffer();
      const imageSize = imageArrayBuffer.byteLength;
      
      // サイズ検証（最大10MB）
      if (!ImageProcessor.validateImageSize(imageSize)) {
        console.warn(`Image too large for pet ${pet.id}: ${imageSize} bytes`);
        return;
      }
      
      // コンテンツタイプを検出
      const contentType = ImageProcessor.getContentType(imageArrayBuffer);
      const originalExtension = ImageProcessor.getExtension(contentType);
      
      // メタデータの生成
      const metadata = ImageProcessor.generateMetadata(
        pet.id,
        pet.type,
        this.sourceId,
        originalExtension
      );
      
      // 1. オリジナル画像を保存
      const originalKey = ImageProcessor.generateR2Key(
        pet.type,
        pet.id,
        'original',
        originalExtension
      );
      
      await this.env.IMAGES_BUCKET.put(originalKey, imageArrayBuffer, {
        httpMetadata: {
          contentType,
          cacheControl: 'public, max-age=31536000', // 1年間キャッシュ
        },
        customMetadata: {
          ...metadata,
          format: 'original',
        },
      });
      
      console.log(`Original image saved: ${originalKey} (${(imageSize / 1024).toFixed(2)}KB)`);
      
      // 2. WebP形式で保存
      // 注: 実際の変換はCloudflare Image Resizing APIやWorkers内で
      // sharp等のライブラリが使えないため、ここでは同じデータを保存
      // 本番環境では外部APIやImage Resizing APIを使用する必要があります
      const webpKey = ImageProcessor.generateR2Key(
        pet.type,
        pet.id,
        'webp'
      );
      
      // WebP変換（簡易実装）
      const webpData = await ImageProcessor.convertToWebP(imageArrayBuffer, 85);
      
      await this.env.IMAGES_BUCKET.put(webpKey, webpData, {
        httpMetadata: {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000', // 1年間キャッシュ
        },
        customMetadata: {
          ...metadata,
          format: 'webp',
          quality: '85',
        },
      });
      
      console.log(`WebP image saved: ${webpKey}`);
      
    } catch (error) {
      console.error(`Failed to save image for pet ${pet.id}:`, error);
    }
  }
}