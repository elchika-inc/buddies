/**
 * リトライハンドラー
 * エラーが発生した場合の再試行ロジックを提供
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (error: any) => boolean;
}

export class RetryHandler {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    retryableErrors: (error) => {
      // デフォルトでネットワークエラーをリトライ対象とする
      return error?.message?.includes('fetch failed') ||
             error?.message?.includes('network') ||
             error?.code === 'ETIMEDOUT' ||
             error?.code === 'ECONNREFUSED' ||
             error?.code === 'ENOTFOUND';
    }
  };

  /**
   * リトライ付きで関数を実行
   */
  static async execute<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    let lastError: any;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // 最後の試行、またはリトライ対象外のエラーの場合は即座に失敗
        if (attempt === finalConfig.maxAttempts || 
            !finalConfig.retryableErrors?.(error)) {
          throw error;
        }

        // 指数バックオフで待機
        const delay = finalConfig.delayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, {
          error: error.message,
          attempt,
          maxAttempts: finalConfig.maxAttempts
        });
        
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * HTTPリクエスト用のリトライ設定
   */
  static getHttpRetryConfig(): RetryConfig {
    return {
      maxAttempts: 3,
      delayMs: 2000,
      backoffMultiplier: 2,
      retryableErrors: (error) => {
        // HTTP関連のエラーをリトライ対象とする
        const message = error?.message?.toLowerCase() || '';
        const status = error?.status;
        
        return (
          // ネットワークエラー
          message.includes('fetch failed') ||
          message.includes('network') ||
          message.includes('timeout') ||
          message.includes('connection') ||
          
          // 一時的なHTTPエラー
          status === 429 || // Too Many Requests
          status === 502 || // Bad Gateway
          status === 503 || // Service Unavailable
          status === 504 || // Gateway Timeout
          
          // サーバーエラー（5xx）で一時的な可能性があるもの
          (status >= 500 && status < 600)
        );
      }
    };
  }

  /**
   * データベース操作用のリトライ設定
   */
  static getDatabaseRetryConfig(): RetryConfig {
    return {
      maxAttempts: 2,
      delayMs: 500,
      backoffMultiplier: 2,
      retryableErrors: (error) => {
        const message = error?.message?.toLowerCase() || '';
        
        return (
          message.includes('database is locked') ||
          message.includes('busy') ||
          message.includes('timeout') ||
          message.includes('connection')
        );
      }
    };
  }

  /**
   * スリープ関数
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}