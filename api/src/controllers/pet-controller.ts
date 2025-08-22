import { Context } from 'hono';
import { validatePetType, parseJsonField } from '../utils/validation';
import { handleError, NotFoundError } from '../utils/error-handler';
import { successResponse, paginationMeta } from '../utils/response-formatter';

/**
 * ペットコントローラー
 * 
 * @class PetController
 * @description ペット情報のCRUD操作を提供するコントローラー
 */
export class PetController {
  constructor(private db: D1Database) {}

  /**
   * ペット一覧を取得
   * 
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ペット一覧のレスポンス
   * @query {string} type - ペットタイプ（dog/cat）
   * @query {string} prefecture - 都道府県でフィルタリング
   * @query {number} limit - 取得件数（デフォルト: 20）
   * @query {number} offset - オフセット
   */
  async getPets(c: Context) {
    try {
      const petType = validatePetType(c.req.param('type'));
      const page = parseInt(c.req.query('page') || '1');
      const limit = parseInt(c.req.query('limit') || '20');
      const offset = (page - 1) * limit;
      const prefecture = c.req.query('prefecture');

      // ペットタイプが指定されていない場合は猫と犬の両方を返す
      if (!petType) {
        const [dogsResult, catsResult] = await Promise.all([
          this.fetchPets('dog', limit, offset, prefecture),
          this.fetchPets('cat', limit, offset, prefecture)
        ]);

        return c.json(successResponse(
          {
            dogs: dogsResult.pets,
            cats: catsResult.pets
          },
          {
            page,
            limit,
            total: dogsResult.total + catsResult.total
          }
        ));
      }

      // 特定のペットタイプを返す
      const result = await this.fetchPets(petType, limit, offset, prefecture);
      
      return c.json(successResponse(
        {
          pets: result.pets,
          type: petType
        },
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
        return c.json(successResponse(this.formatPet(pet)));
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
          pets: dbPets.results.map(pet => this.formatPet(pet)),
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

  private async fetchPets(type: string, limit: number, offset: number, prefecture?: string) {
    // まずデータベースから取得を試みる
    let query = 'SELECT * FROM pets WHERE type = ?';
    const params: (string | number)[] = [type];

    if (prefecture) {
      query += ' AND prefecture = ?';
      params.push(prefecture);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const countQuery = prefecture
      ? 'SELECT COUNT(*) as total FROM pets WHERE type = ? AND prefecture = ?'
      : 'SELECT COUNT(*) as total FROM pets WHERE type = ?';
    const countParams = prefecture ? [type, prefecture] : [type];

    const [petsResult, countResult] = await Promise.all([
      this.db.prepare(query).bind(...params).all(),
      this.db.prepare(countQuery).bind(...countParams).first()
    ]);

    if (petsResult.results && petsResult.results.length > 0) {
      return {
        pets: petsResult.results.map(pet => this.formatPet(pet)),
        total: (countResult as { total: number })?.total || 0
      };
    }

    // データベースが利用できない場合はエラーを返す
    throw new Error('Database not available');
  }

  private formatPet(pet: Record<string, unknown>) {
    return {
      ...pet,
      personality: parseJsonField(pet['personality'] as string | null, ['friendly']),
      care_requirements: parseJsonField(pet['care_requirements'] as string | null, ['indoor']),
      good_with: parseJsonField(pet['good_with'] as string | null, []),
      health_notes: parseJsonField(pet['health_notes'] as string | null, [])
    };
  }
}