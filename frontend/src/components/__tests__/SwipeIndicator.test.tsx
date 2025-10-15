import React from 'react'
import { render, screen } from '@testing-library/react'
import { SwipeIndicator } from '../SwipeIndicator'

describe('SwipeIndicator', () => {
  const defaultProps = {
    dragOffset: { x: 0, y: 0 },
    isExiting: false,
    exitDirection: null as 'like' | 'pass' | 'superLike' | null,
    indicatorStyle: {
      like: { opacity: 0, color: '#22c55e' },
      pass: { opacity: 0, color: '#ef4444' },
      superLike: { opacity: 0, color: '#3b82f6' },
    },
    indicatorText: {
      like: 'いいね',
      pass: 'パス',
      superLike: 'めっちゃいいね',
    },
  }

  it('opacityが0の場合は何も表示されない', () => {
    const { container } = render(<SwipeIndicator {...defaultProps} />)

    // すべてのopacityが0なので、何も表示されない
    expect(container.firstChild).toBeNull()
  })

  it('isExitingの場合、exitDirectionのインジケーターを表示', () => {
    render(
      <SwipeIndicator
        {...defaultProps}
        isExiting={true}
        exitDirection="like"
        indicatorStyle={{
          ...defaultProps.indicatorStyle,
          like: { opacity: 1, color: '#22c55e' },
        }}
      />
    )

    expect(screen.getByText('いいね')).toBeInTheDocument()
  })

  it('いいねインジケーターが表示される', () => {
    render(
      <SwipeIndicator
        {...defaultProps}
        indicatorStyle={{
          ...defaultProps.indicatorStyle,
          like: { opacity: 0.8, color: '#22c55e' },
        }}
      />
    )

    const indicator = screen.getByText('いいね')
    expect(indicator).toBeInTheDocument()
  })

  it('めっちゃいいねインジケーターが表示される', () => {
    render(
      <SwipeIndicator
        {...defaultProps}
        isExiting={true}
        exitDirection="superLike"
        indicatorStyle={{
          ...defaultProps.indicatorStyle,
          superLike: { opacity: 1, color: '#3b82f6' },
        }}
      />
    )

    expect(screen.getByText('めっちゃいいね')).toBeInTheDocument()
  })

  it('パスインジケーターが表示される', () => {
    render(
      <SwipeIndicator
        {...defaultProps}
        isExiting={true}
        exitDirection="pass"
        indicatorStyle={{
          ...defaultProps.indicatorStyle,
          pass: { opacity: 1, color: '#ef4444' },
        }}
      />
    )

    expect(screen.getByText('パス')).toBeInTheDocument()
  })

  it('ポインターイベントが無効化されている', () => {
    render(
      <SwipeIndicator
        {...defaultProps}
        isExiting={true}
        exitDirection="like"
        indicatorStyle={{
          ...defaultProps.indicatorStyle,
          like: { opacity: 1, color: '#22c55e' },
        }}
      />
    )

    const container = screen.getByText('いいね').parentElement
    expect(container).toHaveClass('pointer-events-none')
  })

  it('センタリングされた絶対配置である', () => {
    render(
      <SwipeIndicator
        {...defaultProps}
        isExiting={true}
        exitDirection="like"
        indicatorStyle={{
          ...defaultProps.indicatorStyle,
          like: { opacity: 1, color: '#22c55e' },
        }}
      />
    )

    const container = screen.getByText('いいね').parentElement
    expect(container).toHaveClass('absolute', 'inset-0', 'flex', 'items-center', 'justify-center')
  })
})
