/**
 * HTML要素からテキスト・属性を抽出する専門クラス
 */

export class HtmlExtractor {
  constructor(private readonly document: Document) {}

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
   * 最初に見つかった要素を返す
   */
  getElement(selector: string): Element | null {
    try {
      return this.document.querySelector(selector);
    } catch (error) {
      console.warn(`Failed to get element for selector "${selector}":`, error);
      return null;
    }
  }

  /**
   * 全ての一致する要素を返す
   */
  getElements(selector: string): Element[] {
    try {
      const elements = this.document.querySelectorAll(selector);
      return Array.from(elements);
    } catch (error) {
      console.warn(`Failed to get elements for selector "${selector}":`, error);
      return [];
    }
  }
}