import { Context, Next } from 'hono'
import type { Env } from '../types/env'

export async function auth(c: Context<{ Bindings: Env }>, next: Next) {
  const adminSecret = c.req.header('X-Admin-Secret')

  if (!adminSecret) {
    return c.json({
      error: 'Unauthorized',
      message: 'Admin secret is required'
    }, 401)
  }

  if (adminSecret !== c.env.ADMIN_SECRET) {
    return c.json({
      error: 'Unauthorized',
      message: 'Invalid admin secret'
    }, 401)
  }

  return next()
}