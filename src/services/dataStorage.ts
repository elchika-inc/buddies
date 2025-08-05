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

import * as fs from 'fs';
import * as path from 'path';

/**
 * ファイルベースのデータストレージ（Node.js環境対応）
 */
export class LocalDataStorage {
  private readonly dataDir: string;
  private readonly DOGS_FILE: string;
  private readonly CATS_FILE: string;
  private readonly METADATA_FILE: string;
  private isNode: boolean;

  constructor() {
    // 実行環境の判定
    this.isNode = typeof process !== 'undefined' && process.cwd;
    
    if (this.isNode) {
      // Node.js環境：ファイルシステムを使用
      this.dataDir = path.join(process.cwd(), '.pawmatch-data');
      this.DOGS_FILE = path.join(this.dataDir, 'dogs.json');
      this.CATS_FILE = path.join(this.dataDir, 'cats.json');
      this.METADATA_FILE = path.join(this.dataDir, 'metadata.json');
      
      // データディレクトリが存在しない場合は作成
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } else {
      // ブラウザ環境：LocalStorageキーを使用
      this.dataDir = '';
      this.DOGS_FILE = 'pawmatch_dogs_data';
      this.CATS_FILE = 'pawmatch_cats_data';
      this.METADATA_FILE = 'pawmatch_data_metadata';
    }
  }

  /**
   * 犬のデータを保存
   */
  async saveDogs(dogs: PetData[], source: string): Promise<void> {
    const storedDogs: StoredPetData[] = dogs.map(dog => ({
      ...dog,
      lastUpdated: new Date().toISOString(),
      source,
      isActive: true
    }));

    if (this.isNode) {
      // Node.js環境：ファイルシステムに保存
      fs.writeFileSync(this.DOGS_FILE, JSON.stringify(storedDogs, null, 2));
    } else {
      // ブラウザ環境：LocalStorageに保存
      localStorage.setItem(this.DOGS_FILE, JSON.stringify(storedDogs));
    }
    
    await this.updateMetadata('dogs', storedDogs.length, source);
  }

  /**
   * 猫のデータを保存
   */
  async saveCats(cats: PetData[], source: string): Promise<void> {
    const storedCats: StoredPetData[] = cats.map(cat => ({
      ...cat,
      lastUpdated: new Date().toISOString(),
      source,
      isActive: true
    }));

    if (this.isNode) {
      // Node.js環境：ファイルシステムに保存
      fs.writeFileSync(this.CATS_FILE, JSON.stringify(storedCats, null, 2));
    } else {
      // ブラウザ環境：LocalStorageに保存
      localStorage.setItem(this.CATS_FILE, JSON.stringify(storedCats));
    }
    
    await this.updateMetadata('cats', storedCats.length, source);
  }

  /**
   * 犬のデータを取得
   */
  async getDogs(): Promise<StoredPetData[]> {
    try {
      console.log('🔍 LocalDataStorage.getDogs() 開始');
      console.log(`🌐 実行環境: ${this.isNode ? 'Node.js' : 'ブラウザ'}`);
      
      if (this.isNode) {
        // Node.js環境：ファイルシステムから読み込み
        console.log(`📁 ファイルパス: ${this.DOGS_FILE}`);
        console.log(`📂 ファイル存在: ${fs.existsSync(this.DOGS_FILE)}`);
        
        if (fs.existsSync(this.DOGS_FILE)) {
          const stored = fs.readFileSync(this.DOGS_FILE, 'utf8');
          const data = JSON.parse(stored);
          console.log(`📦 ファイルから取得したデータ数: ${data.length}`);
          return data;
        }
      } else {
        // ブラウザ環境：LocalStorageから読み込み
        const stored = localStorage.getItem(this.DOGS_FILE);
        console.log(`💾 LocalStorageキー: ${this.DOGS_FILE}`);
        console.log(`📦 LocalStorageデータ存在: ${!!stored}`);
        
        if (stored) {
          const data = JSON.parse(stored);
          console.log(`📦 LocalStorageから取得したデータ数: ${data.length}`);
          return data;
        }
      }
      
      console.log('📭 データが見つかりませんでした（空配列を返却）');
      return [];
    } catch (error) {
      console.error('犬のデータ読み込みエラー:', error);
      return [];
    }
  }

  /**
   * 猫のデータを取得
   */
  async getCats(): Promise<StoredPetData[]> {
    try {
      console.log('🔍 LocalDataStorage.getCats() 開始');
      console.log(`🌐 実行環境: ${this.isNode ? 'Node.js' : 'ブラウザ'}`);
      
      if (this.isNode) {
        // Node.js環境：ファイルシステムから読み込み
        console.log(`📁 ファイルパス: ${this.CATS_FILE}`);
        console.log(`📂 ファイル存在: ${fs.existsSync(this.CATS_FILE)}`);
        
        if (fs.existsSync(this.CATS_FILE)) {
          const stored = fs.readFileSync(this.CATS_FILE, 'utf8');
          const data = JSON.parse(stored);
          console.log(`📦 ファイルから取得したデータ数: ${data.length}`);
          return data;
        }
      } else {
        // ブラウザ環境：LocalStorageから読み込み
        const stored = localStorage.getItem(this.CATS_FILE);
        console.log(`💾 LocalStorageキー: ${this.CATS_FILE}`);
        console.log(`📦 LocalStorageデータ存在: ${!!stored}`);
        
        if (stored) {
          const data = JSON.parse(stored);
          console.log(`📦 LocalStorageから取得したデータ数: ${data.length}`);
          return data;
        }
      }
      
      console.log('📭 データが見つかりませんでした（空配列を返却）');
      return [];
    } catch (error) {
      console.error('猫のデータ読み込みエラー:', error);
      return [];
    }
  }

  /**
   * 全ての動物データを取得
   */
  async getAllAnimals(): Promise<StoredPetData[]> {
    const [dogs, cats] = await Promise.all([
      this.getDogs(),
      this.getCats()
    ]);
    return [...dogs, ...cats];
  }

  /**
   * 特定のIDの動物を取得
   */
  async getAnimalById(id: string): Promise<StoredPetData | null> {
    const allAnimals = await this.getAllAnimals();
    return allAnimals.find(animal => animal.id === id) || null;
  }

  /**
   * データのメタデータを更新
   */
  private async updateMetadata(type: 'dogs' | 'cats', count: number, source: string): Promise<void> {
    try {
      let metadata = {};
      
      if (this.isNode) {
        // Node.js環境：ファイルシステムから読み込み
        if (fs.existsSync(this.METADATA_FILE)) {
          const existing = fs.readFileSync(this.METADATA_FILE, 'utf8');
          metadata = JSON.parse(existing);
        }
      } else {
        // ブラウザ環境：LocalStorageから読み込み
        const existing = localStorage.getItem(this.METADATA_FILE);
        if (existing) {
          metadata = JSON.parse(existing);
        }
      }

      (metadata as any)[type] = {
        count,
        source,
        lastUpdated: new Date().toISOString()
      };

      if (this.isNode) {
        // Node.js環境：ファイルシステムに保存
        fs.writeFileSync(this.METADATA_FILE, JSON.stringify(metadata, null, 2));
      } else {
        // ブラウザ環境：LocalStorageに保存
        localStorage.setItem(this.METADATA_FILE, JSON.stringify(metadata));
      }
    } catch (error) {
      console.error('メタデータ更新エラー:', error);
    }
  }

  /**
   * データのメタデータを取得
   */
  async getMetadata(): Promise<{ lastUpdated?: string; dogCount?: number; catCount?: number; version?: string } | null> {
    try {
      if (this.isNode) {
        // Node.js環境：ファイルシステムから読み込み
        if (fs.existsSync(this.METADATA_FILE)) {
          const stored = fs.readFileSync(this.METADATA_FILE, 'utf8');
          return JSON.parse(stored);
        }
      } else {
        // ブラウザ環境：LocalStorageから読み込み
        const stored = localStorage.getItem(this.METADATA_FILE);
        if (stored) {
          return JSON.parse(stored);
        }
      }
      return {};
    } catch (error) {
      console.error('メタデータ読み込みエラー:', error);
      return {};
    }
  }

  /**
   * データをクリア
   */
  async clearAll(): Promise<void> {
    try {
      if (this.isNode) {
        // Node.js環境：ファイルを削除
        if (fs.existsSync(this.DOGS_FILE)) {
          fs.unlinkSync(this.DOGS_FILE);
        }
        if (fs.existsSync(this.CATS_FILE)) {
          fs.unlinkSync(this.CATS_FILE);
        }
        if (fs.existsSync(this.METADATA_FILE)) {
          fs.unlinkSync(this.METADATA_FILE);
        }
      } else {
        // ブラウザ環境：LocalStorageから削除
        localStorage.removeItem(this.DOGS_FILE);
        localStorage.removeItem(this.CATS_FILE);
        localStorage.removeItem(this.METADATA_FILE);
      }
    } catch (error) {
      console.error('データクリアエラー:', error);
    }
  }

  /**
   * 古いデータを削除（指定した日数より古いデータ）
   */
  async cleanupOldData(daysOld: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const dogs = await this.getDogs();
    const cats = await this.getCats();

    const activeDogs = dogs.filter(dog => 
      new Date(dog.lastUpdated) > cutoffDate
    );
    const activeCats = cats.filter(cat => 
      new Date(cat.lastUpdated) > cutoffDate
    );

    if (activeDogs.length !== dogs.length) {
      if (this.isNode) {
        fs.writeFileSync(this.DOGS_FILE, JSON.stringify(activeDogs, null, 2));
      } else {
        localStorage.setItem(this.DOGS_FILE, JSON.stringify(activeDogs));
      }
    }
    if (activeCats.length !== cats.length) {
      if (this.isNode) {
        fs.writeFileSync(this.CATS_FILE, JSON.stringify(activeCats, null, 2));
      } else {
        localStorage.setItem(this.CATS_FILE, JSON.stringify(activeCats));
      }
    }
  }
}

/**
 * データストレージファクトリー
 */
export class DataStorageFactory {
  static createStorage(db?: D1Database): LocalDataStorage | D1DataStorage {
    if (db) {
      // D1データベースが利用可能な場合
      return new D1DataStorage(db);
    } else {
      // フォールバック：ローカルファイルシステム
      return new LocalDataStorage();
    }
  }

  /**
   * 環境に応じて適切なストレージを作成
   */
  static createStorageFromEnv(env?: CloudflareEnvironment): LocalDataStorage | D1DataStorage {
    console.log('🏭 DataStorageFactory.createStorageFromEnv() 開始');
    console.log('🔍 env パラメータ:', env ? 'あり' : 'なし');
    
    // Cloudflare Workers環境でD1データベースが利用可能な場合
    if (env?.DB && typeof env.DB.prepare === 'function') {
      console.log('🗄️ D1データベースを使用します');
      return new D1DataStorage(env.DB);
    } else {
      console.log('📁 ローカルファイルシステムを使用します');
      console.log('💡 D1データベースを使用するには、env.DBが必要です');
      return new LocalDataStorage();
    }
  }
}

// エクスポートされたインスタンス（開発環境用）
export const dataStorage = DataStorageFactory.createStorage();