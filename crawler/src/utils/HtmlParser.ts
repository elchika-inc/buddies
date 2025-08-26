import { parseHTML } from 'linkedom';

// DOM型定義（Cloudflare Workers環境との互換性のため）
declare global {
  interface Document {
    querySelector(selector: string): Element | null;
    querySelectorAll(selector: string): NodeListOf<Element>;
    getElementById(id: string): HTMLElement | null;
    getElementsByClassName(className: string): HTMLCollectionOf<Element>;
    getElementsByTagName(tagName: string): HTMLCollectionOf<Element>;
  }
  
  interface Element {
    textContent: string | null;
    getAttribute(name: string): string | null;
    querySelector(selector: string): Element | null;
    querySelectorAll(selector: string): NodeListOf<Element>;
  }
}

/**
 * 堅牢なHTMLパーサーユーティリティ
 * HTMLパース処理の共通化とエラーハンドリングの強化
 */
export class HtmlParser {
  public readonly document: Document;

  constructor(html: string) {
    this.document = this.parseHtml(html);
  }

  /**
   * HTMLを安全にパースする
   */
  private parseHtml(html: string): Document {
    if (!html || typeof html !== 'string') {
      throw new Error('Invalid HTML input');
    }

    try {
      // DOMParserを使用してHTMLをパース（Cloudflare Workers環境）
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
      }

      // linkedomを使用したフォールバック（Node.js環境）
      try {
        const { document } = parseHTML(html);
        return document as Document;
      } catch (linkedomError) {
        console.warn('linkedom parsing failed:', linkedomError);
        return this.createSimpleDocument(html);
      }
    } catch (error) {
      throw new Error(`Failed to parse HTML: ${error}`);
    }
  }

  /**
   * 簡易DocumentLike オブジェクトを作成（DOMParserが使えない場合のフォールバック）
   */
  private createSimpleDocument(_html: string): Document {
    // HTMLRewriterを使う場合の最小実装
    const mockDocument = {
      querySelector: (_selector: string): Element | null => null,
      querySelectorAll: (_selector: string): NodeListOf<Element> => {
        return [] as unknown as NodeListOf<Element>;
      },
      getElementById: (_id: string): HTMLElement | null => null,
      getElementsByClassName: (_className: string): HTMLCollectionOf<Element> => {
        return [] as unknown as HTMLCollectionOf<Element>;
      },
      getElementsByTagName: (_tagName: string): HTMLCollectionOf<Element> => {
        return [] as unknown as HTMLCollectionOf<Element>;
      },
    } as unknown as Document;

    return mockDocument;
  }

  /**
   * セレクターでテキストを安全に取得
   */
  getText(selector: string): string | null {
    try {
      const element = this.document.querySelector(selector);
      return element?.textContent?.trim() || null;
    } catch (error) {
      console.warn(`Failed to get text for selector "${selector}":`, error);
      return null;
    }
  }

  /**
   * セレクターで属性値を安全に取得
   */
  getAttribute(selector: string, attributeName: string): string | null {
    try {
      const element = this.document.querySelector(selector);
      return element?.getAttribute(attributeName) || null;
    } catch (error) {
      console.warn(`Failed to get attribute "${attributeName}" for selector "${selector}":`, error);
      return null;
    }
  }

  /**
   * 複数要素のテキストを配列で取得
   */
  getTexts(selector: string): string[] {
    try {
      const elements = this.document.querySelectorAll(selector);
      return Array.from(elements)
        .map(el => (el as HTMLElement).textContent?.trim())
        .filter((text): text is string => Boolean(text && text.length > 0));
    } catch (error) {
      console.warn(`Failed to get texts for selector "${selector}":`, error);
      return [];
    }
  }

  /**
   * 画像URLを取得（相対URLを絶対URLに変換）
   */
  getImageUrl(selector: string, baseUrl?: string): string | null {
    try {
      const src = this.getAttribute(selector, 'src');
      if (!src) return null;

      // 絶対URLの場合はそのまま返す
      if (src.startsWith('http://') || src.startsWith('https://')) {
        return src;
      }

      // 相対URLを絶対URLに変換
      if (baseUrl) {
        try {
          const base = new URL(baseUrl);
          return new URL(src, base).href;
        } catch {
          return src;
        }
      }

      return src;
    } catch (error) {
      console.warn(`Failed to get image URL for selector "${selector}":`, error);
      return null;
    }
  }

  /**
   * リンクURLを取得
   */
  getLinkUrl(selector: string, baseUrl?: string): string | null {
    const href = this.getAttribute(selector, 'href');
    if (!href) return null;

    // 絶対URLの場合はそのまま返す
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }

    // 相対URLを絶対URLに変換
    if (baseUrl) {
      try {
        const base = new URL(baseUrl);
        return new URL(href, base).href;
      } catch {
        return href;
      }
    }

    return href;
  }

  /**
   * テーブルデータを構造化して取得
   */
  getTableData(tableSelector: string): Array<Record<string, string>> {
    try {
      const table = this.document.querySelector(tableSelector);
      if (!table) return [];

      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) return []; // ヘッダー行がない

      // ヘッダー行を取得
      const headerRow = rows[0];
      if (!headerRow) return [];
      
      const headers = Array.from(headerRow.querySelectorAll('th, td'))
        .map(cell => (cell as HTMLElement).textContent?.trim() || '');

      // データ行を処理
      const data: Array<Record<string, string>> = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        
        const cells = Array.from(row.querySelectorAll('td'));
        const rowData: Record<string, string> = {};

        cells.forEach((cell, index) => {
          const header = headers[index];
          if (header) {
            rowData[header] = (cell as HTMLElement).textContent?.trim() || '';
          }
        });

        if (Object.keys(rowData).length > 0) {
          data.push(rowData);
        }
      }

      return data;
    } catch (error) {
      console.warn(`Failed to get table data for selector "${tableSelector}":`, error);
      return [];
    }
  }

  /**
   * リストアイテムを配列で取得
   */
  getListItems(listSelector: string): string[] {
    try {
      const list = this.document.querySelector(listSelector);
      if (!list) return [];

      const items = list.querySelectorAll('li');
      return Array.from(items)
        .map(item => (item as HTMLElement).textContent?.trim())
        .filter((text): text is string => Boolean(text && text.length > 0));
    } catch (error) {
      console.warn(`Failed to get list items for selector "${listSelector}":`, error);
      return [];
    }
  }

  /**
   * 要素の存在チェック
   */
  exists(selector: string): boolean {
    try {
      return this.document.querySelector(selector) !== null;
    } catch (error) {
      console.warn(`Failed to check existence for selector "${selector}":`, error);
      return false;
    }
  }

  /**
   * 安全な数値変換
   */
  static parseNumber(value: string | null): number | null {
    if (!value) return null;
    
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * 日付文字列の正規化
   */
  static parseDate(dateString: string | null): string | null {
    if (!dateString) return null;

    try {
      // 様々な日本語の日付形式に対応
      const cleanedDate = dateString
        .replace(/年|月|日/g, '-')
        .replace(/--+/g, '-')
        .replace(/-$/, '')
        .trim();

      const date = new Date(cleanedDate);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }

  /**
   * HTMLエンティティのデコード
   */
  static decodeHtmlEntities(text: string): string {
    if (!text) return text;
    
    const entityMap: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };

    return text.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
      return entityMap[match] || match;
    });
  }

  /**
   * テキストのクリーンアップ
   */
  static cleanText(text: string | null): string {
    if (!text) return '';
    
    return this.decodeHtmlEntities(text)
      .replace(/\s+/g, ' ')
      .trim();
  }
}