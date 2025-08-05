/**
 * クローラー実行サービス
 * データ取得、保存、スケジューリング機能を統合
 */

import { petDataCrawler, CrawlerResult } from './crawler';
import { DataStorageFactory, LocalDataStorage, D1DataStorage } from './dataStorage';
import { D1Database } from './d1Storage';

export interface CrawlerServiceResult {
  success: boolean;
  dogsResult: CrawlerResult;
  catsResult: CrawlerResult;
  totalAnimals: number;
  errors: string[];
  timestamp: string;
}

export class CrawlerService {
  private isRunning = false;
  private lastRun: Date | null = null;
  private storage: LocalDataStorage | D1DataStorage;

  constructor(db?: D1Database) {
    this.storage = db ? DataStorageFactory.createD1(db) : new LocalDataStorage();
  }

  /**
   * 全てのペットデータをクロールして保存
   */
  async crawlAndSave(options: {
    dogLimit?: number;
    catLimit?: number;
    force?: boolean;
  } = {}): Promise<CrawlerServiceResult> {
    const { dogLimit = 50, catLimit = 50, force = false } = options;

    if (this.isRunning && !force) {
      throw new Error('クローラーは既に実行中です');
    }

    this.isRunning = true;

    try {
      console.log('🐕🐱 ペットデータの取得を開始します...');

      // データを並行取得
      const { dogs: dogsResult, cats: catsResult } = await petDataCrawler.crawlAllPets(dogLimit, catLimit);

      // 成功したデータのみ保存
      const savePromises = [];
      
      if (dogsResult.success && dogsResult.data.length > 0) {
        console.log(`🐕 犬のデータ ${dogsResult.data.length} 件を保存中...`);
        savePromises.push(this.storage.saveDogs(dogsResult.data, dogsResult.source));
      }

      if (catsResult.success && catsResult.data.length > 0) {
        console.log(`🐱 猫のデータ ${catsResult.data.length} 件を保存中...`);
        savePromises.push(this.storage.saveCats(catsResult.data, catsResult.source));
      }

      await Promise.all(savePromises);

      const totalAnimals = (dogsResult.data?.length || 0) + (catsResult.data?.length || 0);
      const errors = [...dogsResult.errors, ...catsResult.errors];

      this.lastRun = new Date();

      console.log(`✅ データ取得完了: ${totalAnimals} 匹の動物データを保存しました`);

      return {
        success: dogsResult.success || catsResult.success,
        dogsResult,
        catsResult,
        totalAnimals,
        errors,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ クローラー実行エラー:', errorMessage);
      
      return {
        success: false,
        dogsResult: { success: false, data: [], errors: [errorMessage], source: '', timestamp: new Date().toISOString() },
        catsResult: { success: false, data: [], errors: [errorMessage], source: '', timestamp: new Date().toISOString() },
        totalAnimals: 0,
        errors: [errorMessage],
        timestamp: new Date().toISOString()
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 犬のデータのみクロール
   */
  async crawlDogsOnly(limit: number = 50): Promise<CrawlerResult> {
    if (this.isRunning) {
      throw new Error('クローラーは既に実行中です');
    }

    this.isRunning = true;

    try {
      console.log('🐕 犬のデータ取得を開始します...');
      const result = await petDataCrawler.crawlDogs(limit);
      
      if (result.success && result.data.length > 0) {
        await this.storage.saveDogs(result.data, result.source);
        console.log(`✅ 犬のデータ ${result.data.length} 件を保存しました`);
      }

      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 猫のデータのみクロール
   */
  async crawlCatsOnly(limit: number = 50): Promise<CrawlerResult> {
    if (this.isRunning) {
      throw new Error('クローラーは既に実行中です');
    }

    this.isRunning = true;

    try {
      console.log('🐱 猫のデータ取得を開始します...');
      const result = await petDataCrawler.crawlCats(limit);
      
      if (result.success && result.data.length > 0) {
        await this.storage.saveCats(result.data, result.source);
        console.log(`✅ 猫のデータ ${result.data.length} 件を保存しました`);
      }

      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * クローラーの状態を取得
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun?.toISOString() || null
    };
  }

  /**
   * スケジュール実行（定期実行用）
   */
  async scheduledRun(): Promise<CrawlerServiceResult> {
    // 1時間以内に実行済みの場合はスキップ
    if (this.lastRun && Date.now() - this.lastRun.getTime() < 60 * 60 * 1000) {
      console.log('⏰ 前回実行から1時間経過していないため、スキップします');
      throw new Error('前回実行から1時間経過していません');
    }

    // 古いデータのクリーンアップ（週1回）
    if (!this.lastRun || Date.now() - this.lastRun.getTime() > 7 * 24 * 60 * 60 * 1000) {
      console.log('🧹 古いデータのクリーンアップを実行します...');
      await this.storage.cleanupOldData(7);
    }

    return await this.crawlAndSave({
      dogLimit: 100,
      catLimit: 100
    });
  }

  /**
   * データの統計情報を取得
   */
  async getDataStats() {
    const [dogs, cats, metadata] = await Promise.all([
      this.storage.getDogs(),
      this.storage.getCats(),
      this.storage.getMetadata()
    ]);

    return {
      totalAnimals: dogs.length + cats.length,
      dogs: dogs.length,
      cats: cats.length,
      metadata,
      lastRun: this.lastRun?.toISOString() || null,
      isRunning: this.isRunning
    };
  }
}

// エクスポートされたインスタンス（開発環境用）
export const crawlerService = new CrawlerService();

// D1データベース用のファクトリー関数
export const createCrawlerService = (db?: D1Database) => new CrawlerService(db);