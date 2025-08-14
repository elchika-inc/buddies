import { useDogSwipeState } from "@/hooks/useDogSwipeState";
import { mockDogs } from "@/data/dogs";
import { DogSwipeCard } from "./DogSwipeCard";
import { SwipeFooter } from "./SwipeFooter";
import { MatchHeader } from "./MatchHeader";

export function DogMatchApp() {
  const swipeState = useDogSwipeState(mockDogs);

  if (swipeState.isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">🐶</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            マッチング完了！
          </h2>
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50">
      <MatchHeader
        likedDogs={swipeState.likedDogs}
        superLikedDogs={swipeState.superLikedDogs}
        onRemoveLike={swipeState.removeLikedDog}
        onRemoveSuperLike={swipeState.removeSuperLikedDog}
      />
      <div className="container mx-auto px-4 py-8 pb-20">
        <div className="text-center mb-8">
          <div className="text-sm text-gray-500">
            残り: {swipeState.remainingCount}匹 | いいね:{" "}
            {swipeState.likedDogsCount}匹
          </div>
        </div>

        <div className="flex justify-center relative" style={{ height: 'calc(100vh - 280px)', minHeight: '320px', maxHeight: '500px' }}>
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
              buttonSwipeDirection={swipeState.buttonSwipeDirection}
            />
          )}
        </div>

        <SwipeFooter
          onPass={() => swipeState.handleSwipe("pass", true)}
          onLike={() => swipeState.handleSwipe("like", true)}
          disabled={!swipeState.currentDog}
          theme="dog"
        />
      </div>
    </div>
  );
}
