import { Context, Next } from 'hono';
import type { Env } from '../types';

/**
 * API全体の認証ミドルウェア
 * すべてのAPIエンドポイントでシークレットキー認証を必須にする
 */
export async function apiAuth(c: Context<{ Bindings: Env }>, next: Next) {
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
    const expectedKey = c.env.API_SECRET_KEY || c.env.API_ADMIN_SECRET || c.env.API_ADMIN_KEY;
    
    // 環境変数チェック
    if (!expectedKey) {
      console.error('[ApiAuth] No API secret configured');
      return c.json({
        success: false,
        error: 'Service not configured',
        message: 'API authentication is not properly configured'
      }, 503);
    }
    
    // 認証チェック
    const isValidApiKey = apiKey === expectedKey;
    const isValidBearer = authHeader === `Bearer ${expectedKey}`;
    
    if (!isValidApiKey && !isValidBearer) {
      // 認証失敗をログに記録（詳細は記録するが、レスポンスには含めない）
      const clientIP = c.req.header('CF-Connecting-IP') || 
                      c.req.header('X-Forwarded-For')?.split(',')[0] || 
                      'unknown';
      
      console.warn('[ApiAuth] Authentication failed', {
        path: c.req.path,
        method: c.req.method,
        clientIP,
        hasApiKey: !!apiKey,
        hasBearer: !!authHeader,
        userAgent: c.req.header('User-Agent')?.substring(0, 50),
        timestamp: new Date().toISOString()
      });
      
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid API credentials'
      }, 401);
    }
    
    // 認証成功
    await next();
    
  } catch (error) {
    console.error('[ApiAuth] Middleware error:', error);
    return c.json({
      success: false,
      error: 'Internal server error',
      message: 'Authentication service error'
    }, 500);
  }
}

/**
 * 公開APIエンドポイント用の緩い認証
 * オプションでAPIキーを要求（設定されている場合のみ）
 */
export async function optionalApiAuth(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    const expectedKey = c.env.API_SECRET_KEY || c.env.API_ADMIN_SECRET;
    
    // APIキーが設定されていない場合は認証をスキップ
    if (!expectedKey) {
      return next();
    }
    
    // APIキーが設定されている場合は認証を実行
    const apiKey = c.req.header('X-API-Key');
    const authHeader = c.req.header('Authorization');
    
    const isValidApiKey = apiKey === expectedKey;
    const isValidBearer = authHeader === `Bearer ${expectedKey}`;
    
    if (!isValidApiKey && !isValidBearer) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'API key is required for this endpoint'
      }, 401);
    }
    
    await next();
    
  } catch (error) {
    console.error('[OptionalApiAuth] Middleware error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
}