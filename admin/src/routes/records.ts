import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, count, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Env } from '../types/env'
import { getTable } from '../db/tableRegistry'
import { getFieldRequirements } from '../db/schema/validation'
import type { DbRecord } from '@pawmatch/shared/types'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'

export const recordsRoute = new Hono<{ Bindings: Env }>()

// テーブル設定の取得ヘルパー
function getTableAndSchema(tableName: string) {
  const config = getTable(tableName)
  if (!config) return null
  return {
    table: config.table,
    schema: config.schema,
    idColumn: 'id' // デフォルトでidを使用
  }
}

// スキーマ情報を取得
recordsRoute.get('/:tableName/schema', async (c) => {
  try {
    const { tableName } = c.req.param()
    const config = getTable(tableName)

    if (!config) {
      return c.json({
        success: false,
        error: 'Invalid table name'
      }, 400)
    }

    const { schema } = config

    const requirements = getFieldRequirements(schema)

    return c.json({
      success: true,
      data: {
        fields: requirements
      }
    })
  } catch (error) {
    console.error('Error fetching schema:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch schema',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// レコード一覧を取得（ページネーション付き）
recordsRoute.get('/:tableName', async (c) => {
  try {
    const { tableName } = c.req.param()
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = (page - 1) * limit
    const sortBy = c.req.query('sortBy') || ''
    const sortOrder = c.req.query('sortOrder') || 'asc'

    const db = drizzle(c.env.DB)
    const config = getTableAndSchema(tableName)

    if (!config) {
      return c.json({
        success: false,
        error: 'Invalid table name'
      }, 400)
    }

    const { table } = config

    // レコードを取得（ソート付き）
    let recordsResult: DbRecord[]

    if (sortBy && sortBy !== '') {
      // SQLインジェクション対策: カラム名のバリデーション
      const firstRecord = await db.select().from(table).limit(1).all()
      if (firstRecord.length > 0 && firstRecord[0]) {
        const validColumns = Object.keys(firstRecord[0])
        if (validColumns.includes(sortBy)) {
          // 安全なカラム名を使ってソート付きクエリを実行
          const orderDirection = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
          recordsResult = await db.select().from(table)
            .orderBy(sql.raw(`${sortBy} ${orderDirection}`))
            .limit(limit)
            .offset(offset)
            .all()
        } else {
          // 無効なカラム名の場合はソートなしで取得
          recordsResult = await db.select().from(table).limit(limit).offset(offset).all()
        }
      } else {
        recordsResult = await db.select().from(table).limit(limit).offset(offset).all()
      }
    } else {
      recordsResult = await db.select().from(table).limit(limit).offset(offset).all()
    }

    // 総レコード数を取得
    const [countResult] = await db.select({ count: count() }).from(table)
    const totalCount = countResult?.count || 0
    const totalPages = Math.ceil(totalCount / limit)

    return c.json({
      success: true,
      data: {
        records: recordsResult,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    })
  } catch (error) {
    console.error('Error fetching records:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch records',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// 単一レコードを取得
recordsRoute.get('/:tableName/:id', async (c) => {
  try {
    const { tableName, id } = c.req.param()
    const db = drizzle(c.env.DB)
    const config = getTableAndSchema(tableName)

    if (!config) {
      return c.json({
        success: false,
        error: 'Invalid table name'
      }, 400)
    }

    const { table, idColumn } = config

    if (!idColumn) {
      return c.json({
        success: false,
        error: 'Invalid table configuration'
      }, 500)
    }

    // SQLiteTableの型からidカラムを安全に取得
    const tableWithId = table as SQLiteTable & { id: typeof table['_']['columns']['id'] }
    const [record] = await db.select().from(table).where(eq(tableWithId.id, id))

    if (!record) {
      return c.json({
        success: false,
        error: 'Record not found'
      }, 404)
    }

    return c.json({
      success: true,
      data: record
    })
  } catch (error) {
    console.error('Error fetching record:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch record',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// レコードを作成
recordsRoute.post('/:tableName', async (c) => {
  try {
    const { tableName } = c.req.param()
    const body = await c.req.json()
    const db = drizzle(c.env.DB)
    const config = getTableAndSchema(tableName)

    if (!config) {
      return c.json({
        success: false,
        error: 'Invalid table name'
      }, 400)
    }

    const { table, schema } = config

    // バリデーション
    try {
      schema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          error: '入力エラー',
          details: error.errors
        }, 400)
      }
      throw error
    }

    const result = await db.insert(table).values(body).returning()
    const [firstResult] = Array.isArray(result) ? result : [result]

    return c.json({
      success: true,
      data: firstResult
    })
  } catch (error) {
    console.error('Error creating record:', error)
    return c.json({
      success: false,
      error: 'Failed to create record',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// レコードを更新
recordsRoute.put('/:tableName/:id', async (c) => {
  try {
    const { tableName, id } = c.req.param()
    const body = await c.req.json()
    const db = drizzle(c.env.DB)
    const config = getTableAndSchema(tableName)

    if (!config) {
      return c.json({
        success: false,
        error: 'Invalid table name'
      }, 400)
    }

    const { table, schema, idColumn } = config

    // IDを除外
    delete body.id

    // バリデーション (部分更新なのでpartialを使用)
    try {
      const partialSchema = schema instanceof z.ZodObject ? schema.partial() : schema
      partialSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          error: '入力エラー',
          details: error.errors
        }, 400)
      }
      throw error
    }

    if (!idColumn) {
      return c.json({
        success: false,
        error: 'Invalid table configuration'
      }, 500)
    }

    const tableWithId = table as SQLiteTable & { id: typeof table['_']['columns']['id'] }
    const updateResult = await db.update(table)
      .set(body)
      .where(eq(tableWithId.id, id))
      .returning()

    const [result] = Array.isArray(updateResult) ? updateResult : [updateResult]

    return c.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error updating record:', error)
    return c.json({
      success: false,
      error: 'Failed to update record',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// レコードを削除
recordsRoute.delete('/:tableName/:id', async (c) => {
  try {
    const { tableName, id } = c.req.param()
    const db = drizzle(c.env.DB)
    const config = getTableAndSchema(tableName)

    if (!config) {
      return c.json({
        success: false,
        error: 'Invalid table name'
      }, 400)
    }

    const { table, idColumn } = config

    if (!idColumn) {
      return c.json({
        success: false,
        error: 'Invalid table configuration'
      }, 500)
    }

    const tableWithId = table as SQLiteTable & { id: typeof table['_']['columns']['id'] }
    await db.delete(table).where(eq(tableWithId.id, id))

    return c.json({
      success: true,
      message: 'Record deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting record:', error)
    return c.json({
      success: false,
      error: 'Failed to delete record',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})