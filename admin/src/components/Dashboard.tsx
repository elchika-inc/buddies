import React, { useState, useEffect, useCallback } from 'react'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { useToast } from '../hooks/useToast'
import { useHealthCheck } from '../hooks/useHealthCheck'
import type { ServiceStatus } from '../types/health'

interface TableInfo {
  name: string
  displayName: string
  count: number
}

/**
 * 管理ダッシュボード
 */
export const Dashboard: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)

  // カスタムフックの使用
  const { error, handleError, clearError } = useErrorHandler()
  const { toasts, showToast } = useToast()
  const { health, loading: healthLoading, error: healthError } = useHealthCheck()

  /**
   * データ取得
   */
  const fetchTables = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/tables')
      if (!response.ok) {
        throw new Error('データの取得に失敗しました')
      }
      const result = await response.json() as { tables: TableInfo[] }
      setTables(result.tables || [])
    } catch (err) {
      handleError(err, 'api')
      showToast('データ取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }, [handleError, showToast])

  /**
   * データ更新
   */
  const refreshData = useCallback(async () => {
    await fetchTables()
    showToast('データを更新しました', 'info')
  }, [fetchTables, showToast])

  /**
   * ログアウト処理（Basic認証の場合はブラウザを閉じる必要がある）
   */
  const handleLogout = useCallback(() => {
    // Basic認証ではブラウザキャッシュをクリアできないため、
    // ユーザーにブラウザを閉じるよう案内
    alert('ログアウトするにはブラウザを閉じてください')
  }, [])

  /**
   * テーブル詳細へ移動
   */
  const navigateToTable = useCallback((tableName: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/table/${tableName}`
    }
  }, [])

  // 初回データロード
  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  /**
   * ステータスに応じたアイコンを取得
   */
  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case 'healthy':
        return '✅'
      case 'unhealthy':
        return '❌'
      case 'skipped':
        return '⚠️'
      default:
        return '❓'
    }
  }

  /**
   * ステータスに応じた背景色を取得
   */
  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200'
      case 'unhealthy':
        return 'bg-red-50 border-red-200'
      case 'skipped':
        return 'bg-gray-50 border-gray-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  // セッション認証されていればダッシュボードが表示される

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">🐾</span>
            Buddies Admin Dashboard
          </h1>
          <div className="flex gap-2">
            <button
              onClick={refreshData}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200 disabled:opacity-50"
            >
              {loading ? '更新中...' : 'データ更新'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-200"
            >
              ログアウト
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <strong>{error.type === 'api' ? 'API' : '認証'}エラー:</strong> {error.message}
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ヘルスチェックセクション */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">サービスヘルスステータス</h2>

          {healthError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              ヘルスチェックエラー: {healthError}
            </div>
          )}

          {healthLoading && !health ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                ヘルスチェック中...
              </div>
            </div>
          ) : health ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Workers ヘルスステータス */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Workers</h3>
                <div className="space-y-2">
                  {health.workers.map((worker) => (
                    <div
                      key={worker.name}
                      className={`p-3 rounded-lg border ${getStatusColor(worker.status)}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {getStatusIcon(worker.status)} {worker.name}
                        </span>
                        {worker.responseTime !== undefined && (
                          <span className="text-sm text-gray-600">
                            {worker.responseTime}ms
                          </span>
                        )}
                      </div>
                      {worker.error && (
                        <div className="mt-1 text-xs text-gray-600">
                          {worker.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pages ヘルスステータス */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Pages</h3>
                <div className="space-y-2">
                  {health.pages.map((page) => (
                    <div
                      key={page.name}
                      className={`p-3 rounded-lg border ${getStatusColor(page.status)}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {getStatusIcon(page.status)} {page.name}
                        </span>
                        {page.responseTime !== undefined && (
                          <span className="text-sm text-gray-600">
                            {page.responseTime}ms
                          </span>
                        )}
                      </div>
                      {page.error && (
                        <div className="mt-1 text-xs text-gray-600">
                          {page.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {health && (
            <div className="mt-4 text-sm text-gray-600 text-center">
              サマリー: {health.summary.healthy}件正常 / {health.summary.unhealthy}件異常 / {health.summary.skipped}件スキップ
              （自動更新: 60秒間隔）
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">データベーステーブル</h2>

          {loading && tables.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                読み込み中...
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map((table) => (
                <div
                  key={table.name}
                  onClick={() => navigateToTable(table.name)}
                  className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer"
                >
                  <div className="text-lg font-semibold text-gray-800 mb-2">
                    {table.displayName || table.name}
                  </div>
                  <div className="text-gray-600">
                    {table.count.toLocaleString()} レコード
                  </div>
                </div>
              ))}
            </div>
          )}

          {tables.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">テーブルが見つかりません</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast通知 */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-4 bg-white rounded-lg shadow-lg border-l-4 animate-slide-in ${
              toast.type === 'success' ? 'border-green-500' :
              toast.type === 'error' ? 'border-red-500' :
              'border-blue-500'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}