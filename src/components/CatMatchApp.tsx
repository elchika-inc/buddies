import { useState } from 'react'
import { CatSwipeCard } from './CatSwipeCard'
import { ActionButtons } from './ActionButtons'
import { useCatSwipeState } from '@/hooks/useCatSwipeState'
import { Button } from '@/components/ui/button'
import { RotateCcw, Heart, Star, ArrowLeft } from 'lucide-react'
import { mockCats } from '@/data/cats'
import { Cat } from '@/types/cat'
import { Badge } from '@/components/ui/badge'

type Screen = 'swipe' | 'liked' | 'superliked'

type CatListProps = {
  cats: Cat[]
  title: string
  onBack: () => void
  icon?: React.ReactNode
}

function CatList({ cats, title, onBack, icon }: CatListProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <header className="bg-white/80 backdrop-blur-sm p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            {icon}
            <h1 className="text-xl font-bold">{title}</h1>
            <Badge variant="secondary">
              {cats.length}匹
            </Badge>
          </div>
        </div>
      </header>

      <div className="p-4">
        {cats.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">まだネコちゃんがいません</p>
            <p className="text-muted-foreground text-sm mt-1">
              スワイプして気になるネコちゃんを見つけましょう！
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {cats.map((cat) => (
              <div key={cat.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex">
                  <div className="w-24 h-24 flex-shrink-0">
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{cat.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            🐱 {cat.coatLength}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                          {cat.age}歳 • {cat.breed} • {cat.socialLevel}
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          📍 {cat.location} • {cat.indoorOutdoor}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cat.personality.slice(0, 2).map((trait, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {trait}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">¥{cat.adoptionFee.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{cat.shelterName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CatMatchApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('swipe')
  const swipeState = useCatSwipeState(mockCats)

  const { 
    currentCat, 
    nextCat, 
    remainingCount, 
    likedCatsCount, 
    superLikedCats,
    likedCats,
    handleSwipe, 
    reset, 
    isComplete 
  } = swipeState

  const renderScreen = () => {
    switch (currentScreen) {
      case 'swipe':
        if (isComplete) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="text-center space-y-6">
                <div className="text-6xl mb-4">🐱</div>
                <h2 className="text-3xl font-bold">すべてのネコちゃんを確認しました！</h2>
                <p className="text-muted-foreground text-lg">
                  気になるネコちゃん: {likedCatsCount + superLikedCats.length}匹
                </p>
                <div className="flex flex-col gap-3 max-w-xs">
                  <Button onClick={() => setCurrentScreen('liked')} className="gap-2 w-full bg-purple-500 hover:bg-purple-600">
                    <Heart className="h-4 w-4" />
                    気になるネコちゃん ({likedCatsCount})
                  </Button>
                  <Button onClick={() => setCurrentScreen('superliked')} variant="outline" className="gap-2 w-full">
                    <Star className="h-4 w-4" />
                    特に気になるネコちゃん ({superLikedCats.length})
                  </Button>
                  <Button variant="outline" onClick={reset} className="gap-2 w-full">
                    <RotateCcw className="h-4 w-4" />
                    最初から始める
                  </Button>
                </div>
              </div>
            </div>
          )
        }

        return (
          <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50">
            {/* ヘッダー */}
            <header className="flex justify-between items-center p-4 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="text-2xl">🐱</div>
                <div className="text-sm text-muted-foreground font-medium">
                  残り {remainingCount} 匹
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setCurrentScreen('liked')} className="gap-2 text-sm">
                  <Heart className="h-4 w-4" />
                  気になる ({likedCatsCount})
                </Button>
                <Button variant="ghost" onClick={() => setCurrentScreen('superliked')} className="gap-2 text-sm">
                  <Star className="h-4 w-4" />
                  特に気になる ({superLikedCats.length})
                </Button>
              </div>
            </header>

            {/* カードエリア */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="relative w-full max-w-sm h-[650px]">
                {/* 次のカード（背景） */}
                {nextCat && (
                  <div className="absolute inset-0 scale-95 opacity-50 pointer-events-none transform rotate-2">
                    <CatSwipeCard cat={nextCat} onSwipe={() => {}} />
                  </div>
                )}
                
                {/* 現在のカード（前面） */}
                {currentCat && (
                  <div className="absolute inset-0 z-10">
                    <CatSwipeCard cat={currentCat} onSwipe={handleSwipe} />
                  </div>
                )}
              </div>
            </div>

            {/* アクションボタン */}
            {currentCat && (
              <div className="p-4 pb-8 bg-white/80 backdrop-blur-sm">
                <ActionButtons onAction={handleSwipe} disabled={false} />
                <p className="text-center text-xs text-muted-foreground mt-3">
                  左にスワイプ: パス • 上にスワイプ: 特に気になる • 右にスワイプ: 気になる
                </p>
              </div>
            )}
          </div>
        )
      case 'liked':
        return (
          <CatList
            cats={likedCats}
            title="気になるネコちゃん"
            onBack={() => setCurrentScreen('swipe')}
            icon={<Heart className="h-5 w-5 text-purple-500" />}
          />
        )
      case 'superliked':
        return (
          <CatList
            cats={superLikedCats}
            title="特に気になるネコちゃん"
            onBack={() => setCurrentScreen('swipe')}
            icon={<Star className="h-5 w-5 text-purple-500" />}
          />
        )
      default:
        return null
    }
  }

  return <div className="min-h-screen">{renderScreen()}</div>
}