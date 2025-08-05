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

  /**
   * スワイプ結果を記録
   */
  async recordSwipe(data: {
    userId?: string;
    sessionId?: string;
    animalId: string;
    action: 'like' | 'pass' | 'superlike';
    swipeDurationMs?: number;
    viewDurationMs?: number;
    deviceInfo?: string;
  }): Promise<{ id: string; success: boolean }> {
    const swipeId = `swipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🔄 [D1Storage] スワイプ記録開始:', {
      swipeId,
      userId: data.userId,
      sessionId: data.sessionId ? data.sessionId.substring(0, 20) + '...' : undefined,
      animalId: data.animalId,
      action: data.action,
      timestamp: new Date().toISOString()
    });

    try {
      // ユーザーIDまたはセッションIDが必要
      if (!data.userId && !data.sessionId) {
        const errorMsg = 'userId または sessionId が必要です';
        console.error('❌ [D1Storage] バリデーションエラー:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('🔄 [D1Storage] swipe_historyテーブルに挿入開始');
      const query = `
        INSERT INTO swipe_history (
          id, user_id, session_id, animal_id, action, 
          swipe_duration_ms, view_duration_ms, device_info, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      
      const bindValues = [
        swipeId,
        data.userId || null,
        data.sessionId || null,
        data.animalId,
        data.action,
        data.swipeDurationMs || null,
        data.viewDurationMs || null,
        data.deviceInfo || null
      ];

      console.log('🔄 [D1Storage] クエリ実行:', { query, bindValues });
      
      const result = await this.db.prepare(query).bind(...bindValues).run();

      console.log('✅ [D1Storage] swipe_history挿入完了:', {
        success: result.success,
        changes: result.meta.changes,
        lastRowId: result.meta.last_row_id,
        duration: result.meta.duration
      });

      // 動物のlike_countを更新（likeまたはsuperlikeの場合）
      if (data.action === 'like' || data.action === 'superlike') {
        console.log('🔄 [D1Storage] like_count更新開始');
        
        const updateResult = await this.db.prepare(`
          UPDATE animals 
          SET like_count = like_count + 1, updated_at = datetime('now')
          WHERE id = ?
        `).bind(data.animalId).run();

        console.log('✅ [D1Storage] like_count更新完了:', {
          success: updateResult.success,
          changes: updateResult.meta.changes,
          animalId: data.animalId
        });
      }

      console.log('✅ [D1Storage] スワイプ記録完了:', {
        swipeId,
        action: data.action,
        animalId: data.animalId,
        success: result.success
      });
      
      return {
        id: swipeId,
        success: result.success
      };
    } catch (error) {
      console.error('❌ [D1Storage] スワイプ記録エラー:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        swipeId,
        data,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * ユーザーの作成または取得
   */
  async getOrCreateUser(sessionId: string): Promise<{ id: string; isNew: boolean }> {
    console.log('🔄 [D1Storage] ユーザー取得/作成開始:', {
      sessionId: sessionId.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    });

    try {
      console.log('🔄 [D1Storage] 既存ユーザー検索開始');
      
      // 既存ユーザーをセッションIDで検索
      let user = await this.db.prepare(`
        SELECT id FROM users WHERE session_id = ?
      `).bind(sessionId).first<{ id: string }>();

      if (user) {
        console.log('✅ [D1Storage] 既存ユーザー発見:', { userId: user.id });
        
        // 最終アクティブ時刻を更新
        console.log('🔄 [D1Storage] 最終アクティブ時刻更新開始');
        const updateResult = await this.db.prepare(`
          UPDATE users SET last_active_at = datetime('now') WHERE id = ?
        `).bind(user.id).run();

        console.log('✅ [D1Storage] 最終アクティブ時刻更新完了:', {
          success: updateResult.success,
          changes: updateResult.meta.changes
        });
        
        return { id: user.id, isNew: false };
      }

      // 新規ユーザー作成
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🔄 [D1Storage] 新規ユーザー作成開始:', { userId });

      const insertResult = await this.db.prepare(`
        INSERT INTO users (id, session_id, created_at, last_active_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `).bind(userId, sessionId).run();

      console.log('✅ [D1Storage] 新規ユーザー作成完了:', {
        userId,
        success: insertResult.success,
        changes: insertResult.meta.changes,
        lastRowId: insertResult.meta.last_row_id
      });

      return { id: userId, isNew: true };
    } catch (error) {
      console.error('❌ [D1Storage] ユーザー作成/取得エラー:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sessionId: sessionId.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * ユーザーのスワイプ履歴を取得
   */
  async getUserSwipeHistory(userId?: string, sessionId?: string, limit: number = 50): Promise<any[]> {
    try {
      if (!userId && !sessionId) {
        throw new Error('userId または sessionId が必要です');
      }

      const query = userId 
        ? `SELECT sh.*, a.name as animal_name, a.species 
           FROM swipe_history sh 
           LEFT JOIN animals a ON sh.animal_id = a.id 
           WHERE sh.user_id = ? 
           ORDER BY sh.timestamp DESC 
           LIMIT ?`
        : `SELECT sh.*, a.name as animal_name, a.species 
           FROM swipe_history sh 
           LEFT JOIN animals a ON sh.animal_id = a.id 
           WHERE sh.session_id = ? 
           ORDER BY sh.timestamp DESC 
           LIMIT ?`;

      const result = await this.db.prepare(query)
        .bind(userId || sessionId, limit)
        .all();

      return result.results || [];
    } catch (error) {
      console.error('スワイプ履歴取得エラー:', error);
      return [];
    }
  }

  /**
   * マッチングを作成（likeまたはsuperlikeした動物）
   */
  async createMatch(userId: string, animalId: string): Promise<{ id: string; success: boolean }> {
    try {
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await this.db.prepare(`
        INSERT OR IGNORE INTO matches (id, user_id, animal_id, matched_at, status)
        VALUES (?, ?, ?, datetime('now'), 'active')
      `).bind(matchId, userId, animalId).run();

      return {
        id: matchId,
        success: result.success && result.meta.changes > 0
      };
    } catch (error) {
      console.error('マッチング作成エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザーのマッチング一覧を取得
   */
  async getUserMatches(userId: string): Promise<any[]> {
    try {
      const result = await this.db.prepare(`
        SELECT 
          m.*,
          a.name, a.species, a.breed, a.age, a.gender,
          ai.url as imageUrl
        FROM matches m
        LEFT JOIN animals a ON m.animal_id = a.id
        LEFT JOIN animal_images ai ON a.id = ai.animal_id AND ai.is_primary = true
        WHERE m.user_id = ? AND m.status = 'active'
        ORDER BY m.matched_at DESC
      `).bind(userId).all();

      return result.results || [];
    } catch (error) {
      console.error('マッチング取得エラー:', error);
      return [];
    }
  }

  /**
   * スワイプ統計を取得
   */
  async getSwipeStats(userId?: string, sessionId?: string): Promise<{
    totalSwipes: number;
    likes: number;
    passes: number;
    superLikes: number;
    matches: number;
  }> {
    try {
      if (!userId && !sessionId) {
        throw new Error('userId または sessionId が必要です');
      }

      const whereClause = userId ? 'user_id = ?' : 'session_id = ?';
      const bindValue = userId || sessionId;

      // スワイプ統計
      const swipeStats = await this.db.prepare(`
        SELECT 
          action,
          COUNT(*) as count
        FROM swipe_history 
        WHERE ${whereClause}
        GROUP BY action
      `).bind(bindValue).all();

      const stats = {
        totalSwipes: 0,
        likes: 0,
        passes: 0,
        superLikes: 0,
        matches: 0
      };

      swipeStats.results?.forEach((row: any) => {
        stats.totalSwipes += row.count;
        if (row.action === 'like') stats.likes = row.count;
        else if (row.action === 'pass') stats.passes = row.count;
        else if (row.action === 'superlike') stats.superLikes = row.count;
      });

      // マッチング数（ユーザーIDがある場合のみ）
      if (userId) {
        const matchResult = await this.db.prepare(`
          SELECT COUNT(*) as count FROM matches WHERE user_id = ? AND status = 'active'
        `).bind(userId).first<{ count: number }>();
        
        stats.matches = matchResult?.count || 0;
      }

      return stats;
    } catch (error) {
      console.error('スワイプ統計取得エラー:', error);
      return {
        totalSwipes: 0,
        likes: 0,
        passes: 0,
        superLikes: 0,
        matches: 0
      };
    }
  }
}