import { Context } from 'hono';
import { validatePetType } from '../utils/validation';
import { NotFoundError, ServiceUnavailableError } from '../utils/error-handler';
import { successResponse, paginationMeta } from '../utils/response-formatter';
import { transformPetRecord, ApiPetRecord } from '../utils/data-transformer';
import { CONFIG } from '../utils/constants';
import { isRawPetRecord, isCountResult, ensureArray } from '../utils/type-guards';

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
      const page = parseInt(c.req.query('page') || String(CONFIG.LIMITS.DEFAULT_PAGE));
      const limit = Math.min(
        parseInt(c.req.query('limit') || String(CONFIG.LIMITS.DEFAULT_PETS_PER_REQUEST)), 
        CONFIG.LIMITS.MAX_PETS_PER_REQUEST
      );
      const offset = (page - 1) * limit;
      const prefecture = c.req.query('prefecture');

      const result = await this.fetchPetsSimple(petType ?? null, limit, offset, prefecture);
      
      return c.json(successResponse(
        result.data,
        paginationMeta(page, limit, result.total)
      ));

    } catch (error) {
      throw error; // エラーはグローバルミドルウェアで処理
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

      if (!pet) {
        throw new NotFoundError(`Pet not found: ${petId}`);
      }

      // 型ガードでデータの正当性を確認
      if (!isRawPetRecord(pet)) {
        throw new ServiceUnavailableError('Invalid pet data format');
      }

      return c.json(successResponse(transformPetRecord(pet)));

    } catch (error) {
      throw error; // エラーはグローバルミドルウェアで処理
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
      const count = Math.min(
        parseInt(c.req.query('count') || String(CONFIG.LIMITS.DEFAULT_RANDOM_PETS)), 
        CONFIG.LIMITS.MAX_RANDOM_PETS
      );

      if (!petType) {
        throw new NotFoundError('Pet type is required');
      }

      // データベースから取得を試みる
      const dbPets = await this.db
        .prepare('SELECT * FROM pets WHERE type = ? ORDER BY RANDOM() LIMIT ?')
        .bind(petType, count)
        .all();

      if (!dbPets.results || dbPets.results.length === 0) {
        throw new ServiceUnavailableError('No pets available');
      }

      // 型ガードで有効なペットデータのみフィルタリング
      const validPets = ensureArray(dbPets.results, isRawPetRecord);
      
      if (validPets.length === 0) {
        throw new ServiceUnavailableError('Invalid pet data format');
      }

      return c.json(successResponse({
        pets: validPets.map((pet: Record<string, unknown>) => transformPetRecord(pet)),
        type: petType,
        count: validPets.length
      }));

    } catch (error) {
      throw error; // エラーはグローバルミドルウェアで処理
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
  ): Promise<{ data: ApiPetRecord[]; total: number }> {
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

    const total = isCountResult(countResult) ? (countResult['total'] as number || countResult['count'] as number) : 0;
    
    // 型ガードで有効なペットデータのみ取得
    const validPets = ensureArray(petsResult.results).filter(isRawPetRecord);
    const pets = validPets.map((pet: Record<string, unknown>) => transformPetRecord(pet));

    // タイプが指定されていない場合は犬猫を分離して返す
    if (!type) {
      const dogs = pets.filter((p: ApiPetRecord) => p.type === 'dog');
      const cats = pets.filter((p: ApiPetRecord) => p.type === 'cat');
      return {
        data: { dogs, cats } as any,
        total
      };
    }

    return {
      data: { pets, type } as any,
      total
    };
  }

}