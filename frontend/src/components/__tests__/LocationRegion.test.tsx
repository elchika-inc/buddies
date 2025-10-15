import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationRegion } from '../LocationRegion'

// locationsデータをモック
jest.mock('../../data/locations', () => ({
  locations: {
    東京都: ['渋谷区', '新宿区', '中央区'],
    神奈川県: ['横浜市', '川崎市', '相模原市'],
  },
}))

describe('LocationRegion', () => {
  const defaultProps = {
    region: '関東',
    prefectures: ['東京都', '神奈川県'],
    isExpanded: false,
    isAllSelected: false,
    onToggleRegion: jest.fn(),
    onToggleRegionAll: jest.fn(),
    onToggleLocation: jest.fn(),
    isLocationSelected: jest.fn(() => false),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('地域名を表示する', () => {
    render(<LocationRegion {...defaultProps} />)

    expect(screen.getByText('関東')).toBeInTheDocument()
  })

  it('展開アイコンが正しく表示される', () => {
    render(<LocationRegion {...defaultProps} />)

    expect(screen.getByText('▶')).toBeInTheDocument()
  })

  it('展開時にアイコンが変わる', () => {
    render(<LocationRegion {...defaultProps} isExpanded={true} />)

    expect(screen.getByText('▼')).toBeInTheDocument()
  })

  it('地域チェックボックスをクリックするとコールバックが呼ばれる', () => {
    render(<LocationRegion {...defaultProps} />)

    const checkbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(checkbox)

    expect(defaultProps.onToggleRegionAll).toHaveBeenCalled()
  })

  it('地域名をクリックするとトグルコールバックが呼ばれる', () => {
    render(<LocationRegion {...defaultProps} />)

    const regionButton = screen.getByText('関東')
    fireEvent.click(regionButton)

    expect(defaultProps.onToggleRegion).toHaveBeenCalled()
  })

  it('展開されていない場合は都道府県が表示されない', () => {
    render(<LocationRegion {...defaultProps} isExpanded={false} />)

    expect(screen.queryByText('東京都')).not.toBeInTheDocument()
    expect(screen.queryByText('神奈川県')).not.toBeInTheDocument()
  })

  it('展開されている場合は都道府県が表示される', () => {
    render(<LocationRegion {...defaultProps} isExpanded={true} />)

    expect(screen.getByText('東京都')).toBeInTheDocument()
    expect(screen.getByText('神奈川県')).toBeInTheDocument()
  })

  it('都道府県のチェックボックスをクリックするとコールバックが呼ばれる', () => {
    render(<LocationRegion {...defaultProps} isExpanded={true} />)

    const prefectureCheckboxes = screen.getAllByRole('checkbox')
    // 最初が地域、次が都道府県のチェックボックス
    fireEvent.click(prefectureCheckboxes[1])

    expect(defaultProps.onToggleLocation).toHaveBeenCalledWith({ prefecture: '東京都', city: '' })
  })

  it('選択状態が正しく反映される', () => {
    const props = {
      ...defaultProps,
      isAllSelected: true,
      isLocationSelected: jest.fn((location) => location.prefecture === '東京都'),
    }

    render(<LocationRegion {...props} isExpanded={true} />)

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).toBeChecked() // 地域
    expect(checkboxes[1]).toBeChecked() // 東京都
  })
})
