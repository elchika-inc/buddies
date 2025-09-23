import { useState, useCallback } from 'react'

export interface AdminError {
  type: 'authentication' | 'api' | 'validation' | 'network'
  message: string
  details?: string
  timestamp: Date
}

/**
 * エラーハンドリング用カスタムフック
 */
export function useErrorHandler() {
  const [error, setError] = useState<AdminError | null>(null)

  const handleError = useCallback((error: unknown, type: AdminError['type']) => {
    const adminError: AdminError = {
      type,
      message: error instanceof Error ? error.message : '不明なエラーが発生しました',
      details: error instanceof Error ? error.stack || undefined : String(error),
      timestamp: new Date()
    }

    setError(adminError)

    // ログ出力（本番環境での監視に重要）
    console.error(`[Admin ${type.toUpperCase()}]`, adminError)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    handleError,
    clearError
  }
}