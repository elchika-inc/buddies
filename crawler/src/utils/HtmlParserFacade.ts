/**
 * HtmlParserファサード（リファクタ済み）
 * 
 * 責任分離により以下のサービスに分割：
 * - HtmlExtractor: DOM要素からのデータ抽出
 * - UrlNormalizer: URL正規化処理  
 * - HtmlStructureParser: 構造化データの解析
 * - HtmlTextProcessor: テキスト変換処理
 * 
 * 既存コードとの互換性のためファサードパターンを使用
 */

import { parseHTML } from 'linkedom';
import { HtmlExtractor } from './HtmlExtractor';
import { UrlNormalizer } from './UrlNormalizer';
import { HtmlStructureParser } from './HtmlStructureParser';
import { HtmlTextProcessor } from './HtmlTextProcessor';

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

export class HtmlParserFacade {
  public readonly document: Document;
  private readonly extractor: HtmlExtractor;
  private readonly structureParser: HtmlStructureParser;

  constructor(html: string) {
    this.document = this.parseHtml(html);
    this.extractor = new HtmlExtractor(this.document);
    this.structureParser = new HtmlStructureParser(this.document);
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

  // === 基本的な抽出メソッド（HtmlExtractor delegate） ===

  getText(selector: string): string | null {
    return this.extractor.getText(selector);
  }

  getAttribute(selector: string, attributeName: string): string | null {
    return this.extractor.getAttribute(selector, attributeName);
  }

  getTexts(selector: string): string[] {
    return this.extractor.getTexts(selector);
  }

  exists(selector: string): boolean {
    return this.extractor.exists(selector);
  }

  // === URL関連メソッド（UrlNormalizer使用） ===

  getImageUrl(selector: string, baseUrl?: string): string | null {
    const src = this.getAttribute(selector, 'src');
    return UrlNormalizer.normalizeImageUrl(src, baseUrl);
  }

  getLinkUrl(selector: string, baseUrl?: string): string | null {
    const href = this.getAttribute(selector, 'href');
    return UrlNormalizer.normalizeLinkUrl(href, baseUrl);
  }

  // === 構造化データメソッド（HtmlStructureParser delegate） ===

  getTableData(tableSelector: string): Array<Record<string, string>> {
    return this.structureParser.getTableData(tableSelector);
  }

  getListItems(listSelector: string): string[] {
    return this.structureParser.getListItems(listSelector);
  }

  getDefinitionList(listSelector: string): Record<string, string> {
    return this.structureParser.getDefinitionList(listSelector);
  }

  getFormData(formSelector: string): Record<string, string> {
    return this.structureParser.getFormData(formSelector);
  }

  getMetadata(): Record<string, string> {
    return this.structureParser.getMetadata();
  }

  getTitle(): string | null {
    return this.structureParser.getTitle();
  }

  // === テキスト処理メソッド（HtmlTextProcessor static methods） ===

  static parseNumber(value: string | null): number | null {
    return HtmlTextProcessor.parseNumber(value);
  }

  static parseInteger(value: string | null): number | null {
    return HtmlTextProcessor.parseInteger(value);
  }

  static parseDate(dateString: string | null): string | null {
    return HtmlTextProcessor.parseDate(dateString);
  }

  static decodeHtmlEntities(text: string): string {
    return HtmlTextProcessor.decodeHtmlEntities(text);
  }

  static cleanText(text: string | null): string {
    return HtmlTextProcessor.cleanText(text);
  }

  static parsePrice(priceString: string | null): number | null {
    return HtmlTextProcessor.parsePrice(priceString);
  }

  static parseAge(ageString: string | null): number | null {
    return HtmlTextProcessor.parseAge(ageString);
  }

  static normalizeCategory(category: string | null): string | null {
    return HtmlTextProcessor.normalizeCategory(category);
  }

  static normalizePhoneNumber(phone: string | null): string | null {
    return HtmlTextProcessor.normalizePhoneNumber(phone);
  }

  static extractEmail(text: string | null): string | null {
    return HtmlTextProcessor.extractEmail(text);
  }

  static parseBoolean(value: string | null): boolean | null {
    return HtmlTextProcessor.parseBoolean(value);
  }

  // === 直接的なサービスアクセス（高度な使用向け） ===

  get services() {
    return {
      extractor: this.extractor,
      structureParser: this.structureParser,
      urlNormalizer: UrlNormalizer,
      textProcessor: HtmlTextProcessor
    };
  }
}