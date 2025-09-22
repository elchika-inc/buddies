import { useState, useCallback } from 'react'

interface ApiError {
  error: string
  details?: string
}

/**
 * API通信用カスタムフック
 */
export function useApiRequest<T = unknown>(adminSecret: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    setLoading(true)
    setError(null)

    try {
      const defaultOptions: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': adminSecret,
        },
      }

      const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...(options.headers || {}),
        },
      }

      const response = await fetch(url, mergedOptions)
      const responseData = await response.json() as ApiError | T

      if (!response.ok) {
        const errorData = responseData as ApiError
        throw new Error(errorData.error || 'リクエストエラー')
      }

      return responseData as T
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [adminSecret])

  return {
    request,
    loading,
    error,
    clearError: () => setError(null)
  }
}