/**
 * グローバルエラーハンドリングミドルウェア
 * 
 * @description 全てのエラーを統一的に処理し、一貫したエラーレスポンスを返す
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { 
  PawMatchError, 
  ValidationError, 
  NotFoundError, 
  ServiceUnavailableError 
} from '../utils/error-handler';
import { errorResponse } from '../utils/response-formatter';

/**
 * エラーの詳細情報を取得
 */
interface ErrorDetails {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

/**
 * エラーをErrorDetailsに変換
 */
function getErrorDetails(error: unknown): ErrorDetails {
  // PawMatchError（カスタムエラー）
  if (error instanceof PawMatchError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details
    };
  }

  // HTTPException（Honoのエラー）
  if (error instanceof HTTPException) {
    return {
      status: error.status,
      code: `HTTP_${error.status}`,
      message: error.message
    };
  }

  // 標準エラー
  if (error instanceof Error) {
    // TypeErrorやReferenceErrorなどの判定
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return {
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }

    return {
      status: 500,
      code: 'UNKNOWN_ERROR',
      message: error.message
    };
  }

  // 不明なエラー
  return {
    status: 500,
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred'
  };
}

/**
 * エラーログの出力
 */
function logError(error: unknown, context: Context): void {
  const details = getErrorDetails(error);
  const requestInfo = {
    method: context.req.method,
    url: context.req.url,
    headers: Object.fromEntries(context.req.raw.headers.entries()),
    timestamp: new Date().toISOString()
  };

  // エラーレベルに応じたログ出力
  if (details.status >= 500) {
    console.error('Server Error:', {
      error: details,
      request: requestInfo,
      stack: error instanceof Error ? error.stack : undefined
    });
  } else if (details.status >= 400) {
    console.warn('Client Error:', {
      error: details,
      request: requestInfo
    });
  }
}

/**
 * グローバルエラーハンドリングミドルウェア
 * 
 * @description 全てのルートでエラーをキャッチし、統一的なエラーレスポンスを返す
 */
export async function errorHandlerMiddleware(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    // エラーログの出力
    logError(error, c);

    // エラー詳細の取得
    const details = getErrorDetails(error);

    // エラーレスポンスの生成
    const response = errorResponse(details.message, details.code, details.details);

    // レスポンスヘッダーの設定
    c.header('Content-Type', 'application/json');
    c.header('X-Error-Code', details.code);

    // CORSヘッダーの設定（エラー時も必要）
    const origin = c.env?.ALLOWED_ORIGIN || '*';
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // エラーレスポンスを返す
    return c.json(response, details.status);
  }
}

/**
 * 404エラーハンドラー
 * 
 * @description 定義されていないルートへのアクセスを処理
 */
export function notFoundHandler(c: Context) {
  const response = errorResponse(
    `Route not found: ${c.req.method} ${c.req.path}`,
    'ROUTE_NOT_FOUND'
  );

  return c.json(response, 404);
}

/**
 * メソッド許可エラーハンドラー
 * 
 * @description 許可されていないHTTPメソッドを処理
 */
export function methodNotAllowedHandler(c: Context) {
  const response = errorResponse(
    `Method ${c.req.method} not allowed for ${c.req.path}`,
    'METHOD_NOT_ALLOWED'
  );

  return c.json(response, 405);
}

/**
 * バリデーションエラーハンドラー
 * 
 * @description リクエストバリデーションエラーを統一的に処理
 */
export function validationErrorHandler(errors: unknown[]) {
  const response = errorResponse(
    'Validation failed',
    'VALIDATION_ERROR',
    errors
  );

  return response;
}