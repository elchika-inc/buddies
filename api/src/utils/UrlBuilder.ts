/**
 * URL生成を統一的に管理するクラス
 */
export class UrlBuilder {
  private readonly baseUrl: string

  constructor(baseUrl?: string) {
    // 環境変数から取得、なければデフォルト値を使用
    this.baseUrl = baseUrl || 'https://pawmatch-api.elchika.app'
  }

  /**
   * 画像URLを生成
   */
  imageUrl(type: 'dog' | 'cat', id: string, format: 'jpg' | 'png' | 'webp' = 'jpg'): string {
    return `${this.baseUrl}/api/images/${type}/${id}.${format}`
  }

  /**
   * ペットAPIエンドポイントURLを生成
   */
  petApiUrl(endpoint: string): string {
    return `${this.baseUrl}/api/pets${endpoint}`
  }

  /**
   * 統計APIエンドポイントURLを生成
   */
  statsApiUrl(endpoint: string): string {
    return `${this.baseUrl}/api/stats${endpoint}`
  }

  /**
   * 管理APIエンドポイントURLを生成
   */
  adminApiUrl(endpoint: string): string {
    return `${this.baseUrl}/api/admin${endpoint}`
  }

  /**
   * 基本URLを取得
   */
  getBaseUrl(): string {
    return this.baseUrl
  }
}

/**
 * シングルトンインスタンスを管理
 */
let urlBuilderInstance: UrlBuilder | null = null

/**
 * UrlBuilderのシングルトンインスタンスを取得
 */
export function getUrlBuilder(baseUrl?: string): UrlBuilder {
  if (!urlBuilderInstance || baseUrl) {
    urlBuilderInstance = new UrlBuilder(baseUrl)
  }
  return urlBuilderInstance
}

/**
 * R2ストレージのパスを生成
 */
export class R2PathBuilder {
  /**
   * ペット画像のR2パスを生成
   */
  static petImagePath(
    petType: 'dog' | 'cat',
    petId: string,
    format: 'original' | 'optimized' | 'screenshot'
  ): string {
    const filename =
      format === 'original'
        ? 'original.jpg'
        : format === 'optimized'
          ? 'optimized.webp'
          : 'screenshot.png'

    return `pets/${petType}s/${petId}/${filename}`
  }

  /**
   * ペット画像のディレクトリパスを生成
   */
  static petImageDirectory(petType: 'dog' | 'cat', petId: string): string {
    return `pets/${petType}s/${petId}/`
  }
}
