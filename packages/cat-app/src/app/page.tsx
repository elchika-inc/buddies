'use client'

import { AnimalMatchApp, useAnimalSwipe, useAnimals, BaseAnimalCard } from '@pawmatch/shared'

export default function Home() {
  const { animals, loading, error } = useAnimals('cat')
  const swipeState = useAnimalSwipe(animals)

  // Test change for deployment
  return (
    <div className="min-h-screen">
      <AnimalMatchApp
        animals={animals}
        loading={loading}
        error={error}
        swipeState={swipeState}
        theme="cat"
        animalType="猫"
        animalEmoji="🐱"
        renderCard={(animal) => <BaseAnimalCard animal={animal} />}
      />
    </div>
  )
}