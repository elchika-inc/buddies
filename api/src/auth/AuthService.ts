import { Context } from 'hono'
import type { Env } from '../types'
import { AuthStrategy } from './strategies/AuthStrategy'
import { EnvironmentKeyStrategy } from './strategies/EnvironmentKeyStrategy'
import { PublicKeyStrategy } from './strategies/PublicKeyStrategy'

/**
 * 認証サービス
 * 複数の認証ストラテジーを使用してAPIキーを検証
 */
export class AuthService {
  private strategies: AuthStrategy[] = [new EnvironmentKeyStrategy(), new PublicKeyStrategy()]

  /**
   * APIキーを検証
   */
  async validateKey(key: string, context: Context<{ Bindings: Env }>): Promise<boolean> {
    // 各ストラテジーで順番に検証
    for (const strategy of this.strategies) {
      try {
        const isValid = await strategy.validate(key, context)
        if (isValid) {
          console.warn(`[AuthService] Key validated by ${strategy.name} strategy`)
          return true
        }
      } catch (error) {
        console.error(`[AuthService] Error in ${strategy.name} strategy:`, error)
        // エラーが発生しても次のストラテジーを試す
        continue
      }
    }

    return false
  }

  /**
   * リクエストからAPIキーを取得
   */
  extractKey(context: Context): string | undefined {
    const apiKey = context.req.header('X-API-Key')
    const authHeader = context.req.header('Authorization')

    if (apiKey) {
      return apiKey
    }

    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }

    return undefined
  }
}
