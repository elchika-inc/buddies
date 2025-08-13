import { useDogSwipeState } from '@/hooks/useDogSwipeState'
import { mockDogs } from '@/data/dogs'
import { DogSwipeCard } from './DogSwipeCard'

export function DogMatchApp() {
  const swipeState = useDogSwipeState(mockDogs)

  if (swipeState.isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">🐶</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">マッチング完了！</h2>
          <p className="text-gray-600 mb-6">
            {swipeState.likedDogsCount}匹のワンちゃんとマッチしました
          </p>
          <button
            onClick={swipeState.reset}
            className="bg-blue-500 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-600 transition-colors"
          >
            もう一度始める
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🐶 PawMatch for Dogs</h1>
          <p className="text-gray-600">運命のワンちゃんを見つけよう</p>
          <div className="mt-4 text-sm text-gray-500">
            残り: {swipeState.remainingCount}匹 | いいね: {swipeState.likedDogsCount}匹
          </div>
        </div>

        <div className="flex justify-center relative h-96">
          {swipeState.nextDog && (
            <DogSwipeCard 
              key={`next-${swipeState.nextDog.id}`}
              dog={swipeState.nextDog} 
              onSwipe={() => {}} 
              isTopCard={false}
            />
          )}
          {swipeState.currentDog && (
            <DogSwipeCard 
              key={`current-${swipeState.currentDog.id}`}
              dog={swipeState.currentDog} 
              onSwipe={swipeState.handleSwipe}
              isTopCard={true}
            />
          )}
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => swipeState.handleSwipe('pass')}
            className="bg-gray-400 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-500 transition-colors"
          >
            ❌ パス
          </button>
          <button
            onClick={() => swipeState.handleSwipe('like')}
            className="bg-blue-500 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-600 transition-colors"
          >
            ❤️ いいね
          </button>
        </div>
      </div>
    </div>
  )
}