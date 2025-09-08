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
    expandedPrefectures: [],
    onToggleRegion: jest.fn(),
    onToggleRegionAll: jest.fn(),
    onTogglePrefecture: jest.fn(),
    onTogglePrefectureAll: jest.fn(),
    onToggleLocation: jest.fn(),
    isLocationSelected: jest.fn(() => false),
    isPrefectureAllSelected: jest.fn(() => false),
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
    fireEvent.change(checkbox)

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

  it('都道府県をクリックするとコールバックが呼ばれる', () => {
    render(<LocationRegion {...defaultProps} isExpanded={true} />)

    const prefectureButton = screen.getByText('東京都')
    fireEvent.click(prefectureButton)

    expect(defaultProps.onTogglePrefecture).toHaveBeenCalledWith('東京都')
  })

  it('都道府県のチェックボックスをクリックするとコールバックが呼ばれる', () => {
    render(<LocationRegion {...defaultProps} isExpanded={true} />)

    const prefectureCheckboxes = screen.getAllByRole('checkbox')
    // 最初が地域、次が都道府県のチェックボックス
    fireEvent.click(prefectureCheckboxes[1])

    expect(defaultProps.onTogglePrefectureAll).toHaveBeenCalledWith('東京都')
  })

  it('都道府県が展開されている場合は市区町村が表示される', () => {
    render(<LocationRegion {...defaultProps} isExpanded={true} expandedPrefectures={['東京都']} />)

    expect(screen.getByText('すべて')).toBeInTheDocument()
    expect(screen.getByText('渋谷区')).toBeInTheDocument()
    expect(screen.getByText('新宿区')).toBeInTheDocument()
    expect(screen.getByText('中央区')).toBeInTheDocument()
  })

  it('市区町村をクリックするとコールバックが呼ばれる', () => {
    render(<LocationRegion {...defaultProps} isExpanded={true} expandedPrefectures={['東京都']} />)

    const cityCheckbox = screen.getByLabelText('渋谷区')
    fireEvent.change(cityCheckbox)

    expect(defaultProps.onToggleLocation).toHaveBeenCalled()
  })

  it('選択状態が正しく反映される', () => {
    const props = {
      ...defaultProps,
      isAllSelected: true,
      isPrefectureAllSelected: jest.fn((prefecture) => prefecture === '東京都'),
      isLocationSelected: jest.fn((location) => location.city === '渋谷区'),
    }

    render(<LocationRegion {...props} isExpanded={true} expandedPrefectures={['東京都']} />)

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).toBeChecked() // 地域
    expect(checkboxes[1]).toBeChecked() // 東京都
    expect(checkboxes[3]).toBeChecked() // 渋谷区
  })
})
