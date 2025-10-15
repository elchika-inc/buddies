import React from 'react'
import { render, screen } from '@testing-library/react'
import { PetCard } from '../PetCard'
import { FrontendPet } from '@/types/pet'

// Next.js Imageコンポーネントをモック
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // Next.js固有のプロパティを除外
    const {
      fill,
      priority,
      quality,
      placeholder,
      blurDataURL,
      sizes,
      unoptimized,
      onLoad,
      onError,
      ...imgProps
    } = props
    return <img {...imgProps} />
  },
}))

// モックペットデータ
const mockPet: FrontendPet = {
  id: 'test-pet-1',
  name: 'テスト太郎',
  breed: 'テスト犬',
  age: 3,
  gender: 'オス',
  location: 'テスト県テスト市',
  description: 'とても優しいテスト犬です',
  imageUrl: '/test-image.jpg',
  localImagePath: '/test-local-image.jpg',
  personality: ['人懐っこい', '元気'],
  healthInfo: '健康状態良好',
  isVaccinated: true,
  isNeutered: true,
  specialNeeds: 'なし',
  goodWith: {
    children: true,
    dogs: true,
    cats: false,
  },
  activityLevel: 'high',
  size: 'medium',
  shelterId: 'test-shelter-1',
  adoptionFee: '30000円',
  availableFrom: '2024-01-01',
}

describe('PetCard', () => {
  it('ペットカードがレンダリングされる', () => {
    render(<PetCard pet={mockPet} />)

    // ペットの名前が表示される
    expect(screen.getByText('テスト太郎')).toBeInTheDocument()
  })

  it('ペットの基本情報が表示される', () => {
    render(<PetCard pet={mockPet} />)

    // 名前
    expect(screen.getByText('テスト太郎')).toBeInTheDocument()

    // 年齢と性別と場所
    expect(screen.getByText(/3歳/)).toBeInTheDocument()
    expect(screen.getByText(/テスト県テスト市/)).toBeInTheDocument()
  })

  it('画像が表示される', () => {
    render(<PetCard pet={mockPet} />)

    // altテキストでペットの名前を含む画像を検索
    const petImage = screen.getByAltText('テスト太郎')
    expect(petImage).toBeInTheDocument()
    expect(petImage).toHaveAttribute('src', '/test-image.jpg')
  })

  // PetCardは基本情報のみを表示するカードコンポーネント
  // 詳細情報はPetDetailModalで表示される
})
