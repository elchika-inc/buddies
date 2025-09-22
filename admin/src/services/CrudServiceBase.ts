import { drizzle } from 'drizzle-orm/d1'
import { eq, sql } from 'drizzle-orm'
import type { Table } from 'drizzle-orm'

/**
 * CRUD操作の基底クラス
 * 共通のCRUD操作を提供し、個別のサービスで拡張可能
 */
export abstract class CrudServiceBase<T extends Record<string, any>> {
  protected db

  constructor(
    protected d1Database: D1Database,
    protected table: Table,
    protected tableName: string
  ) {
    this.db = drizzle(this.d1Database)
  }

  /**
   * IDカラム名を取得（サブクラスでオーバーライド可能）
   */
  protected getIdColumn(): string {
    return 'id'
  }

  /**
   * エンティティの変換（サブクラスでオーバーライド可能）
   */
  protected abstract transformEntity(raw: any): T

  /**
   * IDでエンティティを取得
   */
  async findById(id: string): Promise<T | null> {
    const idColumn = this.getIdColumn()
    const results = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any)[idColumn], id))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.transformEntity(results[0])
  }

  /**
   * 全エンティティを取得
   */
  async findAll(): Promise<T[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .orderBy(sql`createdAt DESC`)

    return results.map(row => this.transformEntity(row))
  }

  /**
   * エンティティの作成
   */
  async create(data: Partial<T>): Promise<void> {
    const now = new Date().toISOString()
    const insertData = {
      ...data,
      createdAt: now,
      updatedAt: now,
    }

    await this.db.insert(this.table).values(insertData)
  }

  /**
   * エンティティの更新
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    const idColumn = this.getIdColumn()
    const updateData = {
      ...data,
      updatedAt: sql`datetime('now')`,
    }

    await this.db
      .update(this.table)
      .set(updateData)
      .where(eq((this.table as any)[idColumn], id))
  }

  /**
   * エンティティの削除
   */
  async delete(id: string): Promise<void> {
    const idColumn = this.getIdColumn()
    await this.db
      .delete(this.table)
      .where(eq((this.table as any)[idColumn], id))
  }

  /**
   * エンティティの存在確認
   */
  async exists(id: string): Promise<boolean> {
    const entity = await this.findById(id)
    return entity !== null
  }

  /**
   * エンティティ数のカウント
   */
  async count(): Promise<number> {
    const results = await this.db
      .select({ count: sql`COUNT(*)` })
      .from(this.table)

    return Number(results[0]?.count || 0)
  }

  /**
   * ページネーション付き取得
   */
  async findPaginated(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const offset = (page - 1) * limit
    const total = await this.count()

    const results = await this.db
      .select()
      .from(this.table)
      .orderBy(sql`createdAt DESC`)
      .limit(limit)
      .offset(offset)

    return {
      data: results.map(row => this.transformEntity(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * バッチ作成
   */
  async createMany(items: Partial<T>[]): Promise<void> {
    if (items.length === 0) return

    const now = new Date().toISOString()
    const insertData = items.map(item => ({
      ...item,
      createdAt: now,
      updatedAt: now,
    }))

    await this.db.insert(this.table).values(insertData)
  }

  /**
   * 条件付き削除
   */
  async deleteWhere(condition: any): Promise<void> {
    await this.db.delete(this.table).where(condition)
  }

  /**
   * 条件付き更新
   */
  async updateWhere(condition: any, data: Partial<T>): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: sql`datetime('now')`,
    }

    await this.db.update(this.table).set(updateData).where(condition)
  }
}