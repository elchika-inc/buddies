import { useCatSwipeState } from '@/hooks/useCatSwipeState'
import { mockCats } from '@/data/cats'
import { CatSwipeCard } from './CatSwipeCard'

export function CatMatchApp() {
  const swipeState = useCatSwipeState(mockCats)

  if (swipeState.isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">🐱</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">マッチング完了！</h2>
          <p className="text-gray-600 mb-6">
            {swipeState.likedCatsCount}匹のネコちゃんとマッチしました
          </p>
          <button
            onClick={swipeState.reset}
            className="bg-pink-500 text-white px-6 py-3 rounded-full font-medium hover:bg-pink-600 transition-colors"
          >
            もう一度始める
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🐱 PawMatch for Cats</h1>
          <p className="text-gray-600">運命のネコちゃんを見つけよう</p>
          <div className="mt-4 text-sm text-gray-500">
            残り: {swipeState.remainingCount}匹 | いいね: {swipeState.likedCatsCount}匹
          </div>
        </div>

        <div className="flex justify-center relative h-96">
          {swipeState.nextCat && (
            <CatSwipeCard 
              key={`next-${swipeState.nextCat.id}`}
              cat={swipeState.nextCat} 
              onSwipe={() => {}} 
              isTopCard={false}
            />
          )}
          {swipeState.currentCat && (
            <CatSwipeCard 
              key={`current-${swipeState.currentCat.id}`}
              cat={swipeState.currentCat} 
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
            className="bg-pink-500 text-white px-6 py-3 rounded-full font-medium hover:bg-pink-600 transition-colors"
          >
            ❤️ いいね
          </button>
        </div>
      </div>
    </div>
  )
}