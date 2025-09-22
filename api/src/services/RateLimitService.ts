/**
 * レート制限サービス
 *
 * APIキーごとのレート制限を管理
 */

import type { RateLimitResult } from '@pawmatch/shared/types'

export class RateLimitService {
  private readonly WINDOW_SECONDS = 60 // 1分間のウィンドウ

  constructor(private kv: KVNamespace<string>) {}

  /**
   * レート制限をチェック
   */
  async checkLimit(key: string, limit: number): Promise<RateLimitResult> {
    const now = Date.now()
    const windowKey = this.getWindowKey(key, now)

    // 現在のカウントを取得
    const currentCount = (await this.kv.get<number>(windowKey, 'json')) || 0

    // ウィンドウの終了時刻を計算
    const windowStart = Math.floor(now / (this.WINDOW_SECONDS * 1000)) * this.WINDOW_SECONDS * 1000
    const windowEnd = windowStart + this.WINDOW_SECONDS * 1000
    const resetAt = Math.floor(windowEnd / 1000)

    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        resetIn: Math.ceil((windowEnd - now) / 1000),
      }
    }

    // カウントをインクリメント
    const newCount = currentCount + 1
    await this.kv.put(windowKey, JSON.stringify(newCount), { expirationTtl: this.WINDOW_SECONDS })

    return {
      allowed: true,
      remaining: limit - newCount,
      resetAt,
    }
  }

  /**
   * 使用状況を取得
   */
  async getUsage(key: string): Promise<number> {
    const now = Date.now()
    const windowKey = this.getWindowKey(key, now)
    return (await this.kv.get<number>(windowKey, 'json')) || 0
  }

  /**
   * 複数キーの使用状況を取得
   */
  async getMultipleUsage(keys: string[]): Promise<Map<string, number>> {
    const usageMap = new Map<string, number>()

    await Promise.all(
      keys.map(async (key) => {
        const usage = await this.getUsage(key)
        usageMap.set(key, usage)
      })
    )

    return usageMap
  }

  /**
   * レート制限をリセット
   */
  async reset(key: string): Promise<void> {
    const now = Date.now()
    const windowKey = this.getWindowKey(key, now)
    await this.kv.delete(windowKey)
  }

  /**
   * ウィンドウキーを生成
   */
  private getWindowKey(key: string, timestamp: number = Date.now()): string {
    const window = Math.floor(timestamp / (this.WINDOW_SECONDS * 1000))
    return `rate_limit:${key}:${window}`
  }
}
