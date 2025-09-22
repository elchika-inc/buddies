import { Hono } from 'hono'
import { renderReactComponent } from '../utils/renderReact'
import { Dashboard } from '../components/Dashboard'
import { TableDetail } from '../components/TableDetail'
import type { Env } from '../types/env'

/**
 * UIルート
 */
export const uiRoute = new Hono<{ Bindings: Env }>()

// ダッシュボード (React版)
uiRoute.get('/', (c) => {
  const html = renderReactComponent(Dashboard, {}, 'PawMatch Admin Dashboard')
  return c.html(html)
})

// テーブル詳細ページ (React版)
uiRoute.get('/table/:tableName', (c) => {
  const tableName = c.req.param('tableName')
  const html = renderReactComponent(
    TableDetail,
    { tableName, adminSecret: '' },
    `${tableName} - PawMatch Admin`
  )
  return c.html(html)
})