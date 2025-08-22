/**
 * メタデータ管理サービス
 * 
 * sync_metadataテーブルのキー/バリューペアの管理に特化
 */

import type { D1Database } from '@cloudflare/workers-types';

export class MetadataService {
  constructor(private readonly db: D1Database) {}

  /**
   * メタデータ値を取得
   */
  async getMetadata(key: string, defaultValue: string | null = null): Promise<string | null> {
    const result = await this.db
      .prepare('SELECT value FROM sync_metadata WHERE key = ?')
      .bind(key)
      .first<{ value: string }>();
    
    return result?.value || defaultValue;
  }

  /**
   * メタデータ値を設定
   */
  async setMetadata(key: string, value: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO sync_metadata (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).bind(key, value.toString()).run();
  }

  /**
   * 複数のメタデータを一括更新
   */
  async setMultipleMetadata(entries: [string, string][]): Promise<void> {
    for (const [key, value] of entries) {
      await this.setMetadata(key, value);
    }
  }

  /**
   * 設定値を取得（数値）
   */
  async getNumberMetadata(key: string, defaultValue: number): Promise<number> {
    const value = await this.getMetadata(key, defaultValue.toString());
    return parseInt(value || defaultValue.toString());
  }

  /**
   * 設定値を取得（真偽値）
   */
  async getBooleanMetadata(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.getMetadata(key, defaultValue.toString());
    return value === 'true';
  }

  /**
   * 全メタデータを取得
   */
  async getAllMetadata(): Promise<Record<string, string>> {
    const results = await this.db
      .prepare('SELECT key, value FROM sync_metadata')
      .all<{ key: string; value: string }>();
    
    const metadata: Record<string, string> = {};
    for (const row of results.results || []) {
      metadata[row.key] = row.value;
    }
    return metadata;
  }

  /**
   * メタデータを削除
   */
  async deleteMetadata(key: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM sync_metadata WHERE key = ?')
      .bind(key)
      .run();
  }
}