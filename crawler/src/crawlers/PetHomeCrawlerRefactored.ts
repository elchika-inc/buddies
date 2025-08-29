/**
 * リファクタリングされたPetHomeCrawlerクラス
 * 
 * 各専門クラスを組み合わせたオーケストレーション
 */
import { BaseCrawler } from './BaseCrawler';
import { PetHomeHtmlParser } from '../parsers/PetHomeHtmlParser';
import { PetHomeDataFetcher } from '../fetchers/PetHomeDataFetcher';
import { PetDataNormalizer } from '../normalizers/PetDataNormalizer';
import type { Env } from '../types/env';
import type { NormalizedPet } from '../types/pet';
import type { CrawlCheckpoint } from '../interfaces/ICrawler';

export class PetHomeCrawler extends BaseCrawler {
  readonly sourceId = 'pet-home';
  readonly sourceName = 'PetHome';
  
  private parser: PetHomeHtmlParser;
  private fetcher: PetHomeDataFetcher;
  private normalizer: PetDataNormalizer;

  constructor(env: Env) {
    super(env);
    this.parser = new PetHomeHtmlParser();
    this.fetcher = new PetHomeDataFetcher();
    this.normalizer = new PetDataNormalizer();
  }

  /**
   * ペットを取得（差分モード対応版）
   */
  async fetchPets(
    petType: 'dog' | 'cat', 
    limit: number = 100,
    lastCheckpoint?: CrawlCheckpoint
  ): Promise<NormalizedPet[]> {
    const isDifferential = !!lastCheckpoint;
    const recentPetIds = new Set(lastCheckpoint?.recentPetIds || []);
    const maxPages = isDifferential ? 20 : Math.ceil(limit / 20); // 差分モードは最大20ページ
    
    console.log(`Starting ${isDifferential ? 'differential' : 'full'} crawl for ${petType}s`);
    if (isDifferential) {
      console.log(`Looking for pets newer than: ${lastCheckpoint.lastItemId}`);
      console.log(`Known recent pets: ${recentPetIds.size} IDs`);
    }
    
    const pets: NormalizedPet[] = [];
    let page = 1;
    let foundKnownPet = false;
    let consecutiveKnownPets = 0;

    while (page <= maxPages) {
      try {
        // リストページを取得
        const html = await this.fetcher.fetchListPage(petType, page);
        
        // HTMLをパース
        const parsedPets = this.parser.parseListPage(html, petType);
        
        if (parsedPets.length === 0) {
          console.log(`No more pets found at page ${page}`);
          break;
        }
        
        // 各ペットの詳細を取得して正規化
        for (const parsedPet of parsedPets) {
          const petId = `pet-home_${parsedPet.id}`;
          
          // 差分モード: 既知のペットをチェック
          if (isDifferential) {
            if (recentPetIds.has(petId) || petId === lastCheckpoint.lastItemId) {
              foundKnownPet = true;
              consecutiveKnownPets++;
              console.log(`Found known pet: ${petId} (consecutive: ${consecutiveKnownPets})`);
              
              // 連続して3件以上既知のペットが見つかったら、十分に過去まで遡ったと判断
              if (consecutiveKnownPets >= 3) {
                console.log('Reached sufficient known pets, stopping crawl');
                return pets;
              }
              continue; // 既知のペットはスキップ
            } else {
              consecutiveKnownPets = 0; // 新規ペットが見つかったらリセット
            }
            
            // 最小取得件数に達していて、既知のペットを見つけた場合は終了
            if (foundKnownPet && pets.length >= limit) {
              console.log(`Reached limit (${limit}) and found known pets, stopping`);
              return pets;
            }
          }
          
          // 通常モード: 件数制限チェック
          if (!isDifferential && pets.length >= limit) {
            console.log(`Reached limit (${limit}), stopping`);
            return pets;
          }
          
          try {
            // 詳細ページを取得
            const detailHtml = await this.fetcher.fetchDetailPage(parsedPet.detailUrl);
            const detailData = this.parser.parseDetailPage(detailHtml);
            
            // データを正規化
            const normalizedPet = this.normalizer.normalizeData(
              parsedPet,
              detailData,
              petType
            );
            
            pets.push(normalizedPet);
            console.log(`Added new pet: ${petId} (total: ${pets.length})`);
            
            // レート制限対策
            await this.fetcher.waitForRateLimit(500);
          } catch (error) {
            console.error(`Failed to fetch details for pet ${parsedPet.id}:`, error);
            // エラーがあっても続行
          }
        }
        
        page++;
        
        // ページ間のレート制限
        await this.fetcher.waitForRateLimit(1000);
      } catch (error) {
        console.error(`Failed to fetch page ${page}:`, error);
        break;
      }
    }

    if (isDifferential && !foundKnownPet) {
      console.warn(`Warning: Did not find any known pets in ${page - 1} pages`);
    }
    
    console.log(`Crawled ${pets.length} new ${petType}s from ${page - 1} pages`);
    return pets;
  }

  /**
   * 画像を取得して保存
   */
  async fetchAndSaveImages(pet: NormalizedPet): Promise<{
    hasJpeg: boolean;
    hasWebp: boolean;
  }> {
    if (!pet.imageUrl) {
      return { hasJpeg: false, hasWebp: false };
    }

    try {
      // 画像を取得
      const imageData = await this.fetcher.fetchImage(pet.imageUrl);
      
      // R2に保存
      if (this.env.R2) {
        const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`;
        await this.env.R2.put(jpegKey, imageData);
        
        console.log(`Saved image for pet ${pet.id}`);
        return { hasJpeg: true, hasWebp: false };
      }
      
      return { hasJpeg: false, hasWebp: false };
    } catch (error) {
      console.error(`Failed to fetch image for pet ${pet.id}:`, error);
      return { hasJpeg: false, hasWebp: false };
    }
  }

  /**
   * データベースに保存
   */
  async savePetToDatabase(pet: NormalizedPet): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO pets (
        id, type, name, breed, age, gender,
        prefecture, city, location, description,
        personality, medical_info, care_requirements,
        good_with, health_notes, image_url,
        shelter_name, shelter_contact, source_url,
        adoption_fee, metadata, has_jpeg, has_webp,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        datetime('now'), datetime('now')
      )
    `;

    await this.env.DB.prepare(query).bind(
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
      JSON.stringify(pet.goodWith),
      JSON.stringify(pet.healthNotes),
      pet.imageUrl,
      pet.shelterName,
      pet.shelterContact,
      pet.sourceUrl,
      pet.adoptionFee,
      JSON.stringify(pet.metadata),
      pet.hasJpeg ? 1 : 0,
      pet.hasWebp ? 1 : 0
    ).run();

    console.log(`Saved pet ${pet.id} to database`);
  }

  /**
   * 完全なクロールフロー
   */
  async performFullCrawl(petType: 'dog' | 'cat', limit: number = 100): Promise<{
    success: number;
    failed: number;
    total: number;
  }> {
    const stats = {
      success: 0,
      failed: 0,
      total: 0
    };

    try {
      // ペットを取得
      const pets = await this.fetchPets(petType, limit);
      stats.total = pets.length;

      // 各ペットを処理
      for (const pet of pets) {
        try {
          // 画像を取得して保存
          const imageStatus = await this.fetchAndSaveImages(pet);
          pet.hasJpeg = imageStatus.hasJpeg;
          pet.hasWebp = imageStatus.hasWebp;
          
          // データベースに保存
          await this.savePetToDatabase(pet);
          
          stats.success++;
        } catch (error) {
          console.error(`Failed to process pet ${pet.id}:`, error);
          stats.failed++;
        }
      }
    } catch (error) {
      console.error('Crawl failed:', error);
    }

    console.log(`Crawl completed: ${stats.success} success, ${stats.failed} failed`);
    return stats;
  }
}