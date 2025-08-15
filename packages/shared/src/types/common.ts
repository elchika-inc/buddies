import { Location } from '../data/locations'

// Base pet type
export interface Pet {
  id: number | string
  name: string
  age: string | number
  breed: string
  weight?: string | number
  location: string
  description: string
  image?: string
  imageUrl?: string
  characteristics?: string[]
  personality?: string[]
  adoptionFee: string | number
  shelterInfo?: {
    name: string
    contact: string
  }
  shelterName?: string
  shelterContact?: string
}

// Swipe direction type
export type SwipeDirection = 'like' | 'pass' | 'super_like'

// Swipe state interface
export interface SwipeState<T extends Pet> {
  currentIndex: number
  likedPets: T[]
  superLikedPets: T[]
  passedPets: T[]
  currentPet: T | null
  nextPet: T | null
  isComplete: boolean
  buttonSwipeDirection: 'like' | 'pass' | null
  handleSwipe: (direction: SwipeDirection, fromButton?: boolean) => void
  processSwipe: (direction: SwipeDirection) => void
  reset: () => void
  removeLike: (petId: number | string) => void
  removeSuperLike: (petId: number | string) => void
}

// Match app props
export interface BaseMatchAppProps<T extends Pet> {
  data: T[]
  theme: 'cat' | 'dog'
  storageKeys: {
    likes: string
    superLikes: string
    passed: string
  }
}
