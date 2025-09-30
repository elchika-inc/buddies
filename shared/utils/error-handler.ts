/**
 * 統一エラーハンドラー
 *
 * アプリケーション全体で一貫性のあるエラーハンドリングを提供
 * ログ記録、エラー変換、リトライポリシーを統合
 */

import { Result, Ok, Err } from '../types/result'
import { AppError, ErrorCategory, ErrorBuilder } from '../types/error'

/**
 * エラーハンドリングオプション
 */
export interface ErrorHandlingOptions {
  logError?: boolean
  includeStack?: boolean
  maxRetries?: number
  retryDelay?: number
  fallbackValue?: unknown
}

/**
 * リトライポリシー
 */
export interface RetryPolicy {
  maxAttempts: number
  delay: number
  backoffMultiplier?: number
  shouldRetry?: (error: Error, attempt: number) => boolean
}

/**
 * エラーハンドラークラス
 */
export class ErrorHandler {
  private static readonly DEFAULT_RETRY_POLICY: RetryPolicy = {
    maxAttempts: 3,
    delay: 1000,
    backoffMultiplier: 2,
    shouldRetry: (error) => {
      // ネットワークエラーとタイムアウトのみリトライ
      return (
        error.name === 'NetworkError' ||
        error.name === 'AbortError' ||
        error.message.includes('timeout')
      )
    },
  }

  /**
   * 非同期処理をエラーハンドリング付きで実行
   */
  static async handle<T>(
    fn: () => Promise<T>,
    options: ErrorHandlingOptions = {}
  ): Promise<Result<T, AppError>> {
    const {
      logError = true,
      includeStack = false,
      maxRetries = 0,
      retryDelay = 1000,
      fallbackValue,
    } = options

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        await this.delay(retryDelay * attempt)
      }

      try {
        const result = await fn()
        return Ok(result)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (logError) {
          this.logError(lastError, includeStack)
        }

        // リトライ不要なエラーの場合は即座に終了
        if (!this.shouldRetry(lastError, attempt, maxRetries)) {
          break
        }
      }
    }

    const appError = this.toAppError(lastError!)

    // フォールバック値が設定されている場合
    if (fallbackValue !== undefined) {
      return Ok(fallbackValue as T)
    }

    return Err(appError)
  }

  /**
   * リトライポリシー付きで処理を実行
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    policy: Partial<RetryPolicy> = {}
  ): Promise<Result<T, AppError>> {
    const retryPolicy: RetryPolicy = {
      ...this.DEFAULT_RETRY_POLICY,
      ...policy,
    }

    let lastError: Error | null = null
    let delay = retryPolicy.delay

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      if (attempt > 1) {
        await this.delay(delay)
        delay *= retryPolicy.backoffMultiplier || 1
      }

      try {
        const result = await fn()
        return Ok(result)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // カスタムリトライ判定
        if (retryPolicy.shouldRetry && !retryPolicy.shouldRetry(lastError, attempt)) {
          break
        }

        // 最後の試行の場合
        if (attempt === retryPolicy.maxAttempts) {
          break
        }
      }
    }

    return Err(this.toAppError(lastError!))
  }

  /**
   * 複数の処理を並列実行してエラーをまとめる
   */
  static async handleParallel<T>(
    tasks: Array<() => Promise<T>>,
    options: { continueOnError?: boolean } = {}
  ): Promise<Result<T[], AppError>> {
    const { continueOnError = false } = options
    const results: T[] = []
    const errors: Error[] = []

    if (continueOnError) {
      // エラーが発生しても継続
      const promises = tasks.map(async (task) => {
        try {
          const result = await task()
          results.push(result)
        } catch (error) {
          errors.push(error instanceof Error ? error : new Error(String(error)))
        }
      })

      await Promise.all(promises)

      if (errors.length > 0) {
        return Err(
          ErrorBuilder.internal(
            `${errors.length} tasks failed:\n${errors.map((e) => e.message).join('\n')}`
          )
        )
      }
    } else {
      // エラーが発生したら即座に終了
      try {
        const allResults = await Promise.all(tasks.map((task) => task()))
        results.push(...allResults)
      } catch (error) {
        return Err(this.toAppError(error instanceof Error ? error : new Error(String(error))))
      }
    }

    return Ok(results)
  }

  /**
   * エラーをAppErrorに変換
   */
  static toAppError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      // エラーメッセージからカテゴリを推測
      if (error.message.includes('validation')) {
        return ErrorBuilder.validation(error.message)
      }
      if (error.message.includes('not found')) {
        return ErrorBuilder.notFound('Resource')
      }
      if (error.message.includes('database') || error.message.includes('D1')) {
        return ErrorBuilder.database(error.message, error)
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return ErrorBuilder.external('Network', error)
      }

      return ErrorBuilder.internal(error.message, error)
    }

    return ErrorBuilder.internal('An unexpected error occurred')
  }

  /**
   * エラーをログ出力（内部メソッド）
   */
  private static logError(error: Error, includeStack: boolean): void {
    const timestamp = new Date().toISOString()
    const errorInfo = {
      timestamp,
      name: error.name,
      message: error.message,
      ...(includeStack && { stack: error.stack }),
    }

    // Cloudflare Workersではconsole.errorは使用しない
    // 代わりに構造化ログを出力
    if (typeof globalThis !== 'undefined' && 'log' in globalThis) {
      const globalWithLog = globalThis as typeof globalThis & { log: (level: string, info: unknown) => void }
      globalWithLog.log('error', errorInfo)
    }
  }

  /**
   * リトライすべきか判定（内部メソッド）
   */
  private static shouldRetry(error: Error, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) {
      return false
    }

    // 4xxエラーはリトライしない
    if (error.message.includes('4') && error.message.includes('HTTP')) {
      return false
    }

    // ネットワークエラーとタイムアウトはリトライ
    return (
      error.name === 'NetworkError' ||
      error.name === 'AbortError' ||
      error.message.includes('timeout')
    )
  }

  /**
   * 遅延処理（内部メソッド）
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * エラーを安全にシリアライズ
   */
  static serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof AppError && {
          category: error.category,
          code: error.code,
          statusCode: error.statusCode,
          details: error.details,
        }),
      }
    }

    if (typeof error === 'object' && error !== null) {
      try {
        return JSON.parse(JSON.stringify(error))
      } catch {
        return { error: String(error) }
      }
    }

    return { error: String(error) }
  }
}
