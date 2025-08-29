/**
 * PetHomeのデータ取得専用クラス
 * 
 * HTTPリクエストとレスポンス取得に特化
 */
export class PetHomeDataFetcher {
  private readonly baseUrl = 'https://www.pet-home.jp';
  private readonly userAgent = 'Mozilla/5.0 (compatible; PawMatch/1.0)';

  /**
   * リストページを取得
   */
  async fetchListPage(petType: 'dog' | 'cat', page: number = 1): Promise<string> {
    const url = this.buildListUrl(petType, page);
    return await this.fetchPage(url);
  }

  /**
   * 詳細ページを取得
   */
  async fetchDetailPage(url: string): Promise<string> {
    const fullUrl = this.normalizeUrl(url);
    return await this.fetchPage(fullUrl);
  }

  /**
   * 画像を取得
   */
  async fetchImage(imageUrl: string): Promise<ArrayBuffer> {
    const fullUrl = this.normalizeUrl(imageUrl);
    
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'image/*'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }

  /**
   * ページを取得（共通処理）
   */
  private async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * リストページURLを構築
   */
  private buildListUrl(petType: 'dog' | 'cat', page: number): string {
    const path = petType === 'dog' ? '/dogs/' : '/cats/';
    return page > 1 
      ? `${this.baseUrl}${path}?page=${page}`
      : `${this.baseUrl}${path}`;
  }

  /**
   * URLを正規化
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (url.startsWith('/')) {
      return `${this.baseUrl}${url}`;
    }
    return `${this.baseUrl}/${url}`;
  }

  /**
   * レート制限を考慮した待機
   */
  async waitForRateLimit(milliseconds: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  /**
   * リトライ付きフェッチ
   */
  async fetchWithRetry(
    url: string, 
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.fetchPage(url);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Fetch attempt ${i + 1} failed for ${url}:`, error);
        
        if (i < maxRetries - 1) {
          await this.waitForRateLimit(delayMs * Math.pow(2, i)); // 指数バックオフ
        }
      }
    }

    throw lastError || new Error('Failed to fetch after retries');
  }
}