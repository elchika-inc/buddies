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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 sm:p-4 shadow-lg">
      <div className="flex gap-2 sm:justify-center sm:gap-4">
        <button
          onClick={onPass}
          disabled={disabled}
          className={`${colors[theme].pass} text-white flex-1 sm:flex-initial px-4 py-3 sm:px-8 sm:py-4 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base`}
        >
          <span className="text-lg sm:text-xl">❌</span>
          <span className="sm:inline">パス</span>
        </button>
        <button
          onClick={onLike}
          disabled={disabled}
          className={`${colors[theme].like} text-white flex-1 sm:flex-initial px-4 py-3 sm:px-8 sm:py-4 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base`}
        >
          <span className="text-lg sm:text-xl">❤️</span>
          <span className="sm:inline">いいね</span>
        </button>
      </div>
    </div>
  )
}