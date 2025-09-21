import { RateLimitResult, parseRateLimitCount } from '../types/ApiKeys'
import { API_CONFIG, getRateLimitWindow } from '../config/ApiKeys'

export class RateLimitService {
  constructor(private cache: KVNamespace) {}

  /**
   * レート制限をチェックし、カウントをインクリメント
   */
  async checkLimit(key: string, limit: number): Promise<RateLimitResult> {
    const window = getRateLimitWindow()
    const rateLimitKey = `rate:${key}:${window}`

    // 現在のカウントを取得
    const currentCount = await this.getCurrentCount(rateLimitKey)

    // 制限を超えているかチェック
    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: this.getResetTime(),
        resetAt: Math.floor((Date.now() + this.getResetTime() * 1000) / 1000),
      }
    }

    // カウントをインクリメント
    await this.incrementCount(rateLimitKey)

    return {
      allowed: true,
      remaining: limit - currentCount - 1,
      resetIn: this.getResetTime(),
      resetAt: Math.floor((Date.now() + this.getResetTime() * 1000) / 1000),
    }
  }

  /**
   * レート制限の現在のカウントを取得（インクリメントなし）
   */
  async getCurrentUsage(key: string): Promise<number> {
    const window = getRateLimitWindow()
    const rateLimitKey = `rate:${key}:${window}`
    return await this.getCurrentCount(rateLimitKey)
  }

  /**
   * 現在のカウントを取得
   */
  private async getCurrentCount(rateLimitKey: string): Promise<number> {
    const value = await this.cache.get(rateLimitKey)
    return parseRateLimitCount(value)
  }

  /**
   * カウントをインクリメント
   */
  private async incrementCount(rateLimitKey: string): Promise<void> {
    const current = await this.getCurrentCount(rateLimitKey)
    await this.cache.put(rateLimitKey, (current + 1).toString(), {
      expirationTtl: API_CONFIG.CACHE.RATE_LIMIT_TTL_SECONDS,
    })
  }

  /**
   * リセットまでの残り時間（秒）を取得
   */
  private getResetTime(): number {
    const now = Date.now()
    const currentWindow = Math.floor(now / (API_CONFIG.RATE_LIMIT.WINDOW_SECONDS * 1000))
    const nextWindow = (currentWindow + 1) * API_CONFIG.RATE_LIMIT.WINDOW_SECONDS * 1000
    return Math.ceil((nextWindow - now) / 1000)
  }

  /**
   * 特定のキーのレート制限をリセット（テスト用）
   */
  async resetLimit(key: string): Promise<void> {
    const window = getRateLimitWindow()
    const rateLimitKey = `rate:${key}:${window}`
    await this.cache.delete(rateLimitKey)
  }

  /**
   * 複数のキーのレート制限状態を一括取得
   */
  async getMultipleUsage(keys: string[]): Promise<Map<string, number>> {
    const window = getRateLimitWindow()
    const result = new Map<string, number>()

    for (const key of keys) {
      const rateLimitKey = `rate:${key}:${window}`
      const count = await this.getCurrentCount(rateLimitKey)
      result.set(key, count)
    }

    return result
  }
}
