'use client'

import { useState, useMemo, useEffect } from 'react'
import { PetSwipeCard } from './PetSwipeCard'
import { SwipeFooter } from './SwipeFooter'
import { MatchHeader } from './MatchHeader'
import { LocationModal, Location } from './LocationModal'
import { Pet } from '@/types/pet'
import { usePetSwipeState } from '@/hooks/usePetSwipeState'
import { loadPetData } from '@/data/petDataLoader'
import { getCurrentPetConfig, getPetType } from '@/config/petConfig'

export function PetMatchApp() {
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([])
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [allPets, setAllPets] = useState<Pet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const config = getCurrentPetConfig()
  const petType = getPetType()

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const pets = await loadPetData()
      setAllPets(pets)
      setIsLoading(false)
    }
    loadData()
  }, [])

  const filteredPets = useMemo(() => {
    if (selectedLocations.length === 0) {
      return allPets
    }

    return allPets.filter((pet) =>
      selectedLocations.some((location) => {
        if (location.city === 'すべて') {
          return pet.location.includes(location.prefecture)
        }
        return pet.location.includes(location.prefecture) && pet.location.includes(location.city)
      })
    )
  }, [selectedLocations, allPets])

  const swipeState = usePetSwipeState(filteredPets)

  // 次のペットを取得
  const nextPet = swipeState.remainingPets[1] || null

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${
      petType === 'dog' 
        ? 'from-orange-50 to-yellow-50' 
        : 'from-purple-50 to-pink-50'
    }`}>
      <MatchHeader
        likedPets={swipeState.likedPets}
        superLikedPets={swipeState.superLikedPets}
        onRemoveLike={(petId) => {
          // TODO: Implement remove like functionality
        }}
        onRemoveSuperLike={(petId) => {
          // TODO: Implement remove super like functionality
        }}
        onLocationClick={() => setShowLocationModal(true)}
        selectedLocations={selectedLocations}
        petType={petType}
      />
      <div className="container mx-auto px-4 py-8 pb-20">
        <div
          className="flex justify-center relative"
          style={{
            height: 'calc(100vh - 280px)',
            minHeight: '320px',
            maxHeight: '70vh',
          }}
        >
          {nextPet && (
            <PetSwipeCard
              key={`next-${nextPet.id}`}
              pet={nextPet}
              onSwipe={() => {}}
              isTopCard={false}
            />
          )}
          {swipeState.currentPet && (
            <PetSwipeCard
              key={`current-${swipeState.currentPet.id}`}
              pet={swipeState.currentPet}
              onSwipe={swipeState.handleSwipe}
              isTopCard={true}
              buttonSwipeDirection={swipeState.buttonSwipeDirection}
            />
          )}
        </div>

        <SwipeFooter
          onPass={() => swipeState.triggerButtonSwipe('pass')}
          onLike={() => swipeState.triggerButtonSwipe('like')}
          disabled={!swipeState.currentPet}
          theme={petType}
        />
      </div>

      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        selectedLocations={selectedLocations}
        onLocationsChange={setSelectedLocations}
      />
    </div>
  )
}