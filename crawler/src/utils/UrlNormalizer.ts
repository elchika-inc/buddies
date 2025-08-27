/**
 * URL正規化処理専門クラス
 */

export class UrlNormalizer {
  /**
   * 画像URLを取得（相対URLを絶対URLに変換）
   */
  static normalizeImageUrl(src: string | null, baseUrl?: string): string | null {
    if (!src) return null;

    // 絶対URLの場合はそのまま返す
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }

    // 相対URLを絶対URLに変換
    return this.toAbsoluteUrl(src, baseUrl);
  }

  /**
   * リンクURLを取得
   */
  static normalizeLinkUrl(href: string | null, baseUrl?: string): string | null {
    if (!href) return null;

    // 絶対URLの場合はそのまま返す
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }

    // 相対URLを絶対URLに変換
    return this.toAbsoluteUrl(href, baseUrl);
  }

  /**
   * 相対URLを絶対URLに変換
   */
  static toAbsoluteUrl(url: string, baseUrl?: string): string | null {
    if (!baseUrl) return url;

    try {
      const base = new URL(baseUrl);
      return new URL(url, base).href;
    } catch (error) {
      console.warn(`Failed to convert to absolute URL: ${url}, base: ${baseUrl}`, error);
      return url;
    }
  }

  /**
   * URLの正規化（不要なパラメータの除去など）
   */
  static cleanUrl(url: string): string {
    if (!url) return url;

    try {
      const urlObj = new URL(url);
      
      // 不要なクエリパラメータを除去（トラッキング用など）
      const cleanParams = new URLSearchParams();
      for (const [key, value] of urlObj.searchParams) {
        // 重要なパラメータのみを保持
        if (this.isImportantParam(key)) {
          cleanParams.set(key, value);
        }
      }

      urlObj.search = cleanParams.toString();
      return urlObj.href;
    } catch (error) {
      console.warn(`Failed to clean URL: ${url}`, error);
      return url;
    }
  }

  /**
   * 重要なクエリパラメータかどうかを判定
   */
  private static isImportantParam(key: string): boolean {
    const importantParams = [
      'id', 'page', 'limit', 'offset', 'category', 'type', 'search',
      'q', 'query', 'filter', 'sort', 'order'
    ];
    
    return importantParams.includes(key.toLowerCase());
  }

  /**
   * URLのドメインを取得
   */
  static getDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  /**
   * URLのパス部分を取得
   */
  static getPath(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return null;
    }
  }
}