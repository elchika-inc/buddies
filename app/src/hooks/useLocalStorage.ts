import { useState, useCallback } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // デバッグ用：localStorageを無効化してメモリ内のみで状態管理
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prevValue) => {
      const valueToStore = value instanceof Function ? value(prevValue) : value
      // localStorageへの保存をコメントアウト
      // if (typeof window !== 'undefined') {
      //   window.localStorage.setItem(key, JSON.stringify(valueToStore))
      // }
      return valueToStore
    })
  }, [key])

  return [storedValue, setValue]
}