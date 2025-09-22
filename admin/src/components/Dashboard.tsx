import React, { useState, useEffect } from 'react'

interface TableInfo {
  name: string
  count: number
}

export const Dashboard: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [adminSecret, setAdminSecret] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // ローカルストレージから認証情報を取得
    if (typeof window !== 'undefined') {
      const storedSecret = window.localStorage.getItem('adminSecret')
      if (storedSecret) {
        setAdminSecret(storedSecret)
        setIsAuthenticated(true)
        loadTables(storedSecret)
      }
    }
  }, [])

  const handleAuth = async () => {
    if (!adminSecret) {
      setError('パスワードを入力してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/tables', {
        headers: {
          'X-Admin-Secret': adminSecret,
        },
      })

      if (response.ok) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('adminSecret', adminSecret)
        }
        setIsAuthenticated(true)
        await loadTables(adminSecret)
      } else {
        setError('認証失敗：シークレットが正しくありません')
      }
    } catch (err) {
      setError('エラーが発生しました')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadTables = async (secret: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/tables', {
        headers: {
          'X-Admin-Secret': secret,
        },
      })

      if (!response.ok) {
        throw new Error('テーブル情報の取得に失敗しました')
      }

      const data = await response.json() as { tables?: TableInfo[] }
      setTables(data.tables || [])
    } catch (err) {
      setError('テーブルの読み込みに失敗しました')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('adminSecret')
    }
    setAdminSecret('')
    setIsAuthenticated(false)
    setTables([])
  }

  const navigateToTable = (tableName: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/table/${tableName}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
          <span className="mr-3">🐾</span>
          PawMatch Admin Dashboard
        </h1>

        {!isAuthenticated ? (
          <div className="space-y-4">
            <div>
              <input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.currentTarget.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                placeholder="管理者シークレットを入力"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition duration-200"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '認証中...' : '認証'}
            </button>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">データベーステーブル</h2>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-200"
              >
                ログアウト
              </button>
            </div>

            {loading ? (
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
                      {table.name}
                    </div>
                    <div className="text-gray-600">
                      {table.count} レコード
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}