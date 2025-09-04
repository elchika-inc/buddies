import { useState, useCallback, useEffect } from 'react'
import type { StorageError, StorageErrorType, StorageResult } from '@/types/storage'

// エラー分類ヘルパー関数
function categorizeStorageError(error: unknown, operation: 'read' | 'write'): StorageErrorType {
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') {
      return 'QUOTA_EXCEEDED'
    }
    if (error.name === 'SecurityError') {
      return 'ACCESS_DENIED'
    }
  }
  
  if (error instanceof SyntaxError && operation === 'read') {
    return 'PARSE_ERROR'
  }
  
  if (operation === 'write') {
    return 'STRINGIFY_ERROR'
  }
  
  return 'UNKNOWN_ERROR'
}

// StorageErrorを作成するヘルパー関数
function createStorageError(
  type: StorageErrorType, 
  key: string, 
  originalError: unknown,
  customMessage?: string
): StorageError {
  const defaultMessages: Record<StorageErrorType, string> = {
    QUOTA_EXCEEDED: 'LocalStorage quota exceeded',
    PARSE_ERROR: 'Failed to parse stored JSON data',
    STRINGIFY_ERROR: 'Failed to stringify data for storage',
    ACCESS_DENIED: 'Access to LocalStorage denied',
    UNKNOWN_ERROR: 'Unknown storage error occurred'
  }
  
  return {
    type,
    key,
    message: customMessage || defaultMessages[type],
    originalError
  }
}

export function useLocalStorage<T>(
  key: string, 
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, StorageError | null] {
  // SSR対応: 初期状態は常にinitialValueを使用
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [error, setError] = useState<StorageError | null>(null)

  // 安全なJSON.parse
  const safeParse = useCallback((jsonString: string): StorageResult<T> => {
    try {
      const parsed = JSON.parse(jsonString)
      return { success: true, data: parsed }
    } catch (parseError) {
      const storageError = createStorageError(
        categorizeStorageError(parseError, 'read'),
        key,
        parseError
      )
      return { success: false, error: storageError }
    }
  }, [key])

  // 安全なJSON.stringify
  const safeStringify = useCallback((value: T): StorageResult<string> => {
    try {
      const stringified = JSON.stringify(value)
      return { success: true, data: stringified }
    } catch (stringifyError) {
      const storageError = createStorageError(
        categorizeStorageError(stringifyError, 'write'),
        key,
        stringifyError
      )
      return { success: false, error: storageError }
    }
  }, [key])

  // クライアント側でlocalStorageから値を読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        const parseResult = safeParse(item)
        if (parseResult.success && parseResult.data !== undefined) {
          setStoredValue(parseResult.data)
          setError(null)
        } else if (parseResult.error) {
          console.warn(`Error reading localStorage key "${key}":`, parseResult.error)
          setError(parseResult.error)
        }
      }
    } catch (accessError) {
      const storageError = createStorageError(
        categorizeStorageError(accessError, 'read'),
        key,
        accessError
      )
      console.warn(`Error accessing localStorage key "${key}":`, storageError)
      setError(storageError)
    }
  }, [key, safeParse])

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prevValue) => {
      const valueToStore = value instanceof Function ? value(prevValue) : value
      
      // localStorageに保存
      if (typeof window !== 'undefined') {
        const stringifyResult = safeStringify(valueToStore)
        
        if (stringifyResult.success && stringifyResult.data !== undefined) {
          try {
            window.localStorage.setItem(key, stringifyResult.data)
            setError(null) // 成功時はエラーをクリア
          } catch (accessError) {
            const storageError = createStorageError(
              categorizeStorageError(accessError, 'write'),
              key,
              accessError
            )
            console.warn(`Error setting localStorage key "${key}":`, storageError)
            setError(storageError)
          }
        } else if (stringifyResult.error) {
          console.warn(`Error stringifying value for localStorage key "${key}":`, stringifyResult.error)
          setError(stringifyResult.error)
        }
      }
      
      return valueToStore
    })
  }, [key, safeStringify])

  return [storedValue, setValue, error]
}