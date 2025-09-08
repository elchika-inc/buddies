import { Context } from 'hono'
import type { Env } from '../../types'

/**
 * 認証ストラテジーのインターフェース
 */
export interface AuthStrategy {
  name: string
  validate(key: string, context: Context<{ Bindings: Env }>): Promise<boolean>
}
