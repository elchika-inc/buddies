/**
 * ペットデータベース操作専門クラス
 */

import type { D1Database } from '@cloudflare/workers-types'
import { PetRecord } from '../../../shared/types/pet'

export interface QueryResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginationOptions {
  limit: number
  offset: number
  orderBy?: string
  orderDirection?: 'ASC' | 'DESC'
}

export class PetRepository {
  constructor(private db: D1Database) {}

  /**
   * ペットの存在確認
   */
  async checkExisting(id: string): Promise<boolean> {
    try {
      const result = await this.db.prepare('SELECT id FROM pets WHERE id = ?').bind(id).first()

      return result !== null
    } catch (error) {
      console.error('Check existing error:', error)
      return false
    }
  }

  /**
   * ペットの作成
   */
  async create(pet: PetRecord): Promise<QueryResult<void>> {
    try {
      const fields = Object.keys(pet).filter((key) => pet[key as keyof PetRecord] !== undefined)
      const values = fields.map((key) => pet[key as keyof PetRecord])
      const placeholders = fields.map(() => '?').join(', ')

      const query = `
        INSERT INTO pets (${fields.join(', ')})
        VALUES (${placeholders})
      `

      await this.db
        .prepare(query)
        .bind(...values)
        .run()

      return { success: true }
    } catch (error) {
      console.error('Create pet error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * ペットの更新
   */
  async update(pet: PetRecord): Promise<QueryResult<void>> {
    try {
      const fields = Object.keys(pet).filter(
        (key) => key !== 'id' && pet[key as keyof PetRecord] !== undefined
      )
      const setClause = fields.map((field) => `${field} = ?`).join(', ')
      const values = fields.map((key) => pet[key as keyof PetRecord])
      values.push(pet.id) // WHERE句用

      const query = `
        UPDATE pets
        SET ${setClause}, updated_at = datetime('now')
        WHERE id = ?
      `

      await this.db
        .prepare(query)
        .bind(...values)
        .run()

      return { success: true }
    } catch (error) {
      console.error('Update pet error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * ペットの削除
   */
  async delete(id: string): Promise<QueryResult<void>> {
    try {
      await this.db.prepare('DELETE FROM pets WHERE id = ?').bind(id).run()

      return { success: true }
    } catch (error) {
      console.error('Delete pet error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * ペットの取得（ID指定）
   */
  async findById(id: string): Promise<QueryResult<PetRecord>> {
    try {
      const result = await this.db
        .prepare('SELECT * FROM pets WHERE id = ?')
        .bind(id)
        .first<PetRecord>()

      if (!result) {
        return {
          success: false,
          error: 'Pet not found',
        }
      }

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error('Find by ID error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * ペット一覧の取得
   */
  async findAll(options?: PaginationOptions): Promise<QueryResult<PetRecord[]>> {
    try {
      const limit = options?.limit || 100
      const offset = options?.offset || 0
      const orderBy = options?.orderBy || 'created_at'
      const orderDirection = options?.orderDirection || 'DESC'

      const query = `
        SELECT * FROM pets
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT ? OFFSET ?
      `

      const result = await this.db.prepare(query).bind(limit, offset).all<PetRecord>()

      return {
        success: true,
        data: result.results || [],
      }
    } catch (error) {
      console.error('Find all error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 条件検索
   */
  async findByCondition(
    condition: Partial<PetRecord>,
    options?: PaginationOptions
  ): Promise<QueryResult<PetRecord[]>> {
    try {
      const whereConditions: string[] = []
      const values: unknown[] = []

      Object.entries(condition).forEach(([key, value]) => {
        if (value !== undefined) {
          whereConditions.push(`${key} = ?`)
          values.push(value)
        }
      })

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

      const limit = options?.limit || 100
      const offset = options?.offset || 0
      const orderBy = options?.orderBy || 'created_at'
      const orderDirection = options?.orderDirection || 'DESC'

      values.push(limit, offset)

      const query = `
        SELECT * FROM pets
        ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT ? OFFSET ?
      `

      const result = await this.db
        .prepare(query)
        .bind(...values)
        .all<PetRecord>()

      return {
        success: true,
        data: result.results || [],
      }
    } catch (error) {
      console.error('Find by condition error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * バッチ作成
   */
  async createBatch(pets: PetRecord[]): Promise<QueryResult<number>> {
    try {
      let successCount = 0

      // トランザクション風の処理
      for (const pet of pets) {
        const result = await this.create(pet)
        if (result.success) {
          successCount++
        }
      }

      return {
        success: true,
        data: successCount,
      }
    } catch (error) {
      console.error('Create batch error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 統計情報の取得
   */
  async getStatistics(): Promise<
    QueryResult<{
      total: number
      dogs: number
      cats: number
      available: number
    }>
  > {
    try {
      const stats = await this.db
        .prepare(
          `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN type = 'dog' THEN 1 ELSE 0 END) as dogs,
          SUM(CASE WHEN type = 'cat' THEN 1 ELSE 0 END) as cats,
          SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) as available
        FROM pets
      `
        )
        .first<{
          total: number
          dogs: number
          cats: number
          available: number
        }>()

      return {
        success: true,
        data: stats || { total: 0, dogs: 0, cats: 0, available: 0 },
      }
    } catch (error) {
      console.error('Get statistics error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
