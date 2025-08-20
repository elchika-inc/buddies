/**
 * データベース初期化ユーティリティ
 * 開発環境でテーブルが存在しない場合に自動的に作成する
 */
import { Env } from '../types';

export class DatabaseInitializer {
  constructor(private env: Env) {}

  /**
   * 必要なテーブルが存在するかチェックし、なければ作成
   */
  async ensureTablesExist(): Promise<void> {
    try {
      // テーブル存在確認
      const tables = await this.env.DB
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all();
      
      const tableNames = tables.results?.map((t: any) => t.name) || [];
      
      const requiredTables = ['pets', 'crawler_states', 'crawl_logs'];
      const missingTables = requiredTables.filter(table => !tableNames.includes(table));
      
      if (missingTables.length > 0) {
        console.log('Missing tables detected:', missingTables);
        await this.createMissingTables(missingTables);
        console.log('Database tables initialized successfully');
      }
    } catch (error) {
      console.warn('Database initialization check failed:', error);
      // 最初の接続でテーブルが存在しない場合、全て作成
      await this.createAllTables();
    }
  }

  /**
   * 不足しているテーブルを作成
   */
  private async createMissingTables(missingTables: string[]): Promise<void> {
    const createStatements = {
      pets: `
        CREATE TABLE IF NOT EXISTS pets (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          breed TEXT,
          age TEXT,
          gender TEXT,
          prefecture TEXT,
          city TEXT,
          location TEXT,
          description TEXT,
          personality TEXT,
          medical_info TEXT,
          care_requirements TEXT,
          image_url TEXT,
          shelter_name TEXT,
          shelter_contact TEXT,
          source_url TEXT,
          adoption_fee INTEGER DEFAULT 0,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      crawler_states: `
        CREATE TABLE IF NOT EXISTS crawler_states (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_id TEXT NOT NULL,
          pet_type TEXT NOT NULL,
          checkpoint TEXT NOT NULL,
          total_processed INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(source_id, pet_type)
        )
      `,
      crawl_logs: `
        CREATE TABLE IF NOT EXISTS crawl_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_id TEXT NOT NULL,
          pet_type TEXT NOT NULL,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          success BOOLEAN DEFAULT FALSE,
          total_pets INTEGER DEFAULT 0,
          new_pets INTEGER DEFAULT 0,
          updated_pets INTEGER DEFAULT 0,
          errors TEXT
        )
      `
    };

    for (const table of missingTables) {
      if (createStatements[table as keyof typeof createStatements]) {
        await this.env.DB
          .prepare(createStatements[table as keyof typeof createStatements])
          .run();
        console.log(`Created table: ${table}`);
      }
    }
  }

  /**
   * 全テーブルを作成（初回セットアップ用）
   */
  private async createAllTables(): Promise<void> {
    console.log('Creating all required tables...');
    await this.createMissingTables(['pets', 'crawler_states', 'crawl_logs']);
  }

  /**
   * データベース接続テスト
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.env.DB
        .prepare("SELECT 1 as test")
        .first();
      
      return result?.test === 1;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}