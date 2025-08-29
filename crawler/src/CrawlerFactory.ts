import { Env } from './types';
import { ICrawler } from './interfaces/ICrawler';
import { PetHomeCrawler } from './crawlers/PetHomeCrawlerRefactored';

/**
 * クローラーファクトリー
 * ソースIDに応じて適切なクローラーインスタンスを生成
 */
export class CrawlerFactory {
  /**
   * 利用可能なクローラーのリスト
   */
  static getAvailableSources(): string[] {
    return ['pet-home'];
  }
  
  /**
   * ソースIDからクローラーインスタンスを生成
   */
  static createCrawler(sourceId: string, env: Env): ICrawler {
    switch (sourceId) {
      case 'pet-home':
        return new PetHomeCrawler(env);
      
      default:
        throw new Error(`Unknown crawler source: ${sourceId}`);
    }
  }
  
  /**
   * 全てのクローラーインスタンスを生成
   */
  static createAllCrawlers(env: Env): ICrawler[] {
    return this.getAvailableSources().map(sourceId => 
      this.createCrawler(sourceId, env)
    );
  }
  
  /**
   * ソースIDが有効かチェック
   */
  static isValidSource(sourceId: string): boolean {
    return this.getAvailableSources().includes(sourceId);
  }
}