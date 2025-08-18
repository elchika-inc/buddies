import { CrawlerConfig } from '../types';
import { join } from 'path';

export const DEFAULT_CONFIG: CrawlerConfig = {
  baseUrl: 'https://www.pet-home.jp',
  maxPages: 10,
  requestDelay: 2000, // 2秒間隔
  maxRetries: 3,
  timeout: 30000,
  userAgent: 'Mozilla/5.0 (compatible; PawMatchBot/1.0; +https://pawmatch.app/bot)',
  outputDir: join(process.cwd(), 'output')
};

export const PET_HOME_CAT_CONFIG: CrawlerConfig = {
  ...DEFAULT_CONFIG,
  baseUrl: 'https://www.pet-home.jp',
  maxPages: 5, // 猫は5ページまで
  requestDelay: 2500, // 猫は少し長めの間隔
};

export const PET_HOME_DOG_CONFIG: CrawlerConfig = {
  ...DEFAULT_CONFIG,
  baseUrl: 'https://www.pet-home.jp',
  maxPages: 5, // 犬は5ページまで
  requestDelay: 2500,
};

export const TEST_CONFIG: CrawlerConfig = {
  ...DEFAULT_CONFIG,
  maxPages: 1, // テスト時は1ページのみ
  requestDelay: 1000,
  timeout: 15000,
  outputDir: join(process.cwd(), 'test-output')
};

export class ConfigBuilder {
  private config: Partial<CrawlerConfig> = {};

  static fromDefault(): ConfigBuilder {
    const builder = new ConfigBuilder();
    builder.config = { ...DEFAULT_CONFIG };
    return builder;
  }

  static forTesting(): ConfigBuilder {
    const builder = new ConfigBuilder();
    builder.config = { ...TEST_CONFIG };
    return builder;
  }

  setBaseUrl(url: string): ConfigBuilder {
    this.config.baseUrl = url;
    return this;
  }

  setMaxPages(pages: number): ConfigBuilder {
    this.config.maxPages = Math.max(1, pages);
    return this;
  }

  setRequestDelay(delay: number): ConfigBuilder {
    this.config.requestDelay = Math.max(1000, delay); // 最低1秒
    return this;
  }

  setMaxRetries(retries: number): ConfigBuilder {
    this.config.maxRetries = Math.max(0, retries);
    return this;
  }

  setTimeout(timeout: number): ConfigBuilder {
    this.config.timeout = Math.max(5000, timeout); // 最低5秒
    return this;
  }

  setUserAgent(userAgent: string): ConfigBuilder {
    this.config.userAgent = userAgent;
    return this;
  }

  setOutputDir(dir: string): ConfigBuilder {
    this.config.outputDir = dir;
    return this;
  }

  build(): CrawlerConfig {
    // 必須フィールドの検証
    const requiredFields: (keyof CrawlerConfig)[] = [
      'baseUrl', 'maxPages', 'requestDelay', 'maxRetries', 'timeout', 'userAgent', 'outputDir'
    ];

    for (const field of requiredFields) {
      if (!this.config[field]) {
        throw new Error(`Missing required config field: ${field}`);
      }
    }

    return this.config as CrawlerConfig;
  }
}

// 環境変数からの設定読み込み
export function loadConfigFromEnv(): Partial<CrawlerConfig> {
  return {
    baseUrl: process.env.CRAWLER_BASE_URL,
    maxPages: process.env.CRAWLER_MAX_PAGES ? parseInt(process.env.CRAWLER_MAX_PAGES) : undefined,
    requestDelay: process.env.CRAWLER_REQUEST_DELAY ? parseInt(process.env.CRAWLER_REQUEST_DELAY) : undefined,
    maxRetries: process.env.CRAWLER_MAX_RETRIES ? parseInt(process.env.CRAWLER_MAX_RETRIES) : undefined,
    timeout: process.env.CRAWLER_TIMEOUT ? parseInt(process.env.CRAWLER_TIMEOUT) : undefined,
    userAgent: process.env.CRAWLER_USER_AGENT,
    outputDir: process.env.CRAWLER_OUTPUT_DIR
  };
}

// 設定の検証
export function validateConfig(config: CrawlerConfig): string[] {
  const errors: string[] = [];

  if (!config.baseUrl) {
    errors.push('Base URL is required');
  } else {
    try {
      new URL(config.baseUrl);
    } catch {
      errors.push('Base URL must be a valid URL');
    }
  }

  if (config.maxPages < 1) {
    errors.push('Max pages must be at least 1');
  }

  if (config.requestDelay < 1000) {
    errors.push('Request delay must be at least 1000ms for ethical crawling');
  }

  if (config.maxRetries < 0) {
    errors.push('Max retries cannot be negative');
  }

  if (config.timeout < 5000) {
    errors.push('Timeout must be at least 5000ms');
  }

  if (!config.userAgent) {
    errors.push('User agent is required');
  }

  if (!config.outputDir) {
    errors.push('Output directory is required');
  }

  return errors;
}