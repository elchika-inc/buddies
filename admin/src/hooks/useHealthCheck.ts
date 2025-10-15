/**
 * ヘルスチェック用カスタムフック
 */

import { useState, useEffect, useCallback } from 'react'
import type { AllServicesHealth } from '../types/health'

/**
 * 自動リフレッシュ間隔（ミリ秒）
 */
const REFRESH_INTERVAL = 60000 // 60秒

/**
 * ヘルスチェック結果の型
 */
interface HealthCheckResult {
  /** ヘルスチェックデータ */
  health: AllServicesHealth | null
  /** ローディング中かどうか */
  loading: boolean
  /** エラーメッセージ */
  error: string | null
  /** 手動リフレッシュ関数 */
  refresh: () => Promise<void>
}

/**
 * ヘルスチェック用カスタムフック
 * 60秒ごとに自動的にヘルスチェックを実行します
 */
export function useHealthCheck(): HealthCheckResult {
  const [health, setHealth] = useState<AllServicesHealth | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * ヘルスチェックデータを取得
   */
  const fetchHealthCheck = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/health/check')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json() as {
        success: boolean
        data?: AllServicesHealth
        message?: string
      }

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch health check')
      }

      if (result.data) {
        setHealth(result.data)
      }
    } catch (err) {
      console.error('Health check error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 手動リフレッシュ
   */
  const refresh = useCallback(async () => {
    await fetchHealthCheck()
  }, [fetchHealthCheck])

  /**
   * 初回ロードと自動リフレッシュ
   */
  useEffect(() => {
    // 初回ロード
    fetchHealthCheck()

    // 60秒ごとに自動リフレッシュ
    const intervalId = setInterval(() => {
      fetchHealthCheck()
    }, REFRESH_INTERVAL)

    // クリーンアップ
    return () => {
      clearInterval(intervalId)
    }
  }, [fetchHealthCheck])

  return {
    health,
    loading,
    error,
    refresh,
  }
}
