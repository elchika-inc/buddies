import { Env, Pet, CrawlResult } from './types';

export class PetHomeCrawler {
  constructor(private env: Env) {}

  async crawlPets(petType: 'dog' | 'cat' = 'cat'): Promise<CrawlResult> {
    const result: CrawlResult = {
      success: false,
      totalPets: 0,
      newPets: 0,
      updatedPets: 0,
      errors: []
    };

    try {
      console.log(`Starting ${petType} crawling...`);
      
      // ペットホームのAPIエンドポイント（実際のエンドポイントに合わせて調整）
      const baseUrl = petType === 'dog' 
        ? `${this.env.PET_HOME_BASE_URL}/dogs/tokyo/`
        : `${this.env.PET_HOME_BASE_URL}/cats/tokyo/`;

      // HTMLページをクロール（実際の実装ではHTMLParserを使用）
      const pets = await this.scrapePageData(baseUrl, petType);
      
      result.totalPets = pets.length;

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

          // 画像をR2に保存
          await this.saveImageToR2(pet);

        } catch (error) {
          result.errors.push(`Failed to process pet ${pet.id}: ${error}`);
          console.error(`Error processing pet ${pet.id}:`, error);
        }
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

  private async scrapePageData(baseUrl: string, petType: 'dog' | 'cat'): Promise<Pet[]> {
    const pets: Pet[] = [];
    
    try {
      // ページ数を取得（最大5ページ）
      for (let page = 1; page <= 5; page++) {
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
        pets.push(...pagePets);

        // ページに結果がない場合は終了
        if (pagePets.length === 0) break;
      }

    } catch (error) {
      console.error('Scraping error:', error);
    }

    return pets;
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