/**
 * Result型パターン - エラーハンドリングを型安全に行うための型定義
 */

/**
 * 成功結果の型
 */
export interface SuccessResult<T> {
  success: true;
  data: T;
}

/**
 * エラー結果の型
 */
export interface ErrorResult<E = Error> {
  success: false;
  error: E;
}

/**
 * Result型 - 成功またはエラーを表現する型
 */
export type Result<T, E = Error> = SuccessResult<T> | ErrorResult<E>;

/**
 * 成功結果を作成するヘルパー関数
 */
export function ok<T>(data: T): SuccessResult<T> {
  return {
    success: true,
    data
  };
}

/**
 * エラー結果を作成するヘルパー関数
 */
export function err<E = Error>(error: E): ErrorResult<E> {
  return {
    success: false,
    error
  };
}

/**
 * Result型が成功かどうかをチェックする型ガード
 */
export function isOk<T, E>(result: Result<T, E>): result is SuccessResult<T> {
  return result.success === true;
}

/**
 * Result型がエラーかどうかをチェックする型ガード
 */
export function isErr<T, E>(result: Result<T, E>): result is ErrorResult<E> {
  return result.success === false;
}

/**
 * Result型から値を取り出す（成功時のみ）
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.data;
  }
  throw result.error;
}

/**
 * Result型から値を取り出す（デフォルト値付き）
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Result型をマッピングする
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.data));
  }
  return result;
}

/**
 * Result型のエラーをマッピングする
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Result型をフラットマップする（チェーン処理）
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.data);
  }
  return result;
}

/**
 * 複数のResult型を結合する
 */
export function combine<T extends readonly unknown[], E>(
  results: { [K in keyof T]: Result<T[K], E> }
): Result<T, E> {
  const values: unknown[] = [];
  
  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.data);
  }
  
  return ok(values as T);
}

/**
 * Try-Catchをラップする関数
 */
export function tryCatch<T>(
  fn: () => T
): Result<T, Error> {
  try {
    return ok(fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 非同期処理をラップする関数
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>
): Promise<Result<T, Error>> {
  try {
    const result = await fn();
    return ok(result);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}