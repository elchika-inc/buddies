import { Env, Pet, CrawlResult } from './types';

export class PetHomeCrawler {
  constructor(private env: Env) {}

  async crawlPets(petType: 'dog' | 'cat' = 'cat', limit: number = 10, isDifferentialMode: boolean = true): Promise<CrawlResult> {
    const result: CrawlResult = {
      success: false,
      totalPets: 0,
      newPets: 0,
      updatedPets: 0,
      errors: []
    };

    try {
      console.log(`Starting ${petType} crawling (differential: ${isDifferentialMode})...`);
      
      // 前回のクロール状態を取得
      const lastState = isDifferentialMode ? await this.getLastCrawlState(petType) : null;
      console.log('Last crawl state:', lastState);
      
      // ペットホームのAPIエンドポイント（実際のエンドポイントに合わせて調整）
      const baseUrl = petType === 'dog' 
        ? `${this.env.PET_HOME_BASE_URL}/dogs/tokyo/`
        : `${this.env.PET_HOME_BASE_URL}/cats/tokyo/`;

      // HTMLページをクロール（実際の実装ではHTMLParserを使用）
      const pets = await this.scrapePageData(baseUrl, petType, limit, lastState);
      
      result.totalPets = pets.length;

      // 処理したペットIDを記録
      const processedPetIds: string[] = [];
      
      for (const pet of pets) {
        try {
          // 既存データチェック
          const existingPet = await this.env.DB
            .prepare('SELECT id FROM pets WHERE id = ?')
            .bind(pet.id)
            .first();

          if (existingPet) {
            // データ更新
            await this.updatePetData(pet);
            result.updatedPets++;
          } else {
            // 新規データ作成
            await this.createPetData(pet);
            result.newPets++;
          }

          // 処理済みペットIDを記録
          await this.recordProcessedPetId(pet.id, petType);
          processedPetIds.push(pet.id);

          // 画像をR2に保存
          await this.saveImageToR2(pet);

        } catch (error) {
          result.errors.push(`Failed to process pet ${pet.id}: ${error}`);
          console.error(`Error processing pet ${pet.id}:`, error);
        }
      }
      
      // クロール状態を更新
      if (processedPetIds.length > 0 && isDifferentialMode) {
        await this.updateLastCrawlState(petType, processedPetIds);
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

  private async getLastCrawlState(petType: 'dog' | 'cat'): Promise<any> {
    try {
      const state = await this.env.DB
        .prepare('SELECT * FROM last_crawl_state WHERE pet_type = ?')
        .bind(petType)
        .first();
      return state;
    } catch (error) {
      console.error('Failed to get last crawl state:', error);
      return null;
    }
  }

  private async updateLastCrawlState(petType: 'dog' | 'cat', processedPetIds: string[]): Promise<void> {
    try {
      const maxPetId = processedPetIds.sort((a, b) => parseInt(b) - parseInt(a))[0];
      const now = new Date().toISOString();
      
      // UPSERT操作
      await this.env.DB
        .prepare(`
          INSERT INTO last_crawl_state (pet_type, last_max_pet_id, last_pet_ids, last_crawl_at, total_processed, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(pet_type) DO UPDATE SET
            last_max_pet_id = excluded.last_max_pet_id,
            last_pet_ids = excluded.last_pet_ids,
            last_crawl_at = excluded.last_crawl_at,
            total_processed = total_processed + excluded.total_processed,
            updated_at = excluded.updated_at
        `)
        .bind(
          petType,
          maxPetId,
          JSON.stringify(processedPetIds.slice(0, 100)), // 最近の100件を保存
          now,
          processedPetIds.length,
          now
        )
        .run();
    } catch (error) {
      console.error('Failed to update last crawl state:', error);
    }
  }

  private async recordProcessedPetId(petId: string, petType: 'dog' | 'cat'): Promise<void> {
    try {
      const now = new Date().toISOString();
      await this.env.DB
        .prepare(`
          INSERT INTO processed_pet_ids (pet_id, pet_type, first_seen_at, last_seen_at, is_active)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(pet_id) DO UPDATE SET
            last_seen_at = excluded.last_seen_at,
            is_active = TRUE
        `)
        .bind(petId, petType, now, now, true)
        .run();
    } catch (error) {
      console.error('Failed to record processed pet ID:', error);
    }
  }

  private async scrapePageData(baseUrl: string, petType: 'dog' | 'cat', limit: number, lastState: any = null): Promise<Pet[]> {
    const pets: Pet[] = [];
    const lastMaxPetId = lastState?.last_max_pet_id ? parseInt(lastState.last_max_pet_id) : 0;
    const existingPetIds = lastState?.last_pet_ids ? JSON.parse(lastState.last_pet_ids) : [];
    
    try {
      // ページ数を取得（必要な件数に応じて調整）
      const petsPerPage = 20; // 一般的に1ページあたり20件
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
        
        // 差分モード：新規ペットのみを追加
        if (lastState) {
          for (const pet of pagePets) {
            const petIdNum = parseInt(pet.id);
            
            // すでに処理済みのペットはスキップ
            if (petIdNum <= lastMaxPetId || existingPetIds.includes(pet.id)) {
              console.log(`Skipping already processed pet: ${pet.id}`);
              continue;
            }
            
            pets.push(pet);
            newPetsFound++;
            
            if (pets.length >= limit) break;
          }
        } else {
          // 通常モード：全てのペットを追加
          pets.push(...pagePets);
        }

        // 必要な件数に達した場合、または結果がない場合は終了
        if (pets.length >= limit || pagePets.length === 0) break;
        
        // 差分モードで新規ペットが見つからなくなったら終了
        if (lastState && newPetsFound === 0 && page > 1) {
          console.log('No new pets found, stopping crawl');
          break;
        }
      }

    } catch (error) {
      console.error('Scraping error:', error);
    }

    // 指定された件数に制限
    return pets.slice(0, limit);
  }

  private parseHTMLContent(html: string, petType: 'dog' | 'cat'): Pet[] {
    const pets: Pet[] = [];
    
    // 簡易的なHTMLパース（実際はより高度なパーサーを使用）
    const petIdMatches = html.match(/pn(\d+)/g) || [];
    const nameMatches = html.match(/<h3[^>]*>([^<]+)<\/h3>/g) || [];
    
    for (let i = 0; i < Math.min(petIdMatches.length, nameMatches.length); i++) {
      const id = petIdMatches[i].replace('pn', '');
      const name = nameMatches[i].replace(/<[^>]*>/g, '').trim();
      
      if (id && name) {
        pets.push({
          id,
          type: petType,
          name,
          breed: '雑種', // デフォルト値
          age: 2,
          gender: '不明',
          prefecture: '東京都',
          city: '新宿区',
          location: '東京都新宿区',
          description: `${name} - 素敵な${petType === 'dog' ? '犬' : '猫'}ちゃんです。新しい家族を待っています。`,
          personality: ['人懐っこい', '甘えん坊'],
          medicalInfo: 'ワクチン接種済み、健康チェック済み',
          careRequirements: ['完全室内飼い', '定期健診', '愛情たっぷり'],
          imageUrl: `/images/${petType}-${id}.jpg`,
          shelterName: '東京都動物保護センター',
          shelterContact: 'pethome@example.com',
          sourceUrl: `https://www.pet-home.jp/${petType}s/tokyo/pn${id}/`,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    return pets;
  }

  private async createPetData(pet: Pet): Promise<void> {
    await this.env.DB
      .prepare(`
        INSERT INTO pets (
          id, type, name, breed, age, gender, prefecture, city, location,
          description, personality, medical_info, care_requirements,
          image_url, shelter_name, shelter_contact, source_url, created_at,
          metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        pet.createdAt,
        JSON.stringify(pet)
      )
      .run();
  }

  private async updatePetData(pet: Pet): Promise<void> {
    await this.env.DB
      .prepare(`
        UPDATE pets SET
          name = ?, breed = ?, age = ?, gender = ?, prefecture = ?, city = ?,
          location = ?, description = ?, personality = ?, medical_info = ?,
          care_requirements = ?, image_url = ?, shelter_name = ?, shelter_contact = ?,
          source_url = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND type = ?
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
        JSON.stringify(pet),
        pet.id,
        pet.type
      )
      .run();
  }

  private async saveImageToR2(pet: Pet): Promise<void> {
    try {
      // 画像URLから画像をダウンロード（実際のURLが分かる場合）
      const imageUrl = `https://www.pet-home.jp/images/${pet.type}-${pet.id}.jpg`;
      
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PawMatch-Bot/1.0)',
        },
      });

      if (imageResponse.ok) {
        const imageBlob = await imageResponse.blob();
        const key = `${pet.type}s/${pet.type}-${pet.id}.jpg`;

        await this.env.IMAGES_BUCKET.put(key, imageBlob, {
          httpMetadata: {
            contentType: 'image/jpeg',
          },
          customMetadata: {
            petId: pet.id,
            petType: pet.type,
            uploadedAt: new Date().toISOString(),
          },
        });

        console.log(`Image saved to R2: ${key}`);
      } else {
        console.warn(`Failed to download image for pet ${pet.id}: ${imageResponse.status}`);
      }
    } catch (error) {
      console.error(`Failed to save image for pet ${pet.id}:`, error);
    }
  }
}