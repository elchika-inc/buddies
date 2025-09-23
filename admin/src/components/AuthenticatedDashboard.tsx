import React, { useState, useEffect, useCallback } from 'react'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { useToast } from '../hooks/useToast'

interface TableInfo {
  name: string
  displayName: string
  count: number
}

/**
 * 認証済み管理ダッシュボード
 */
export const AuthenticatedDashboard: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)

  // カスタムフックの使用
  const { error, handleError, clearError } = useErrorHandler()
  const { toasts, showToast } = useToast()

  /**
   * データ取得
   */
  const fetchTables = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/tables', {
        credentials: 'include',
      })
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
   * ログアウト処理
   */
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      window.location.href = '/login'
    } catch (err) {
      showToast('ログアウトに失敗しました', 'error')
    }
  }, [showToast])

  /**
   * テーブル詳細へ移動
   */
  const navigateToTable = useCallback((tableName: string) => {
    window.location.href = `/table/${tableName}`
  }, [])

  // 初回データロード
  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">🐾</span>
            PawMatch Admin Dashboard
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