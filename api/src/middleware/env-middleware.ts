import type { Context, Next } from 'hono';
import type { Env } from '../types/env';

/**
 * 環境変数の存在を確認するミドルウェア
 * 環境変数が設定されていない場合は500エラーを返す
 */
export const requireEnv = async (c: Context<{ Bindings: Env }>, next: Next) => {
  if (!c.env) {
    return c.json({ error: 'Environment not configured' }, 500);
  }
  return next();
};

/**
 * 環境変数の型安全なコンテキスト
 */
export type EnvContext = Context<{ Bindings: Env }> & {
  env: Env;
};

/**
 * 環境変数を利用するハンドラーのラッパー関数
 * 環境変数チェックと型安全性を提供する
 */
export const withEnv = (
  handler: (c: EnvContext) => Promise<Response> | Response
) => {
  return async (c: Context<{ Bindings: Env }>) => {
    if (!c.env) {
      return c.json({ 
        success: false,
        error: {
          message: 'Environment not configured',
          code: 'ENV_NOT_CONFIGURED'
        }
      }, 500);
    }
    
    if (!c.env.DB) {
      return c.json({ 
        success: false,
        error: {
          message: 'Database not configured',
          code: 'DB_NOT_CONFIGURED'
        }
      }, 500);
    }
    
    // 型安全なコンテキストとしてハンドラーに渡す
    return handler(c as EnvContext);
  };
};