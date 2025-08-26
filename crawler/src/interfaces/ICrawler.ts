import { Pet, CrawlResult } from '../types';

/**
 * クローラーインターフェース
 * 各サイト固有のクローラーはこのインターフェースを実装する
 */
export interface ICrawler {
  /**
   * サイトのソースID（例: 'pet-home', 'anifare', etc）
   */
  readonly sourceId: string;
  
  /**
   * サイトの表示名
   */
  readonly sourceName: string;
  
  /**
   * ペット情報をクロールする
   * @param petType ペットタイプ（犬/猫）
   * @param options クロールオプション
   */
  crawl(
    petType: 'dog' | 'cat',
    options: CrawlOptions
  ): Promise<CrawlResult>;
  
  /**
   * ペット情報を取得する（スクレイピング処理）
   * @param petType ペットタイプ
   * @param limit 取得件数制限
   * @param lastCheckpoint 前回のチェックポイント
   */
  fetchPets(
    petType: 'dog' | 'cat',
    limit: number,
    lastCheckpoint?: CrawlCheckpoint
  ): Promise<Pet[]>;
}

/**
 * クロールオプション
 */
export interface CrawlOptions {
  /** 取得件数制限 */
  limit: number;
  /** 差分モードを使用するか */
  useDifferential: boolean;
  /** 強制的に全件取得するか */
  forceFullScan?: boolean;
}

/**
 * クロールチェックポイント（差分検知用）
 * サイト非依存の形式で最終処理位置を記録
 */
export interface CrawlCheckpoint {
  /** 最後に処理したアイテムの識別子 */
  lastItemId: string;
  /** 最後のクロール時刻 */
  lastCrawlAt: string;
  /** サイト固有のメタデータ（必要に応じて） */
  metadata?: Record<string, unknown>;
}

/**
 * クローラー状態（データベース保存用）
 */
export interface CrawlerState {
  /** ソースID */
  sourceId: string;
  /** ペットタイプ */
  petType: 'dog' | 'cat';
  /** チェックポイント */
  checkpoint: CrawlCheckpoint;
  /** 処理済みアイテム数 */
  totalProcessed: number;
  /** 更新日時 */
  updatedAt: string;
}