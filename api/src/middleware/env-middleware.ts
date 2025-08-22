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
 * 環境変数を利用するハンドラーのラッパー関数
 * 環境変数チェックと型安全性を提供する
 */
export const withEnv = (
  handler: (c: Context<{ Bindings: Env }>) => Promise<Response> | Response
) => {
  return async (c: Context<{ Bindings: Env }>) => {
    if (!c.env) {
      return c.json({ error: 'Environment not configured' }, 500);
    }
    return handler(c);
  };
};