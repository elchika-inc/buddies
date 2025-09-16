/**
 * シンプルなResult型パターン
 * エラーハンドリングを型安全に行うための最小限の実装
 */

/**
 * Result型 - 成功または失敗を表現
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E }

/**
 * Result型の基本的なヘルパー関数
 */
export const Result = {
  /**
   * 成功結果を作成
   */
  ok<T>(data: T): Result<T, never> {
    return { success: true, data }
  },

  /**
   * 失敗結果を作成
   */
  err<E = Error>(error: E): Result<never, E> {
    return { success: false, error }
  },

  /**
   * 成功結果かどうかを判定
   */
  isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
    return result.success === true
  },

  /**
   * 失敗結果かどうかを判定
   */
  isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return result.success === false
  },

  /**
   * 成功結果かどうかを判定（isSuccessのエイリアス）
   */
  isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
    return result.success === true
  },

  /**
   * 失敗結果かどうかを判定（isFailureのエイリアス）
   */
  isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return result.success === false
  },

  /**
   * 同期処理をtry-catchでラップ
   */
  tryCatch<T, E = Error>(fn: () => T): Result<T, E> {
    try {
      return Result.ok(fn())
    } catch (error) {
      return Result.err(error as E)
    }
  },

  /**
   * 非同期処理をtry-catchでラップ
   */
  async tryCatchAsync<T, E = Error>(fn: () => Promise<T>): Promise<Result<T, E>> {
    try {
      const data = await fn()
      return Result.ok(data)
    } catch (error) {
      return Result.err(error as E)
    }
  },

  /**
   * Promiseをラップしてエラーハンドリング
   */
  async wrap<T>(promise: Promise<T>): Promise<Result<T>> {
    try {
      const data = await promise
      return Result.ok(data)
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)))
    }
  },

  /**
   * デフォルト値を提供
   */
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.success ? result.data : defaultValue
  },

  /**
   * 値を取り出し（失敗時はエラーを投げる）
   */
  unwrap<T, E>(result: Result<T, E>): T {
    if (result.success) {
      return result.data
    }
    throw result.error
  },
}

// 後方互換性のための型エイリアス
export type Success<T> = { success: true; data: T }
export type Failure<E = Error> = { success: false; error: E }

// 独立した関数としてもエクスポート（後方互換性）
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success
}

export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success
}

// Ok と Err のエイリアスをエクスポート
export const Ok = Result.ok
export const Err = Result.err
