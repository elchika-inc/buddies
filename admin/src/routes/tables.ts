import { Hono } from 'hono'
import type { Env } from '../types/env'
import type { TableInfo } from '@pawmatch/shared/types'

export const tablesRoute = new Hono<{ Bindings: Env }>()

// テーブル一覧を取得
tablesRoute.get('/', async (c) => {
  try {
    const db = c.env.DB

    // テーブル一覧を取得（SQLiteのメタテーブルから）
    const tablesResult = await db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_cf_%'
      ORDER BY name
    `).all()

    // 各テーブルのレコード数を取得
    const tables = await Promise.all(
      (tablesResult.results as Array<{ name: string }>).map(async (tableResult) => {
        const countResult = await db.prepare(
          `SELECT COUNT(*) as count FROM ${tableResult.name}`
        ).first() as { count: number } | null

        const table: TableInfo = {
          name: tableResult.name,
          count: Number(countResult?.count || 0)
        }
        return table
      })
    )

    return c.json({
      success: true,
      tables
    })
  } catch (error) {
    console.error('Error fetching tables:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch tables',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// テーブルの詳細情報を取得
tablesRoute.get('/:tableName', async (c) => {
  try {
    const { tableName } = c.req.param()
    const db = c.env.DB

    // テーブルのカラム情報を取得
    const columnsResult = await db.prepare(
      `PRAGMA table_info(${tableName})`
    ).all()

    // テーブルの最初の数レコードを取得
    const sampleDataResult = await db.prepare(
      `SELECT * FROM ${tableName} LIMIT 10`
    ).all()

    // テーブルの総レコード数
    const countResult = await db.prepare(
      `SELECT COUNT(*) as count FROM ${tableName}`
    ).first()

    return c.json({
      success: true,
      table: {
        name: tableName,
        columns: columnsResult.results,
        sampleData: sampleDataResult.results,
        totalCount: Number(countResult?.['count'] || 0)
      }
    })
  } catch (error) {
    console.error('Error fetching table details:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch table details',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})