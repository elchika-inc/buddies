interface SwipeFooterProps {
  onPass: () => void
  onLike: () => void
  disabled?: boolean
  theme?: 'cat' | 'dog'
}

export function SwipeFooter({ onPass, onLike, disabled = false, theme = 'cat' }: SwipeFooterProps) {
  const colors = {
    cat: {
      like: 'bg-pink-500 hover:bg-pink-600',
      pass: 'bg-gray-400 hover:bg-gray-500'
    },
    dog: {
      like: 'bg-blue-500 hover:bg-blue-600', 
      pass: 'bg-gray-400 hover:bg-gray-500'
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
      <div className="flex justify-center gap-4 max-w-md mx-auto">
        <button
          onClick={onPass}
          disabled={disabled}
          className={`${colors[theme].pass} text-white px-8 py-4 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
        >
          <span className="text-xl">❌</span>
          パス
        </button>
        <button
          onClick={onLike}
          disabled={disabled}
          className={`${colors[theme].like} text-white px-8 py-4 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
        >
          <span className="text-xl">❤️</span>
          いいね
        </button>
      </div>
    </div>
  )
}