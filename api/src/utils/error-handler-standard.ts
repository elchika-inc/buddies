import { Context } from 'hono';
import { Result } from '../types/result';
import { AppConfig } from '../config';

/**
 * カスタムエラークラス
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * よく使うエラーの定義
 */
export const Errors = {
  notFound: (resource: string, id?: string) =>
    new AppError(
      `${resource} not found${id ? `: ${id}` : ''}`,
      'NOT_FOUND',
      404
    ),
  
  unauthorized: (message = AppConfig.errors.unauthorized) =>
    new AppError(message, 'UNAUTHORIZED', 401),
  
  forbidden: (message = 'Access denied') =>
    new AppError(message, 'FORBIDDEN', 403),
  
  badRequest: (message = AppConfig.errors.invalidRequest, details?: any) =>
    new AppError(message, 'BAD_REQUEST', 400, details),
  
  conflict: (message: string) =>
    new AppError(message, 'CONFLICT', 409),
  
  serverError: (message = AppConfig.errors.serverError) =>
    new AppError(message, 'INTERNAL_ERROR', 500),
  
  serviceUnavailable: (message = AppConfig.errors.serviceUnavailable) =>
    new AppError(message, 'SERVICE_UNAVAILABLE', 503),
  
  validationError: (errors: Record<string, string[]>) =>
    new AppError('Validation failed', 'VALIDATION_ERROR', 400, errors)
};

/**
 * エラーハンドリングデコレーター
 */
export function HandleError(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor
) {
  const method = descriptor.value;
  
  descriptor.value = async function(...args: any[]) {
    try {
      return await method.apply(this, args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      console.error(`[${target.constructor.name}.${propertyName}] Unexpected error:`, error);
      throw Errors.serverError();
    }
  };
  
  return descriptor;
}

/**
 * Result型を使用した安全なデータベースクエリ
 */
export async function safeDbQuery<T>(
  query: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await query();
    return Result.ok(data);
  } catch (error) {
    console.error('[Database] Query failed:', error);
    return Result.err(
      error instanceof Error ? error : new Error('Database query failed')
    );
  }
}

/**
 * Result型を使用した安全なAPI呼び出し
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await apiCall();
    return Result.ok(data);
  } catch (error) {
    console.error('[API] Call failed:', error);
    return Result.err(
      error instanceof Error ? error : new Error('API call failed')
    );
  }
}

/**
 * エラーレスポンスの生成
 */
export function errorResponse(c: Context, error: AppError | Error) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  const details = error instanceof AppError ? error.details : undefined;
  
  return c.json({
    success: false,
    error: {
      message: error.message,
      code,
      details
    },
    timestamp: new Date().toISOString()
  }, statusCode);
}

/**
 * 成功レスポンスの生成
 */
export function successResponse<T>(c: Context, data: T, meta?: any) {
  return c.json({
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString()
  });
}