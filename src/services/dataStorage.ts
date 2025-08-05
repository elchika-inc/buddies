/**
 * データストレージサービス
 * クローラーで取得したデータの保存と管理
 */

import { PetData } from './crawler';
import { D1Database, D1DataStorage } from './d1Storage';

// Cloudflare Workers環境の型定義
interface CloudflareEnvironment {
  DB?: D1Database;
  [key: string]: unknown;
}

export interface StoredPetData extends PetData {
  lastUpdated: string;
  source: string;
  isActive: boolean;
}

// CloudflareWorkers環境では以下のNode.jsモジュールは使用できません
// import * as fs from 'fs';
// import * as path from 'path';

/**
 * ファイルベースのデータストレージ（Node.js環境対応）
 * CloudflareWorkers環境では使用不可 - ダミー実装
 */
export class LocalDataStorage {
  constructor() {
    // CloudflareWorkers環境では使用不可
  }

  async saveDogs(dogs: PetData[], source: string): Promise<void> {
    throw new Error('LocalDataStorage は CloudflareWorkers環境では使用できません。D1DataStorage を使用してください。');
  }

  async saveCats(cats: PetData[], source: string): Promise<void> {
    throw new Error('LocalDataStorage は CloudflareWorkers環境では使用できません。D1DataStorage を使用してください。');
  }

  async getDogs(): Promise<StoredPetData[]> {
    throw new Error('LocalDataStorage は CloudflareWorkers環境では使用できません。D1DataStorage を使用してください。');
  }

  async getCats(): Promise<StoredPetData[]> {
    throw new Error('LocalDataStorage は CloudflareWorkers環境では使用できません。D1DataStorage を使用してください。');
  }

  async getAllAnimals(): Promise<StoredPetData[]> {
    throw new Error('LocalDataStorage は CloudflareWorkers環境では使用できません。D1DataStorage を使用してください。');
  }

  async getAnimalById(id: string): Promise<StoredPetData | null> {
    throw new Error('LocalDataStorage は CloudflareWorkers環境では使用できません。D1DataStorage を使用してください。');
  }

  async getMetadata(): Promise<any> {
    throw new Error('LocalDataStorage は CloudflareWorkers環境では使用できません。D1DataStorage を使用してください。');
  }

  async clearAll(): Promise<void> {
    throw new Error('LocalDataStorage は CloudflareWorkers環境では使用できません。D1DataStorage を使用してください。');
  }

  async cleanupOldData(daysOld: number = 7): Promise<void> {
    throw new Error('LocalDataStorage は CloudflareWorkers環境では使用できません。D1DataStorage を使用してください。');
  }
}

/**
 * データストレージファクトリー
 * 実行環境に基づいて適切なストレージインスタンスを作成
 */
export class DataStorageFactory {
  static create(env?: CloudflareEnvironment): LocalDataStorage | D1DataStorage {
    // CloudflareWorkers環境ではD1を優先使用
    if (env?.DB) {
      console.log('🔧 DataStorageFactory: D1DataStorage を使用');
      return new D1DataStorage(env.DB as D1Database);
    }
    
    console.log('🔧 DataStorageFactory: LocalDataStorage を使用 (エラーが発生する可能性があります)');
    return new LocalDataStorage();
  }

  static createD1(db: D1Database): D1DataStorage {
    console.log('🔧 DataStorageFactory: D1DataStorage を直接作成');
    return new D1DataStorage(db);
  }
}

// デフォルトエクスポート（下位互換性のため）
export { D1DataStorage } from './d1Storage';