import React, { useState, useEffect, useCallback } from 'react'

interface FieldConfig {
  label: string
  required: boolean
  type?: string
}

interface TableData {
  [key: string]: unknown
}

interface TableDetailProps {
  tableName: string
  adminSecret: string
}

export const TableDetail: React.FC<TableDetailProps> = ({ tableName, adminSecret }) => {
  const [data, setData] = useState<TableData[]>([])
  const [fieldRequirements, setFieldRequirements] = useState<Record<string, FieldConfig>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentEditId, setCurrentEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // APIリクエスト共通処理
  const apiRequest = useCallback(async (url: string, options: RequestInit = {}) => {
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
    const responseData = await response.json() as { error?: string; data?: unknown }

    if (!response.ok) {
      throw new Error(responseData.error || 'リクエストエラー')
    }

    return responseData
  }, [adminSecret])

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiRequest(`/api/records/${tableName}`) as { data: { records: TableData[] } }
      setData(result.data.records || [])
    } catch (err) {
      setError('データの取得に失敗しました')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [tableName, apiRequest])

  // スキーマ取得
  const fetchSchema = useCallback(async () => {
    try {
      const result = await apiRequest(`/api/records/${tableName}/schema`) as { data: { fields: Record<string, FieldConfig> } }
      setFieldRequirements(result.data.fields || {})
    } catch (err) {
      console.error('スキーマ取得エラー:', err)
    }
  }, [tableName, apiRequest])

  // 初期化
  useEffect(() => {
    fetchSchema()
    fetchData()
  }, [fetchSchema, fetchData])

  // トースト表示
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // モーダルを開く
  const openModal = (record?: TableData) => {
    if (record) {
      setCurrentEditId(record['id'])
      setFormData(record)
    } else {
      setCurrentEditId(null)
      setFormData({})
    }
    setIsModalOpen(true)
  }

  // モーダルを閉じる
  const closeModal = () => {
    setIsModalOpen(false)
    setFormData({})
    setCurrentEditId(null)
  }

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (currentEditId) {
        await apiRequest(`/api/records/${tableName}/${currentEditId}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        })
        showToast('更新しました', 'success')
      } else {
        const newData = { ...formData, id: crypto.randomUUID() }
        await apiRequest(`/api/records/${tableName}`, {
          method: 'POST',
          body: JSON.stringify(newData),
        })
        showToast('作成しました', 'success')
      }

      closeModal()
      fetchData()
    } catch (err) {
      showToast('保存に失敗しました', 'error')
      console.error(err)
    }
  }

  // レコード削除
  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return

    try {
      await apiRequest(`/api/records/${tableName}/${id}`, {
        method: 'DELETE',
      })
      showToast('削除しました', 'success')
      fetchData()
    } catch (err) {
      showToast('削除に失敗しました', 'error')
      console.error(err)
    }
  }

  // フィルタリング
  const filteredData = data.filter(row =>
    Object.values(row).some(value =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{tableName} 管理</h1>

        {/* ツールバー */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => openModal()}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
          >
            新規作成
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* テーブル */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-8 text-gray-600">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                読み込み中...
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? '検索結果がありません' : 'データがありません'}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {filteredData[0] && Object.keys(filteredData[0]).map((key) => (
                    <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {fieldRequirements[key]?.label || key}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((row) => (
                  <tr key={row['id']} className="hover:bg-gray-50">
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openModal(row)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(row['id'])}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* モーダル */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentEditId ? '編集' : '新規作成'}
                </h2>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-4 space-y-4">
                  {Object.entries(fieldRequirements)
                    .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
                    .map(([key, config]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {config.label}
                          {config.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                          type="text"
                          value={formData[key] || ''}
                          onChange={(e) => setFormData({ ...formData, [key]: e.currentTarget.value })}
                          required={config.required}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* トースト */}
        {toast && (
          <div className={`fixed top-4 right-4 px-6 py-4 bg-white rounded-lg shadow-lg z-50 border-l-4 ${
            toast.type === 'success' ? 'border-green-500' :
            toast.type === 'error' ? 'border-red-500' :
            'border-blue-500'
          }`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
}