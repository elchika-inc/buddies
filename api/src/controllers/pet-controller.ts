import { Context } from 'hono';
import { validatePetType, parseJsonField } from '../utils/validation';
import { handleError, NotFoundError } from '../utils/error-handler';
import { successResponse, paginationMeta } from '../utils/response-formatter';
import { RawPetRecord, isCountResult } from '../types/database';

/**
 * ペットコントローラー
 * 
 * @class PetController
 * @description ペット情報のCRUD操作を提供するコントローラー
 */
export class PetController {
  constructor(private db: D1Database) {}

  /**
   * ペット一覧を取得（簡素化版）
   * 
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ペット一覧のレスポンス
   */
  async getPets(c: Context) {
    try {
      const petType = validatePetType(c.req.param('type'));
      const page = parseInt(c.req.query('page') || '1');
      const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
      const offset = (page - 1) * limit;
      const prefecture = c.req.query('prefecture');

      const result = await this.fetchPetsSimple(petType ?? null, limit, offset, prefecture);
      
      return c.json(successResponse(
        result.data,
        paginationMeta(page, limit, result.total)
      ));

    } catch (error) {
      return handleError(c, error);
    }
  }

  /**
   * IDでペットを取得
   * 
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ペット詳細情報
   * @param {string} id - ペットID
   * @throws {404} ペットが見つからない場合
   */
  async getPetById(c: Context) {
    try {
      const petType = validatePetType(c.req.param('type'));
      const petId = c.req.param('id');

      if (!petType) {
        throw new NotFoundError('Pet type is required');
      }

      // データベースから取得を試みる
      const pet = await this.db
        .prepare('SELECT * FROM pets WHERE type = ? AND id = ?')
        .bind(petType, petId)
        .first();

      if (pet) {
        return c.json(successResponse(this.formatPet(pet as RawPetRecord)));
      }

      // ペットが見つからない場合
      throw new NotFoundError(`Pet not found: ${petId}`);

    } catch (error) {
      return handleError(c, error);
    }
  }

  /**
   * ランダムなペットを取得
   * 
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ランダムに選ばれたペット一覧
   * @description スワイプ機能用にランダムなペットを返す
   */
  async getRandomPets(c: Context) {
    try {
      const petType = validatePetType(c.req.param('type'));
      const count = Math.min(parseInt(c.req.query('count') || '5'), 20);

      if (!petType) {
        throw new NotFoundError('Pet type is required');
      }

      // データベースから取得を試みる
      const dbPets = await this.db
        .prepare('SELECT * FROM pets WHERE type = ? ORDER BY RANDOM() LIMIT ?')
        .bind(petType, count)
        .all();

      if (dbPets.results && dbPets.results.length > 0) {
        return c.json(successResponse({
          pets: dbPets.results.map(pet => this.formatPet(pet as RawPetRecord)),
          type: petType,
          count: dbPets.results.length
        }));
      }

      // データベースが利用できない場合はエラーを返す
      throw new Error('Database not available');

    } catch (error) {
      return handleError(c, error);
    }
  }

  /**
   * ペットデータ取得（簡素化版）
   * 
   * @description 単一のクエリでペットタイプに関わらずデータを取得
   */
  private async fetchPetsSimple(
    type: string | null, 
    limit: number, 
    offset: number, 
    prefecture?: string
  ): Promise<{ data: any; total: number }> {
    // WHERE条件を動的に構築
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }
    
    if (prefecture) {
      conditions.push('prefecture = ?');
      params.push(prefecture);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // ペットデータとカウントを同時取得
    const [petsResult, countResult] = await Promise.all([
      this.db.prepare(
        `SELECT * FROM pets ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all(),
      
      this.db.prepare(
        `SELECT COUNT(*) as total FROM pets ${whereClause}`
      ).bind(...params).first()
    ]);

    if (!petsResult.results) {
      throw new Error('Database query failed');
    }

    const total = isCountResult(countResult) ? countResult.total : 0;
    const pets = petsResult.results
      .map(pet => this.formatPet(pet as RawPetRecord));

    // タイプが指定されていない場合は犬猫を分離して返す
    if (!type) {
      const dogs = pets.filter(p => p.type === 'dog');
      const cats = pets.filter(p => p.type === 'cat');
      return {
        data: { dogs, cats },
        total
      };
    }

    return {
      data: { pets, type },
      total
    };
  }

  private formatPet(pet: RawPetRecord) {
    return {
      ...pet,
      personality: parseJsonField(pet.personality ?? null, ['friendly']),
      care_requirements: parseJsonField(pet.care_requirements ?? null, ['indoor']),
      good_with: parseJsonField(pet.good_with ?? null, []),
      health_notes: parseJsonField(pet.health_notes ?? null, [])
    };
  }
}