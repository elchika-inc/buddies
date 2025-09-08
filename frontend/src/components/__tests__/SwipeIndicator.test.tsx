import React from 'react'
import { render, screen } from '@testing-library/react'
import { SwipeIndicator } from '../SwipeIndicator'

describe('SwipeIndicator', () => {
  const defaultProps = {
    dragOffset: { x: 0, y: 0 },
    isExiting: false,
    exitDirection: null,
    indicatorStyle: 'test-style',
    indicatorText: 'テストテキスト',
  }

  it('指定されたテキストを表示する', () => {
    render(<SwipeIndicator {...defaultProps} />)

    expect(screen.getByText('テストテキスト')).toBeInTheDocument()
  })

  it('指定されたスタイルクラスが適用される', () => {
    render(<SwipeIndicator {...defaultProps} />)

    const indicator = screen.getByText('テストテキスト')
    expect(indicator).toHaveClass('test-style')
  })

  it('ポインターイベントが無効化されている', () => {
    render(<SwipeIndicator {...defaultProps} />)

    const container = screen.getByText('テストテキスト').parentElement
    expect(container).toHaveClass('pointer-events-none')
  })

  it('センタリングされた絶対配置である', () => {
    render(<SwipeIndicator {...defaultProps} />)

    const container = screen.getByText('テストテキスト').parentElement
    expect(container).toHaveClass('absolute', 'inset-0', 'flex', 'items-center', 'justify-center')
  })

  it('いいねテキストの場合', () => {
    render(
      <SwipeIndicator
        {...defaultProps}
        indicatorText="いいね"
        indicatorStyle="px-6 py-3 bg-green-500/80 text-white"
      />
    )

    expect(screen.getByText('いいね')).toBeInTheDocument()
  })

  it('めっちゃいいねテキストの場合', () => {
    render(
      <SwipeIndicator
        {...defaultProps}
        indicatorText="めっちゃいいね"
        indicatorStyle="px-6 py-3 bg-blue-500/80 text-white"
      />
    )

    expect(screen.getByText('めっちゃいいね')).toBeInTheDocument()
  })

  it('パステキストの場合', () => {
    render(
      <SwipeIndicator
        {...defaultProps}
        indicatorText="パス"
        indicatorStyle="px-6 py-3 bg-red-500/80 text-white"
      />
    )

    expect(screen.getByText('パス')).toBeInTheDocument()
  })
})
