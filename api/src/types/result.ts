/**
 * Result型パターン
 * エラーハンドリングを型安全に行うための型定義
 */

/**
 * 成功結果
 */
export interface Success<T> {
  success: true;
  data: T;
}

/**
 * 失敗結果
 */
export interface Failure<E = Error> {
  success: false;
  error: E;
}

/**
 * Result型
 * 成功または失敗を表現する型
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Result型のヘルパー関数
 */
export const Result = {
  /**
   * 成功結果を作成
   */
  ok<T>(data: T): Success<T> {
    return { success: true, data };
  },

  /**
   * 失敗結果を作成
   */
  err<E = Error>(error: E): Failure<E> {
    return { success: false, error };
  },

  /**
   * Result型かどうかを判定
   */
  isResult<T, E>(value: unknown): value is Result<T, E> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'success' in value &&
      typeof (value as any).success === 'boolean'
    );
  },

  /**
   * 成功結果かどうかを判定
   */
  isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
    return result.success === true;
  },

  /**
   * 失敗結果かどうかを判定
   */
  isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
    return result.success === false;
  },

  /**
   * Result型をPromiseでラップ
   */
  async wrap<T>(promise: Promise<T>): Promise<Result<T>> {
    try {
      const data = await promise;
      return Result.ok(data);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  },

  /**
   * 複数のResult型を結合
   */
  combine<T extends readonly Result<any, any>[]>(
    results: T
  ): Result<
    { [K in keyof T]: T[K] extends Result<infer U, any> ? U : never },
    Error
  > {
    const errors: Error[] = [];
    const data: any[] = [];

    for (const result of results) {
      if (Result.isFailure(result)) {
        errors.push(result.error instanceof Error ? result.error : new Error(String(result.error)));
      } else {
        data.push(result.data);
      }
    }

    if (errors.length > 0) {
      return Result.err(new Error(`Multiple errors: ${errors.map(e => e.message).join(', ')}`));
    }

    return Result.ok(data as any);
  },

  /**
   * Result型をマップ
   */
  map<T, U, E>(
    result: Result<T, E>,
    fn: (data: T) => U
  ): Result<U, E> {
    if (Result.isSuccess(result)) {
      return Result.ok(fn(result.data));
    }
    return result;
  },

  /**
   * Result型をフラットマップ
   */
  flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (data: T) => Result<U, E>
  ): Result<U, E> {
    if (Result.isSuccess(result)) {
      return fn(result.data);
    }
    return result;
  },

  /**
   * デフォルト値を提供
   */
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (Result.isSuccess(result)) {
      return result.data;
    }
    return defaultValue;
  }
};