import { drizzle } from 'drizzle-orm/d1';
import { eq, and, sql } from 'drizzle-orm';
import { apiKeys } from '../../../database/schema/schema';
import { ApiKey, convertDrizzleApiKey, toDrizzleApiKey, ApiKeyType, Permission } from '../types/api-keys-schema';
import { API_CONFIG, isExpired } from '../config/api-keys';

/**
 * APIキー管理サービス
 * 
 * @class ApiKeyService
 * @description APIキーの検証、作成、更新、削除を行うサービス
 * 認証とアクセス制御を統一的に管理
 */
export class ApiKeyService {
  /** Drizzle ORMインスタンス */
  private db;
  
  /**
   * コンストラクタ
   * 
   * @param d1Database - D1データベースインスタンス
   * @param cache - KVキャッシュインスタンス
   */
  constructor(
    private d1Database: D1Database,
    private cache: KVNamespace
  ) {
    this.db = drizzle(this.d1Database);
  }

  /**
   * APIキーを検索して取得
   * 
   * @param key - APIキー文字列
   * @returns 有効なAPIキーオブジェクトまたはnull
   * @description キャッシュファーストの戦略でAPIキーを検索し、
   * 有効かつアクティブなキーのみを返す
   */
  async findValidKey(key: string): Promise<ApiKey | null> {
    // キャッシュから取得を試みる（高速化のため）
    const cacheKey = `key:${key}`;
    const cachedData = await this.cache.get(cacheKey, 'json') as ApiKey | null;
    
    if (cachedData) {
      return cachedData;
    }

    // データベースから取得（キャッシュミスの場合）
    const results = await this.db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.key, key),
          eq(apiKeys.isActive, 1) // アクティブなキーのみ
        )
      )
      .limit(1);
    
    if (results.length === 0) {
      return null;
    }

    const apiKey = convertDrizzleApiKey(results[0]!);

    // キャッシュに保存（次回のアクセス高速化のため）
    await this.cache.put(cacheKey, JSON.stringify(apiKey), {
      expirationTtl: API_CONFIG.CACHE.TTL_SECONDS
    });

    return apiKey;
  }

  /**
   * APIキーの有効期限をチェック
   * 
   * @param apiKey - 検証対象のAPIキー
   * @returns 検証結果（有効性とエラーメッセージ）
   * @description APIキーの有効期限が切れていないかを確認
   */
  validateExpiration(apiKey: ApiKey): { isValid: boolean; error?: string } {
    if (isExpired(apiKey.expiresAt)) {
      return { 
        isValid: false, 
        error: API_CONFIG.ERRORS.EXPIRED_KEY
      };
    }
    return { isValid: true };
  }

  /**
   * 権限をチェック
   * 
   * @param apiKey - 検証対象のAPIキー
   * @param resource - アクセス対象のリソース名
   * @param action - 実行する操作名
   * @returns 権限検証結果
   * @description APIキーが指定されたリソース・操作に対する権限を持つかチェック
   */
  validatePermissions(
    apiKey: ApiKey, 
    resource?: string, 
    action?: string
  ): { isValid: boolean; error?: string; requiredPermission?: string } {
    if (!resource || !action) {
      return { isValid: true };
    }

    const requiredPermission = `${resource}:${action}`;
    const hasPermission = apiKey.permissions.includes(requiredPermission) || 
                         apiKey.permissions.includes('*');
    
    if (!hasPermission) {
      return { 
        isValid: false, 
        error: API_CONFIG.ERRORS.INSUFFICIENT_PERMISSIONS,
        requiredPermission
      };
    }

    return { isValid: true };
  }

  /**
   * 最終使用時刻を更新（非同期）
   * 
   * @param apiKeyId - 更新対象のAPIキーID
   * @description APIキーの使用状況を記録するため最終使用時刻を更新
   * エラーが発生してもメイン処理は継続する
   */
  async updateLastUsed(apiKeyId: string): Promise<void> {
    // エラーが発生しても処理を継続するため、try-catchで囲む
    try {
      await this.db
        .update(apiKeys)
        .set({ 
          lastUsedAt: sql`datetime('now')` 
        })
        .where(eq(apiKeys.id, apiKeyId));
    } catch (error) {
      console.error('Failed to update last_used_at:', error);
    }
  }

  /**
   * APIキーをIDで取得
   * 
   * @param id - APIキーのID
   * @returns APIキーオブジェクトまたはnull
   * @description 指定されたIDのアクティブなAPIキーを取得
   */
  async findById(id: string): Promise<ApiKey | null> {
    const results = await this.db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.id, id),
          eq(apiKeys.isActive, 1)
        )
      )
      .limit(1);
    
    if (results.length === 0) {
      return null;
    }

    return convertDrizzleApiKey(results[0]!);
  }

  /**
   * APIキーの作成
   * 
   * @param params - 作成するAPIキーのパラメータ
   * @description 新しいAPIキーをデータベースに作成
   */
  async create(params: {
    id: string;
    key: string;
    name: string;
    type: ApiKeyType;
    permissions: Permission[];
    rateLimit: number;
    expiresAt?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<void> {
    const insertData = toDrizzleApiKey({
      id: params.id,
      key: params.key,
      name: params.name,
      type: params.type,
      permissions: params.permissions,
      rateLimit: params.rateLimit,
      expiresAt: params.expiresAt || null,
      isActive: true,
      metadata: params.metadata || null,
    });

    await this.db.insert(apiKeys).values(insertData as any);
  }

  /**
   * APIキーの無効化
   * 
   * @param id - 無効化するAPIキーのID
   * @returns 無効化されたAPIキーまたはnull
   * @description 指定されたAPIキーを無効化しキャッシュをクリア
   */
  async deactivate(id: string): Promise<ApiKey | null> {
    // まずキー情報を取得
    const apiKey = await this.findById(id);
    if (!apiKey) {
      return null;
    }

    // 無効化
    await this.db
      .update(apiKeys)
      .set({ 
        isActive: 0,
        updatedAt: sql`datetime('now')`
      })
      .where(eq(apiKeys.id, id));

    // キャッシュをクリア
    await this.cache.delete(`key:${apiKey.key}`);

    return apiKey;
  }

  /**
   * APIキーのローテーション
   * 
   * @param id - ローテーションするAPIキーのID
   * @param newKey - 新しいAPIキー文字列
   * @returns 更新されたAPIキーまたはnull
   * @description セキュリティ上の理由でAPIキーを新しいキーに置き換え
   */
  async rotate(id: string, newKey: string): Promise<ApiKey | null> {
    // 既存のキー情報を取得
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    // キーを更新
    await this.db
      .update(apiKeys)
      .set({ 
        key: newKey,
        updatedAt: sql`datetime('now')`
      })
      .where(eq(apiKeys.id, id));

    // 古いキーのキャッシュをクリア
    await this.cache.delete(`key:${existing.key}`);

    // 更新されたキーを返す
    return {
      ...existing,
      key: newKey,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 全APIキーの一覧取得
   * 
   * @returns APIキーの配列
   * @description すべてのAPIキーを作成日時の降順で取得
   */
  async listAll(): Promise<ApiKey[]> {
    const results = await this.db
      .select()
      .from(apiKeys)
      .orderBy(sql`${apiKeys.createdAt} DESC`);

    return results.map(convertDrizzleApiKey);
  }

  /**
   * キャッシュをクリア
   * 
   * @param key - クリアするAPIキー文字列
   * @description 指定されたAPIキーのKVキャッシュを削除
   */
  async clearCache(key: string): Promise<void> {
    await this.cache.delete(`key:${key}`);
  }

  /**
   * 指定タイプのAPIキー一覧を取得
   * 
   * @param type - 取得するAPIキーのタイプ
   * @returns 指定タイプのAPIキー配列
   * @description public/internal/adminのいずれかのタイプでフィルタリング
   */
  async listByType(type: ApiKeyType): Promise<ApiKey[]> {
    const results = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.type, type))
      .orderBy(sql`${apiKeys.createdAt} DESC`);

    return results.map(convertDrizzleApiKey);
  }

  /**
   * 有効期限切れのAPIキーを取得
   * 
   * @returns 有効期限が切れたAPIキーの配列
   * @description アクティブだが有効期限が切れているAPIキーを一覧取得
   */
  async listExpiredKeys(): Promise<ApiKey[]> {
    const results = await this.db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.isActive, 1),
          sql`${apiKeys.expiresAt} IS NOT NULL AND ${apiKeys.expiresAt} < datetime('now')`
        )
      );

    return results.map(convertDrizzleApiKey);
  }

  /**
   * 統計情報を取得
   * 
   * @returns APIキーの統計情報
   * @description 全体数、タイプ別数、アクティブ数、有効期限切れ数の統計
   */
  async getStatistics(): Promise<{
    total: number;
    byType: Record<ApiKeyType, number>;
    active: number;
    expired: number;
  }> {
    const allKeys = await this.db.select().from(apiKeys);
    
    const stats = {
      total: allKeys.length,
      byType: {
        public: 0,
        internal: 0,
        admin: 0,
      } as Record<ApiKeyType, number>,
      active: 0,
      expired: 0,
    };

    for (const key of allKeys) {
      if (key.type as ApiKeyType in stats.byType) {
        stats.byType[key.type as ApiKeyType]++;
      }
      if (key.isActive === 1) {
        stats.active++;
        if (key.expiresAt && isExpired(key.expiresAt)) {
          stats.expired++;
        }
      }
    }

    return stats;
  }
}