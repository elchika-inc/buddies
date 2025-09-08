import React from 'react'
import { render, screen } from '@testing-library/react'
import { PetCard } from '../PetCard'
import { Pet } from '@/types/pet'

// モックペットデータ
const mockPet: Pet = {
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

    // PetCardは基本的にカード要素として表示される
    const container = screen.getByRole('generic')
    expect(container).toBeInTheDocument()
  })

  // PetCardは基本情報のみを表示するカードコンポーネント
  // 詳細情報はPetDetailModalで表示される
})
