import { getKeyboardHelp } from '@/hooks/useKeyboardSwipe'

interface KeyboardHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardHelpModal({ isOpen, onClose }: KeyboardHelpModalProps) {
  if (!isOpen) return null

  const helpLines = getKeyboardHelp()

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ヘルプモーダル */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 p-6 max-w-md w-11/12 max-h-[80vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="keyboard-help-title"
        aria-describedby="keyboard-help-content"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="keyboard-help-title" className="text-xl font-bold">
            キーボード操作ガイド
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none p-1"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div id="keyboard-help-content" className="space-y-2">
          {helpLines.map((line, index) => {
            if (line === '') {
              return <div key={index} className="h-2" />
            }
            if (line.startsWith('【')) {
              return (
                <div key={index} className="font-semibold text-gray-800 mt-4">
                  {line}
                </div>
              )
            }
            if (line.startsWith('⌨️')) {
              return (
                <div key={index} className="text-lg font-semibold text-blue-600 mb-3">
                  {line}
                </div>
              )
            }
            return (
              <div key={index} className="text-gray-700 font-mono text-sm pl-2">
                {line}
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            ヒント: 「?」キーを押すといつでもこのヘルプを表示できます
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          閉じる
        </button>
      </div>
    </>
  )
}
