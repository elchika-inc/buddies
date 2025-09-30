import type { AuthStrategy } from './AuthStrategy'
import type { Context } from 'hono'
import type { Env } from '../../types'

/**
 * 公開キーベースの認証ストラテジー（開発用）
 */
export class PublicKeyStrategy implements AuthStrategy {
  name = 'public'

  // 開発用の公開キー
  private readonly publicKeys = ['b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb']

  async validate(key: string, _context: Context<{ Bindings: Env }>): Promise<boolean> {
    const isValid = this.publicKeys.includes(key)

    if (isValid) {
      console.warn('[PublicKeyStrategy] Public key used for authentication')
    }

    return isValid
  }
}
