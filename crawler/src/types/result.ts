/**
 * Result型パターン
 * エラーハンドリングを型安全に行うための型定義
 */

/**
 * 成功/失敗を表現する Result 型
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * 非同期 Result 型
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Result型のヘルパー関数
 */
export const Result = {
  /**
   * 成功結果を作成
   */
  ok<T>(data: T): Result<T, never> {
    return { success: true, data };
  },

  /**
   * 失敗結果を作成
   */
  err<E = Error>(error: E): Result<never, E> {
    return { success: false, error };
  },

  /**
   * Result型かどうかを判定
   */
  isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
    return result.success === true;
  },

  /**
   * Result型かどうかを判定
   */
  isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return result.success === false;
  },

  /**
   * Result型から値を取得（エラーの場合は例外をスロー）
   */
  unwrap<T, E>(result: Result<T, E>): T {
    if (result.success) {
      return result.data;
    }
    throw (result as { success: false; error: E }).error;
  },

  /**
   * Result型から値を取得（エラーの場合はデフォルト値を返す）
   */
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (result.success) {
      return result.data;
    }
    return defaultValue;
  },

  /**
   * Result型をマップ
   */
  map<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => U
  ): Result<U, E> {
    if (result.success) {
      return Result.ok(fn(result.data));
    }
    return result as Result<U, E>;
  },

  /**
   * Result型をフラットマップ
   */
  flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>
  ): Result<U, E> {
    if (result.success) {
      return fn(result.data);
    }
    return result as Result<U, E>;
  },

  /**
   * エラーをマップ
   */
  mapErr<T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => F
  ): Result<T, F> {
    if (!result.success) {
      return Result.err(fn((result as { success: false; error: E }).error));
    }
    return result as Result<T, F>;
  },

  /**
   * try-catch を Result型でラップ
   */
  async tryCatch<T>(
    fn: () => Promise<T> | T,
    errorTransform?: (error: unknown) => Error
  ): Promise<Result<T, Error>> {
    try {
      const data = await fn();
      return Result.ok(data);
    } catch (error) {
      const err = errorTransform 
        ? errorTransform(error)
        : error instanceof Error 
          ? error 
          : new Error(String(error));
      return Result.err(err);
    }
  },

  /**
   * 複数のResult型を集約
   */
  all<T, E>(results: Result<T, E>[]): Result<T[], E> {
    const data: T[] = [];
    
    for (const result of results) {
      if (!result.success) {
        return result as Result<T[], E>;
      }
      data.push(result.data);
    }
    
    return Result.ok(data);
  },

  /**
   * 複数のResult型を集約（エラーも収集）
   */
  allSettled<T, E>(
    results: Result<T, E>[]
  ): { successes: T[]; errors: E[] } {
    const successes: T[] = [];
    const errors: E[] = [];
    
    for (const result of results) {
      if (result.success) {
        successes.push(result.data);
      } else {
        errors.push((result as { success: false; error: E }).error);
      }
    }
    
    return { successes, errors };
  },
};

/**
 * カスタムエラー型
 */
export class CrawlerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CrawlerError';
  }
}

export class ParseError extends CrawlerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'PARSE_ERROR', context);
    this.name = 'ParseError';
  }
}

export class NetworkError extends CrawlerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

export class DatabaseError extends CrawlerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', context);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends CrawlerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}