'use client'

import { AnimalMatchApp, useAnimalSwipe, useAnimals, BaseAnimalCard } from '@pawmatch/shared'

export default function Home() {
  const { animals, loading, error } = useAnimals('dog')
  const swipeState = useAnimalSwipe(animals)

  return (
    <div className="min-h-screen">
      <AnimalMatchApp
        animals={animals}
        loading={loading}
        error={error}
        swipeState={swipeState}
        theme="dog"
        animalType="犬"
        animalEmoji="🐕"
        renderCard={(animal) => <BaseAnimalCard animal={animal} />}
      />
    </div>
  )
}