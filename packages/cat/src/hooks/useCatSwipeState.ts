import { useState } from 'react'
import { Cat } from '@/types/cat'
import { useLocalStorage } from './useLocalStorage'

type SavedSwipeData = {
  likedCats: Cat[]
  superLikedCats: Cat[]
}

export function useCatSwipeState(cats: Cat[]) {
  const [savedData, setSavedData] = useLocalStorage<SavedSwipeData>('pawmatch_cat_likes', {
    likedCats: [],
    superLikedCats: [],
  })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [likedCats, setLikedCats] = useState<Cat[]>(savedData.likedCats)
  const [passedCats, setPassedCats] = useState<Cat[]>([])
  const [superLikedCats, setSuperLikedCats] = useState<Cat[]>(savedData.superLikedCats)
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState<'like' | 'pass' | null>(null)

  const currentCat = cats[currentIndex] || null
  const nextCat = cats[currentIndex + 1] || null
  const remainingCount = cats.length - currentIndex
  const isComplete = currentIndex >= cats.length

  const handleSwipe = (direction: 'like' | 'pass' | 'super_like', fromButton = false) => {
    if (!currentCat || isComplete) return

    if (fromButton && (direction === 'like' || direction === 'pass')) {
      setButtonSwipeDirection(direction)
    } else {
      processSwipe(direction)
    }
  }

  const processSwipe = (direction: 'like' | 'pass' | 'super_like') => {
    if (direction === 'like') {
      const newLikedCats = [...likedCats, currentCat!]
      setLikedCats(newLikedCats)
      setSavedData((prev) => ({
        ...prev,
        likedCats: newLikedCats,
      }))
    } else if (direction === 'super_like') {
      const newSuperLikedCats = [...superLikedCats, currentCat!]
      setSuperLikedCats(newSuperLikedCats)
      setSavedData((prev) => ({
        ...prev,
        superLikedCats: newSuperLikedCats,
      }))
    } else {
      setPassedCats((prev) => [...prev, currentCat!])
    }

    setCurrentIndex((prev) => prev + 1)
    setButtonSwipeDirection(null)
  }

  const reset = () => {
    setCurrentIndex(0)
    setLikedCats([])
    setPassedCats([])
    setSuperLikedCats([])
    setButtonSwipeDirection(null)
  }

  const removeLikedCat = (catId: string) => {
    const newLikedCats = likedCats.filter((cat) => cat.id !== catId)
    setLikedCats(newLikedCats)
    setSavedData((prev) => ({
      ...prev,
      likedCats: newLikedCats,
    }))
  }

  const removeSuperLikedCat = (catId: string) => {
    const newSuperLikedCats = superLikedCats.filter((cat) => cat.id !== catId)
    setSuperLikedCats(newSuperLikedCats)
    setSavedData((prev) => ({
      ...prev,
      superLikedCats: newSuperLikedCats,
    }))
  }

  return {
    currentCat,
    nextCat,
    remainingCount,
    likedCatsCount: likedCats.length,
    superLikedCatsCount: superLikedCats.length,
    likedCats,
    passedCats,
    superLikedCats,
    swipeHistory: [],
    handleSwipe,
    reset,
    removeLikedCat,
    removeSuperLikedCat,
    isComplete,
    buttonSwipeDirection,
  }
}
