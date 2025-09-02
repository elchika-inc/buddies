import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

// 環境変数の型定義
type Env = {
  DB: D1Database;
  API_KEYS_CACHE: KVNamespace;
  MASTER_SECRET?: string;
  ALLOWED_ORIGINS?: string;
};

// APIキーの型定義
interface ApiKey {
  id: string;
  key: string;
  name: string;
  type: 'public' | 'internal' | 'admin';
  permissions: string[];
  rate_limit: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
}

// リクエストの検証スキーマ
const validateKeySchema = z.object({
  key: z.string().min(32),
  resource: z.string().optional(),
  action: z.string().optional(),
});

const createKeySchema = z.object({
  name: z.string(),
  type: z.enum(['public', 'internal', 'admin']),
  permissions: z.array(z.string()),
  rate_limit: z.number().default(100),
  expires_in_days: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use('*', async (c, next) => {
  const origin = c.env.ALLOWED_ORIGINS || '*';
  const corsMiddleware = cors({
    origin: origin.split(','),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Master-Secret'],
    credentials: false,
  });
  return corsMiddleware(c, next);
});

// マスターキー認証ミドルウェア
const requireMasterKey = async (c: any, next: any) => {
  const masterSecret = c.req.header('X-Master-Secret');
  const expectedSecret = c.env.MASTER_SECRET;
  
  if (!expectedSecret || masterSecret !== expectedSecret) {
    return c.json({ 
      success: false, 
      error: 'Unauthorized' 
    }, 401);
  }
  
  await next();
};

// ========================================
// Public Endpoints
// ========================================

// APIキーの検証
app.post('/validate', async (c) => {
  try {
    const body = validateKeySchema.parse(await c.req.json());
    
    // KVキャッシュから確認
    const cacheKey = `key:${body.key}`;
    let keyData = await c.env.API_KEYS_CACHE.get(cacheKey, 'json') as ApiKey | null;
    
    // キャッシュされたデータのpermissionsをパース
    if (keyData && typeof keyData.permissions === 'string') {
      keyData.permissions = JSON.parse(keyData.permissions);
    }
    
    // キャッシュにない場合はD1から取得
    if (!keyData) {
      const result = await c.env.DB.prepare(
        'SELECT * FROM api_keys WHERE key = ? AND is_active = 1'
      ).bind(body.key).first() as ApiKey | null;
      
      if (result) {
        // permissionsをパース
        if (typeof result.permissions === 'string') {
          result.permissions = JSON.parse(result.permissions);
        }
        // KVにキャッシュ（1時間）
        await c.env.API_KEYS_CACHE.put(cacheKey, JSON.stringify(result), {
          expirationTtl: 3600
        });
        keyData = result;
      }
    }
    
    if (!keyData) {
      return c.json({ 
        success: false, 
        valid: false,
        error: 'Invalid API key' 
      }, 401);
    }
    
    // 有効期限チェック
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return c.json({ 
        success: false, 
        valid: false,
        error: 'API key expired' 
      }, 401);
    }
    
    // 権限チェック（オプション）
    if (body.resource && body.action) {
      const permission = `${body.resource}:${body.action}`;
      if (!keyData.permissions.includes(permission) && !keyData.permissions.includes('*')) {
        return c.json({ 
          success: false, 
          valid: false,
          error: 'Insufficient permissions' 
        }, 403);
      }
    }
    
    // レート制限チェック（KVを使用）
    const rateLimitKey = `rate:${body.key}:${Math.floor(Date.now() / 60000)}`; // 1分単位
    const currentCount = parseInt(await c.env.API_KEYS_CACHE.get(rateLimitKey) || '0');
    
    if (currentCount >= keyData.rate_limit) {
      return c.json({ 
        success: false, 
        valid: false,
        error: 'Rate limit exceeded',
        retry_after: 60
      }, 429);
    }
    
    // レート制限カウンタを更新
    await c.env.API_KEYS_CACHE.put(rateLimitKey, (currentCount + 1).toString(), {
      expirationTtl: 60
    });
    
    // 最終使用時刻を非同期で更新
    c.env.DB.prepare(
      'UPDATE api_keys SET last_used_at = datetime("now") WHERE id = ?'
    ).bind(keyData.id).run();
    
    return c.json({
      success: true,
      valid: true,
      key_info: {
        name: keyData.name,
        type: keyData.type,
        permissions: keyData.permissions,
        rate_limit: keyData.rate_limit,
        rate_limit_remaining: keyData.rate_limit - currentCount - 1,
        expires_at: keyData.expires_at,
      }
    });
    
  } catch (error) {
    console.error('Validation error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Validation failed' 
    }, 400);
  }
});

// ヘルスチェック
app.get('/health', async (c) => {
  try {
    // D1の接続確認
    await c.env.DB.prepare('SELECT 1').first();
    
    return c.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed'
    }, 503);
  }
});

// ========================================
// Admin Endpoints (要マスターキー)
// ========================================

// APIキーの作成
app.post('/admin/keys', requireMasterKey, async (c) => {
  try {
    const body = createKeySchema.parse(await c.req.json());
    
    // APIキーを生成（crypto.randomUUID()を2つ結合）
    const key = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const id = crypto.randomUUID();
    
    // 有効期限を計算
    let expires_at = null;
    if (body.expires_in_days) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + body.expires_in_days);
      expires_at = expiry.toISOString();
    }
    
    // D1に保存
    await c.env.DB.prepare(`
      INSERT INTO api_keys (
        id, key, name, type, permissions, rate_limit, 
        expires_at, created_at, updated_at, is_active, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1, ?)
    `).bind(
      id,
      key,
      body.name,
      body.type,
      JSON.stringify(body.permissions),
      body.rate_limit,
      expires_at,
      body.metadata ? JSON.stringify(body.metadata) : null
    ).run();
    
    return c.json({
      success: true,
      api_key: {
        id,
        key,
        name: body.name,
        type: body.type,
        permissions: body.permissions,
        rate_limit: body.rate_limit,
        expires_at,
        created_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Create key error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create key' 
    }, 400);
  }
});

// APIキーの一覧取得
app.get('/admin/keys', requireMasterKey, async (c) => {
  try {
    const results = await c.env.DB.prepare(`
      SELECT id, name, type, permissions, rate_limit, expires_at, 
             created_at, last_used_at, is_active
      FROM api_keys
      ORDER BY created_at DESC
    `).all();
    
    const keys = results.results.map((row: any) => ({
      ...row,
      permissions: JSON.parse(row.permissions),
    }));
    
    return c.json({
      success: true,
      keys,
      total: keys.length
    });
    
  } catch (error) {
    console.error('List keys error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to list keys' 
    }, 500);
  }
});

// APIキーの削除（無効化）
app.delete('/admin/keys/:id', requireMasterKey, async (c) => {
  try {
    const id = c.req.param('id');
    
    await c.env.DB.prepare(
      'UPDATE api_keys SET is_active = 0, updated_at = datetime("now") WHERE id = ?'
    ).bind(id).run();
    
    // キャッシュもクリア
    const keyData = await c.env.DB.prepare(
      'SELECT key FROM api_keys WHERE id = ?'
    ).bind(id).first() as { key: string } | null;
    
    if (keyData) {
      await c.env.API_KEYS_CACHE.delete(`key:${keyData.key}`);
    }
    
    return c.json({
      success: true,
      message: 'API key deactivated'
    });
    
  } catch (error) {
    console.error('Delete key error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete key' 
    }, 500);
  }
});

// APIキーのローテーション
app.post('/admin/keys/:id/rotate', requireMasterKey, async (c) => {
  try {
    const id = c.req.param('id');
    
    // 既存のキー情報を取得
    const existing = await c.env.DB.prepare(
      'SELECT * FROM api_keys WHERE id = ? AND is_active = 1'
    ).bind(id).first() as ApiKey | null;
    
    if (!existing) {
      return c.json({ 
        success: false, 
        error: 'Key not found' 
      }, 404);
    }
    
    // 新しいキーを生成
    const newKey = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    
    // 古いキーを無効化し、新しいキーで更新
    await c.env.DB.prepare(
      'UPDATE api_keys SET key = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(newKey, id).run();
    
    // キャッシュをクリア
    await c.env.API_KEYS_CACHE.delete(`key:${existing.key}`);
    
    return c.json({
      success: true,
      new_key: newKey,
      message: 'API key rotated successfully'
    });
    
  } catch (error) {
    console.error('Rotate key error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to rotate key' 
    }, 500);
  }
});

export default app;