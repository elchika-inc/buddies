/**
 * リトライロジックの共通ユーティリティ
 */

export interface RetryOptions {
  /** 最大リトライ回数 (デフォルト: 3) */
  maxRetries?: number
  /** バックオフ時間の基準値（ミリ秒）(デフォルト: 2000) */
  backoff?: number
  /** エクスポネンシャルバックオフを使用するか (デフォルト: true) */
  exponential?: boolean
  /** リトライ可能なエラーかを判定する関数 */
  shouldRetry?: (error: Error) => boolean
  /** リトライ前に実行するコールバック */
  onRetry?: (error: Error, attempt: number) => void
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
}

/**
 * リトライ付きで非同期関数を実行する
 * @param fn 実行する非同期関数
 * @param options リトライオプション
 * @returns 実行結果
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    backoff = 2000,
    exponential = true,
    shouldRetry = () => true,
    onRetry,
  } = options

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await fn()
      return {
        success: true,
        data,
        attempts: attempt,
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // 最後の試行、またはリトライ不可能なエラーの場合
      if (attempt === maxRetries || !shouldRetry(err)) {
        return {
          success: false,
          error: err,
          attempts: attempt,
        }
      }

      // リトライ前のコールバック
      if (onRetry) {
        onRetry(err, attempt)
      }

      // 待機時間の計算
      const waitTime = exponential ? backoff * attempt : backoff
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  // ここには到達しないはずだが、TypeScriptのために返り値を定義
  return {
    success: false,
    error: new Error('Unexpected end of retry loop'),
    attempts: maxRetries,
  }
}

/**
 * 簡易版リトライユーティリティ（成功するまでリトライ）
 * @param fn 実行する非同期関数
 * @param maxRetries 最大リトライ回数
 * @param backoff バックオフ時間（ミリ秒）
 * @returns 関数の実行結果
 * @throws 最後のエラーをスロー
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  backoff = 2000
): Promise<T> {
  const result = await withRetry(fn, { maxRetries, backoff })
  if (result.success) {
    return result.data as T
  }
  throw result.error
}

/**
 * 特定のHTTPステータスコードでリトライする
 */
export function createHttpRetryStrategy(
  retryableCodes: number[] = [429, 500, 502, 503, 504]
): (error: Error) => boolean {
  return (error: Error) => {
    // HTTPエラーの場合、ステータスコードをチェック
    if ('status' in error && typeof error.status === 'number') {
      return retryableCodes.includes(error.status)
    }
    // ネットワークエラーの場合はリトライ
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return true
    }
    return false
  }
}