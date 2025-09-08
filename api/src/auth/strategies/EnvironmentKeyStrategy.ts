import { Context } from 'hono'
import type { Env } from '../../types'
import { AuthStrategy } from './AuthStrategy'

/**
 * 環境変数ベースの認証ストラテジー
 */
export class EnvironmentKeyStrategy implements AuthStrategy {
  name = 'environment'

  async validate(key: string, context: Context<{ Bindings: Env }>): Promise<boolean> {
    const validKeys = [
      context.env.API_SECRET_KEY,
      context.env.API_KEY,
      context.env.PUBLIC_API_KEY,
    ].filter(Boolean)

    const isValid = validKeys.includes(key)

    if (isValid) {
      console.log('[EnvironmentKeyStrategy] Key validated successfully')
    }

    return isValid
  }
}
