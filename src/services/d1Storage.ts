/**
 * Cloudflare D1データベース用のデータストレージ
 */

import { PetData } from './crawler';

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    changes: number;
    last_row_id: number;
    duration: number;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface StoredPetDataD1 extends PetData {
  lastUpdated: string;
  source: string;
  isActive: boolean;
}

/**
 * Cloudflare D1データベース用のストレージクラス
 */
export class D1DataStorage {
  constructor(private db: D1Database) {}

  /**
   * 犬のデータを保存
   */
  async saveDogs(dogs: PetData[], source: string): Promise<void> {
    const statements: D1PreparedStatement[] = [];
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // クローラーログの開始記録
      statements.push(
        this.db.prepare(`
          INSERT INTO crawler_logs (id, source, species, success, animals_count, started_at)
          VALUES (?, ?, 'dog', ?, ?, datetime('now'))
        `).bind(logId, source, true, dogs.length)
      );

      for (const dog of dogs) {
        // 動物基本データの挿入/更新
        statements.push(
          this.db.prepare(`
            INSERT OR REPLACE INTO animals (
              id, name, species, breed, age, gender, size, description,
              adoption_fee, prefecture, city, shelter_name, shelter_contact,
              source_url, is_active, last_crawled_at, updated_at
            ) VALUES (?, ?, 'dog', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(
            dog.id,
            dog.name,
            dog.breed,
            dog.age,
            dog.gender === '男の子' ? 'male' : 'female',
            dog.size === '小型' ? 'small' : dog.size === '中型' ? 'medium' : 'large',
            dog.description,
            dog.adoptionFee || 0,
            typeof dog.location === 'string' ? dog.location : dog.location?.prefecture || '',
            typeof dog.location === 'string' ? '' : dog.location?.city || '',
            dog.shelterName,
            dog.shelterContact,
            source,
            true
          )
        );

        // 画像データの挿入
        if (dog.imageUrl) {
          statements.push(
            this.db.prepare(`
              INSERT OR REPLACE INTO animal_images (
                id, animal_id, url, alt_text, is_primary
              ) VALUES (?, ?, ?, ?, true)
            `).bind(`${dog.id}_primary`, dog.id, dog.imageUrl, dog.name)
          );
        }

        // 性格データの挿入（既存削除後に再挿入）
        statements.push(
          this.db.prepare(`DELETE FROM animal_personalities WHERE animal_id = ?`).bind(dog.id)
        );

        for (const trait of dog.personality) {
          statements.push(
            this.db.prepare(`
              INSERT INTO animal_personalities (id, animal_id, trait)
              VALUES (?, ?, ?)
            `).bind(`${dog.id}_${trait}`, dog.id, trait)
          );
        }

        // 犬専用データの挿入/更新
        statements.push(
          this.db.prepare(`
            INSERT OR REPLACE INTO dog_info (
              animal_id, exercise_needs, walk_frequency, training_level,
              good_with_children, good_with_dogs, apartment_suitable, yard_required
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            dog.id,
            dog.exerciseLevel === '高' ? 'high' : dog.exerciseLevel === '中' ? 'moderate' : 'low',
            parseInt(dog.walkFrequency?.match(/\d+/)?.[0] || '2'),
            dog.trainingLevel === '基本済み' ? 'basic' : 'basic',
            dog.goodWithKids || false,
            dog.goodWithOtherDogs || false,
            dog.apartmentFriendly || false,
            dog.needsYard || false
          )
        );
      }

      // クローラーログの完了記録
      statements.push(
        this.db.prepare(`
          UPDATE crawler_logs 
          SET completed_at = datetime('now'),
              duration_seconds = (julianday('now') - julianday(started_at)) * 86400
          WHERE id = ?
        `).bind(logId)
      );

      // バッチ実行
      await this.db.batch(statements);
      console.log(`✅ 犬のデータ ${dogs.length} 件をD1に保存しました`);

    } catch (error) {
      // エラー時のログ更新
      await this.db.prepare(`
        UPDATE crawler_logs 
        SET success = false, error_message = ?, completed_at = datetime('now')
        WHERE id = ?
      `).bind(error instanceof Error ? error.message : 'Unknown error', logId).run();
      
      throw error;
    }
  }

  /**
   * 猫のデータを保存
   */
  async saveCats(cats: PetData[], source: string): Promise<void> {
    const statements: D1PreparedStatement[] = [];
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // クローラーログの開始記録
      statements.push(
        this.db.prepare(`
          INSERT INTO crawler_logs (id, source, species, success, animals_count, started_at)
          VALUES (?, ?, 'cat', ?, ?, datetime('now'))
        `).bind(logId, source, true, cats.length)
      );

      for (const cat of cats) {
        // 動物基本データの挿入/更新
        statements.push(
          this.db.prepare(`
            INSERT OR REPLACE INTO animals (
              id, name, species, breed, age, gender, size, description,
              adoption_fee, prefecture, city, shelter_name, shelter_contact,
              source_url, is_active, last_crawled_at, updated_at
            ) VALUES (?, ?, 'cat', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(
            cat.id,
            cat.name,
            cat.breed,
            cat.age,
            cat.gender === '男の子' ? 'male' : 'female',
            cat.size === '小型' ? 'small' : cat.size === '中型' ? 'medium' : 'large',
            cat.description,
            cat.adoptionFee || 0,
            typeof cat.location === 'string' ? cat.location : cat.location?.prefecture || '',
            typeof cat.location === 'string' ? '' : cat.location?.city || '',
            cat.shelterName,
            cat.shelterContact,
            source,
            true
          )
        );

        // 画像データの挿入
        if (cat.imageUrl) {
          statements.push(
            this.db.prepare(`
              INSERT OR REPLACE INTO animal_images (
                id, animal_id, url, alt_text, is_primary
              ) VALUES (?, ?, ?, ?, true)
            `).bind(`${cat.id}_primary`, cat.id, cat.imageUrl, cat.name)
          );
        }

        // 性格データの挿入（既存削除後に再挿入）
        statements.push(
          this.db.prepare(`DELETE FROM animal_personalities WHERE animal_id = ?`).bind(cat.id)
        );

        for (const trait of cat.personality) {
          statements.push(
            this.db.prepare(`
              INSERT INTO animal_personalities (id, animal_id, trait)
              VALUES (?, ?, ?)
            `).bind(`${cat.id}_${trait}`, cat.id, trait)
          );
        }

        // 猫専用データの挿入/更新
        statements.push(
          this.db.prepare(`
            INSERT OR REPLACE INTO cat_info (
              animal_id, social_level, indoor_outdoor, good_with_cats, vocalization
            ) VALUES (?, ?, ?, ?, ?)
          `).bind(
            cat.id,
            cat.socialLevel === '人懐っこい' ? 'friendly' : cat.socialLevel === '人見知り' ? 'shy' : 'moderate',
            cat.indoorOutdoor === '完全室内' ? 'indoor_only' : 'both',
            cat.goodWithMultipleCats || false,
            cat.vocalizationLevel === '静か' ? 'quiet' : cat.vocalizationLevel === 'よく鳴く' ? 'vocal' : 'moderate'
          )
        );
      }

      // クローラーログの完了記録
      statements.push(
        this.db.prepare(`
          UPDATE crawler_logs 
          SET completed_at = datetime('now'),
              duration_seconds = (julianday('now') - julianday(started_at)) * 86400
          WHERE id = ?
        `).bind(logId)
      );

      // バッチ実行
      await this.db.batch(statements);
      console.log(`✅ 猫のデータ ${cats.length} 件をD1に保存しました`);

    } catch (error) {
      // エラー時のログ更新
      await this.db.prepare(`
        UPDATE crawler_logs 
        SET success = false, error_message = ?, completed_at = datetime('now')
        WHERE id = ?
      `).bind(error instanceof Error ? error.message : 'Unknown error', logId).run();
      
      throw error;
    }
  }

  /**
   * 犬のデータを取得
   */
  async getDogs(): Promise<StoredPetDataD1[]> {
    try {
      const result = await this.db.prepare(`
        SELECT 
          a.*,
          GROUP_CONCAT(DISTINCT p.trait) as personality_traits,
          ai.url as imageUrl,
          d.exercise_needs,
          d.walk_frequency,
          d.training_level,
          d.good_with_children,
          d.good_with_dogs,
          d.apartment_suitable,
          d.yard_required
        FROM animals a
        LEFT JOIN animal_personalities p ON a.id = p.animal_id
        LEFT JOIN animal_images ai ON a.id = ai.animal_id AND ai.is_primary = true
        LEFT JOIN dog_info d ON a.id = d.animal_id
        WHERE a.species = 'dog' AND a.is_active = true
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `).all();

      return this.transformAnimalsFromDB(result.results || []);
    } catch (error) {
      console.error('犬のデータ取得エラー:', error);
      return [];
    }
  }

  /**
   * 猫のデータを取得
   */
  async getCats(): Promise<StoredPetDataD1[]> {
    try {
      const result = await this.db.prepare(`
        SELECT 
          a.*,
          GROUP_CONCAT(DISTINCT p.trait) as personality_traits,
          ai.url as imageUrl,
          c.social_level,
          c.indoor_outdoor,
          c.good_with_cats,
          c.vocalization
        FROM animals a
        LEFT JOIN animal_personalities p ON a.id = p.animal_id
        LEFT JOIN animal_images ai ON a.id = ai.animal_id AND ai.is_primary = true
        LEFT JOIN cat_info c ON a.id = c.animal_id
        WHERE a.species = 'cat' AND a.is_active = true
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `).all();

      return this.transformAnimalsFromDB(result.results || []);
    } catch (error) {
      console.error('猫のデータ取得エラー:', error);
      return [];
    }
  }

  /**
   * 全ての動物データを取得
   */
  async getAllAnimals(): Promise<StoredPetDataD1[]> {
    const [dogs, cats] = await Promise.all([
      this.getDogs(),
      this.getCats()
    ]);
    return [...dogs, ...cats];
  }

  /**
   * 特定のIDの動物を取得
   */
  async getAnimalById(id: string): Promise<StoredPetDataD1 | null> {
    try {
      const result = await this.db.prepare(`
        SELECT 
          a.*,
          GROUP_CONCAT(DISTINCT p.trait) as personality_traits,
          ai.url as imageUrl
        FROM animals a
        LEFT JOIN animal_personalities p ON a.id = p.animal_id
        LEFT JOIN animal_images ai ON a.id = ai.animal_id AND ai.is_primary = true
        WHERE a.id = ? AND a.is_active = true
        GROUP BY a.id
      `).bind(id).first();

      if (!result) return null;
      
      const transformed = this.transformAnimalsFromDB([result]);
      return transformed[0] || null;
    } catch (error) {
      console.error('個別動物取得エラー:', error);
      return null;
    }
  }

  /**
   * データベースの結果をアプリケーション形式に変換
   */
  private transformAnimalsFromDB(dbResults: Record<string, unknown>[]): StoredPetDataD1[] {
    return dbResults.map(row => ({
      id: row.id as string,
      name: row.name as string,
      species: row.species === 'dog' ? '犬' : '猫',
      breed: row.breed as string,
      age: row.age as number,
      gender: row.gender === 'male' ? '男の子' : '女の子',
      size: row.size === 'small' ? '小型' : row.size === 'medium' ? '中型' : '大型',
      imageUrl: (row.imageUrl as string) || '',
      description: (row.description as string) || '',
      personality: row.personality_traits ? (row.personality_traits as string).split(',') : [],
      location: {
        prefecture: (row.prefecture as string) || '',
        city: (row.city as string) || ''
      },
      shelterName: (row.shelter_name as string) || '',
      shelterContact: row.shelter_contact as string,
      adoptionFee: row.adoption_fee as number,
      createdAt: row.created_at as string,
      lastUpdated: row.updated_at as string,
      source: (row.source_url as string) || '',
      isActive: Boolean(row.is_active),
      // 犬特有の属性
      exerciseLevel: row.exercise_needs === 'high' ? '高' : row.exercise_needs === 'moderate' ? '中' : '低',
      walkFrequency: row.walk_frequency ? `1日${row.walk_frequency}回` : undefined,
      trainingLevel: row.training_level === 'basic' ? '基本済み' : undefined,
      goodWithKids: Boolean(row.good_with_children),
      goodWithOtherDogs: Boolean(row.good_with_dogs),
      apartmentFriendly: Boolean(row.apartment_suitable),
      needsYard: Boolean(row.yard_required),
      // 猫特有の属性
      socialLevel: row.social_level === 'friendly' ? '人懐っこい' : row.social_level === 'shy' ? '人見知り' : '普通',
      indoorOutdoor: row.indoor_outdoor === 'indoor_only' ? '完全室内' : '室内外',
      goodWithMultipleCats: Boolean(row.good_with_cats),
      vocalizationLevel: row.vocalization === 'quiet' ? '静か' : row.vocalization === 'vocal' ? 'よく鳴く' : '普通'
    }));
  }

  /**
   * データのメタデータを取得
   */
  async getMetadata(): Promise<any> {
    try {
      const result = await this.db.prepare(`
        SELECT 
          species,
          COUNT(*) as count,
          MAX(completed_at) as last_updated,
          source
        FROM crawler_logs 
        WHERE success = true
        GROUP BY species, source
        ORDER BY completed_at DESC
      `).all();

      const metadata: any = {};
      result.results?.forEach((row: any) => {
        metadata[row.species] = {
          count: row.count,
          source: row.source,
          lastUpdated: row.last_updated
        };
      });

      return metadata;
    } catch (error) {
      console.error('メタデータ取得エラー:', error);
      return {};
    }
  }

  /**
   * データをクリア
   */
  async clearAll(): Promise<void> {
    try {
      await this.db.batch([
        this.db.prepare('DELETE FROM dog_info'),
        this.db.prepare('DELETE FROM cat_info'),
        this.db.prepare('DELETE FROM animal_personalities'),
        this.db.prepare('DELETE FROM animal_images'),
        this.db.prepare('DELETE FROM animals'),
        this.db.prepare('DELETE FROM crawler_logs')
      ]);
      console.log('✅ D1データベースのデータをクリアしました');
    } catch (error) {
      console.error('データクリアエラー:', error);
      throw error;
    }
  }

  /**
   * 古いデータを削除
   */
  async cleanupOldData(daysOld: number = 7): Promise<void> {
    try {
      const result = await this.db.prepare(`
        DELETE FROM animals 
        WHERE last_crawled_at < datetime('now', '-' || ? || ' days')
      `).bind(daysOld).run();

      console.log(`🧹 ${result.meta.changes} 件の古いデータを削除しました`);
    } catch (error) {
      console.error('古いデータ削除エラー:', error);
      throw error;
    }
  }
}