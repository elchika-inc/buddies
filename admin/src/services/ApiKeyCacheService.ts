import { ApiKey } from '../types/ApiKeysSchema'

/**
 * APIキーのキャッシュ管理サービス
 * KVNamespaceを使用したキャッシュの読み書きを責任とする
 */
export class ApiKeyCacheService {
  private readonly CACHE_PREFIX = 'key:'
  private readonly CACHE_TTL = 300 // 5分

  constructor(private cache: KVNamespace) {}

  /**
   * キャッシュキーの生成
   */
  private getCacheKey(apiKey: string): string {
    return `${this.CACHE_PREFIX}${apiKey}`
  }

  /**
   * APIキーをキャッシュに保存
   */
  async set(apiKey: string, data: ApiKey): Promise<void> {
    const cacheKey = this.getCacheKey(apiKey)
    await this.cache.put(cacheKey, JSON.stringify(data), {
      expirationTtl: this.CACHE_TTL,
    })
  }

  /**
   * APIキーをキャッシュから取得
   */
  async get(apiKey: string): Promise<ApiKey | null> {
    const cacheKey = this.getCacheKey(apiKey)
    const cached = await this.cache.get(cacheKey)

    if (!cached) {
      return null
    }

    try {
      return JSON.parse(cached) as ApiKey
    } catch {
      // パースエラーの場合はキャッシュを削除
      await this.delete(apiKey)
      return null
    }
  }

  /**
   * APIキーをキャッシュから削除
   */
  async delete(apiKey: string): Promise<void> {
    const cacheKey = this.getCacheKey(apiKey)
    await this.cache.delete(cacheKey)
  }

  /**
   * 複数のAPIキーをキャッシュから一括削除
   */
  async deleteMany(apiKeys: string[]): Promise<void> {
    await Promise.all(apiKeys.map(key => this.delete(key)))
  }

  /**
   * キャッシュの有効期限を延長
   */
  async refresh(apiKey: string, data: ApiKey): Promise<void> {
    await this.set(apiKey, data)
  }
}