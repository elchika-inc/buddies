import { useCallback, useEffect } from 'react'

interface SuperLikeConfirmModalProps {
  isOpen: boolean
  animalName?: string
  onConfirm: () => void
  onCancel: () => void
}

export function SuperLikeConfirmModal({ 
  isOpen, 
  animalName = 'この子', 
  onConfirm, 
  onCancel 
}: SuperLikeConfirmModalProps) {
  if (!isOpen) return null

  // イベントハンドラをuseCallbackでメモ化
  const handleConfirm = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onConfirm()
  }, [onConfirm])

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onCancel()
  }, [onCancel])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }, [onCancel])

  // タッチイベントの統合ハンドラ
  const handleModalInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }, [])

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    if (!isOpen) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={handleOverlayClick}
      style={{ touchAction: 'none' }}
    >
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
      
      {/* モーダルコンテンツ */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full transform animate-in fade-in zoom-in duration-200"
        onClick={handleModalInteraction}
        onTouchStart={handleModalInteraction}
        onTouchMove={handleModalInteraction}
        onTouchEnd={handleModalInteraction}
        style={{ touchAction: 'none' }}
      >
        <div className="text-center">
          {/* アイコン */}
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">⭐</span>
          </div>
          
          {/* タイトル */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            SUPER LIKE
          </h2>
          
          {/* メッセージ */}
          <p className="text-gray-600 mb-6">
            {animalName}にSUPER LIKEを送りますか？
          </p>
          
          {/* ボタン */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>⭐</span>
              送る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}