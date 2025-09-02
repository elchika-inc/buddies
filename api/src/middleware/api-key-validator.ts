import { Context, Next } from 'hono';
import type { Env } from '../types';

/**
 * APIキー管理サービスと連携した認証ミドルウェア
 * 外部のAPIキー管理サービスでキーを検証する
 */
export async function validateApiKey(c: Context<{ Bindings: Env }>, next: Next) {
  // ヘルスチェックエンドポイントは認証不要
  const publicPaths = [
    '/',
    '/health',
    '/health/ready'
  ];
  
  if (publicPaths.includes(c.req.path)) {
    return next();
  }
  
  // OPTIONSリクエスト（CORS preflight）は認証不要
  if (c.req.method === 'OPTIONS') {
    return next();
  }
  
  try {
    // 認証情報を取得
    const apiKey = c.req.header('X-API-Key');
    const authHeader = c.req.header('Authorization');
    
    // どちらかの形式でキーを取得
    let key: string | undefined;
    if (apiKey) {
      key = apiKey;
    } else if (authHeader?.startsWith('Bearer ')) {
      key = authHeader.substring(7);
    }
    
    // キーが提供されていない場合
    if (!key) {
      console.warn('[ApiKeyValidator] No API key provided', {
        path: c.req.path,
        method: c.req.method,
        timestamp: new Date().toISOString()
      });
      
      // CORSヘッダーを手動で設定
      const origin = c.req.header('Origin');
      const allowedOrigins = [
        'https://pawmatch-dogs.elchika.app',
        'https://pawmatch-cats.elchika.app',
        'http://localhost:3004',
        'http://localhost:3005',
        'http://localhost:3006'
      ];
      
      if (origin && (allowedOrigins.includes(origin) || origin.includes('.pages.dev'))) {
        c.header('Access-Control-Allow-Origin', origin);
      } else {
        c.header('Access-Control-Allow-Origin', '*');
      }
      c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'API key is required'
      }, 401);
    }
    
    // リクエストのパスから必要な権限を決定
    const { resource, action } = determinePermissions(c.req.path, c.req.method);
    
    // APIキー管理サービスでキーを検証
    console.log('[ApiKeyValidator] Validating key with service', {
      keyPrefix: key.substring(0, 8) + '...',
      resource,
      action,
      path: c.req.path
    });
    
    const validationResponse = await fetch('https://pawmatch-api-keys.naoto24kawa.workers.dev/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key,
        resource,
        action
      })
    });
    
    // レスポンスステータスをチェック
    if (!validationResponse.ok) {
      console.error('[ApiKeyValidator] Validation service error', {
        status: validationResponse.status,
        statusText: validationResponse.statusText,
        path: c.req.path,
        keyPrefix: key.substring(0, 8) + '...'
      });
      throw new Error(`Validation service returned ${validationResponse.status}`);
    }
    
    const validation = await validationResponse.json() as {
      success: boolean;
      valid: boolean;
      error?: string;
      key_info?: {
        name: string;
        type: string;
        permissions: string[];
        rate_limit: number;
        rate_limit_remaining: number;
      };
    };
    
    // 検証失敗
    if (!validation.success || !validation.valid) {
      console.warn('[ApiKeyValidator] Invalid API key', {
        path: c.req.path,
        method: c.req.method,
        error: validation.error,
        validation,
        timestamp: new Date().toISOString()
      });
      
      // CORSヘッダーを手動で設定
      const origin = c.req.header('Origin');
      const allowedOrigins = [
        'https://pawmatch-dogs.elchika.app',
        'https://pawmatch-cats.elchika.app',
        'http://localhost:3004',
        'http://localhost:3005',
        'http://localhost:3006'
      ];
      
      if (origin && (allowedOrigins.includes(origin) || origin.includes('.pages.dev'))) {
        c.header('Access-Control-Allow-Origin', origin);
      } else {
        c.header('Access-Control-Allow-Origin', '*');
      }
      c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: validation.error || 'Invalid API key'
      }, 401);
    }
    
    // キー情報をコンテキストに保存（後続の処理で使用可能）
    c.set('apiKeyInfo', validation.key_info);
    
    // 認証成功
    await next();
    
  } catch (error) {
    console.error('[ApiKeyValidator] Middleware error:', error);
    
    // APIキー管理サービスがダウンしている場合はフォールバック
    // 環境変数のキーで直接検証
    const fallbackKeys = [
      c.env.API_SECRET_KEY,
      c.env.API_KEY,
      c.env.PUBLIC_API_KEY,
      'b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb' // Public API Key
    ].filter(Boolean);
    
    if (fallbackKeys.length > 0) {
      const apiKey = c.req.header('X-API-Key');
      const authHeader = c.req.header('Authorization');
      
      let key: string | undefined;
      if (apiKey) {
        key = apiKey;
      } else if (authHeader?.startsWith('Bearer ')) {
        key = authHeader.substring(7);
      }
      
      if (key && fallbackKeys.includes(key)) {
        console.warn('[ApiKeyValidator] Using fallback authentication', {
          path: c.req.path,
          keyPrefix: key.substring(0, 8) + '...'
        });
        return next();
      }
    }
    
    // CORSヘッダーを手動で設定
    c.header('Access-Control-Allow-Origin', c.req.header('Origin') || '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    
    return c.json({
      success: false,
      error: 'Service unavailable',
      message: 'Authentication service is temporarily unavailable'
    }, 503);
  }
}

/**
 * リクエストパスとメソッドから必要な権限を決定
 */
function determinePermissions(path: string, method: string): { resource: string; action: string } {
  // ペット関連のエンドポイント
  if (path.includes('/api/pets') || path.includes('/api/pet')) {
    if (method === 'GET') {
      return { resource: 'pets', action: 'read' };
    } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      return { resource: 'pets', action: 'write' };
    } else if (method === 'DELETE') {
      return { resource: 'pets', action: 'delete' };
    }
  }
  
  // 画像関連のエンドポイント
  if (path.includes('/api/images') || path.includes('/image')) {
    if (method === 'GET') {
      return { resource: 'images', action: 'read' };
    } else if (method === 'POST' || method === 'PUT') {
      return { resource: 'images', action: 'write' };
    }
  }
  
  // 管理エンドポイント
  if (path.includes('/admin')) {
    return { resource: 'admin', action: method === 'GET' ? 'read' : 'write' };
  }
  
  // クロール関連
  if (path.includes('/crawl')) {
    return { resource: 'crawl', action: 'execute' };
  }
  
  // デフォルト（読み取り権限）
  return { resource: 'general', action: 'read' };
}