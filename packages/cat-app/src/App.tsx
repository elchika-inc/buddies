import { AnimalMatchApp, useAnimalSwipe, useAnimals, BaseAnimalCard } from '@pawmatch/shared'
import './index.css'

function App() {
  const { animals, loading, error } = useAnimals('cat')
  const swipeState = useAnimalSwipe(animals)

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

export default App