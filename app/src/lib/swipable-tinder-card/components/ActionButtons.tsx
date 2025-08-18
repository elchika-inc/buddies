import React from 'react'

interface ActionButtonsProps {
  onAction: (action: 'pass' | 'like' | 'superlike') => void
  disabled?: boolean
}

export function ActionButtons({ onAction, disabled = false }: ActionButtonsProps) {
  return (
    <div className="flex justify-center gap-4">
      <button
        onClick={() => onAction('pass')}
        disabled={disabled}
        className="p-4 rounded-full bg-red-100 hover:bg-red-200 disabled:opacity-50"
      >
        ❌
      </button>
      <button
        onClick={() => onAction('superlike')}
        disabled={disabled}
        className="p-4 rounded-full bg-purple-100 hover:bg-purple-200 disabled:opacity-50"
      >
        ⭐
      </button>
      <button
        onClick={() => onAction('like')}
        disabled={disabled}
        className="p-4 rounded-full bg-green-100 hover:bg-green-200 disabled:opacity-50"
      >
        ❤️
      </button>
    </div>
  )
}