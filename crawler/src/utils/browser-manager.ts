import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { CrawlerConfig } from '../types';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: CrawlerConfig;

  constructor(config: CrawlerConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    this.context = await this.browser.newContext({
      userAgent: this.config.userAgent,
      viewport: { width: 1280, height: 720 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo'
    });

    this.page = await this.context.newPage();

    // ページのタイムアウト設定
    this.page.setDefaultTimeout(this.config.timeout);
    this.page.setDefaultNavigationTimeout(this.config.timeout);

    // ネットワークリクエストの最適化（画像はダウンロードが必要なのでCSSとフォントのみブロック）
    await this.page.route('**/*.{css,woff,woff2}', route => {
      route.abort();
    });
  }

  async navigateToPage(url: string, retries = 0): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      const response = await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout
      });

      if (!response || !response.ok()) {
        throw new Error(`HTTP ${response?.status()}: ${response?.statusText()}`);
      }

      return true;
    } catch (error) {
      if (retries < this.config.maxRetries) {
        console.warn(`Navigation failed, retrying... (${retries + 1}/${this.config.maxRetries})`);
        await this.delay(1000 * Math.pow(2, retries)); // Exponential backoff
        return this.navigateToPage(url, retries + 1);
      }
      throw error;
    }
  }

  async waitForSelector(selector: string, timeout?: number): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      await this.page.waitForSelector(selector, { timeout: timeout || this.config.timeout });
      return true;
    } catch {
      return false;
    }
  }

  async extractText(selector: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      const element = await this.page.$(selector);
      if (!element) return '';

      const text = await element.textContent();
      return text?.trim() || '';
    } catch {
      return '';
    }
  }

  async extractTexts(selector: string): Promise<string[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      const elements = await this.page.$$(selector);
      const texts: string[] = [];

      for (const element of elements) {
        const text = await element.textContent();
        if (text?.trim()) {
          texts.push(text.trim());
        }
      }

      return texts;
    } catch {
      return [];
    }
  }

  async extractAttribute(selector: string, attribute: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      const element = await this.page.$(selector);
      if (!element) return '';

      const attr = await element.getAttribute(attribute);
      return attr?.trim() || '';
    } catch {
      return '';
    }
  }

  async extractAttributes(selector: string, attribute: string): Promise<string[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      const elements = await this.page.$$(selector);
      const attributes: string[] = [];

      for (const element of elements) {
        const attr = await element.getAttribute(attribute);
        if (attr?.trim()) {
          attributes.push(attr.trim());
        }
      }

      return attributes;
    } catch {
      return [];
    }
  }

  async clickElement(selector: string): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      await this.page.click(selector, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async scrollToBottom(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  async takeScreenshot(path: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.screenshot({ path, fullPage: true });
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getCurrentUrl(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    return this.page.url();
  }

  async evaluate<T>(fn: () => T): Promise<T> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    return this.page.evaluate(fn);
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getPage(): Page | null {
    return this.page;
  }

  getBrowser(): Browser | null {
    return this.browser;
  }

  getContext(): BrowserContext | null {
    return this.context;
  }
}