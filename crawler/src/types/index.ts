export * from './pet';

// 地域情報
export interface Region {
  code: string;
  name: string;
  prefectures: Prefecture[];
}

export interface Prefecture {
  code: string;
  name: string;
  cities: City[];
}

export interface City {
  code: string;
  name: string;
}

// エラー処理
export interface CrawlerError {
  type: 'network' | 'parsing' | 'validation' | 'timeout';
  message: string;
  url?: string;
  timestamp: string;
  stack?: string;
}