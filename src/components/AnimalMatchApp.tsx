import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Heart, RotateCcw, Sparkles, Loader2 } from 'lucide-react'
import { GenericSwipeScreen } from './GenericSwipeScreen'
import { GenericAnimalList } from './GenericAnimalList'
import { type BaseAnimal } from '../types/common'
import { applyTheme, type ThemeType } from '../config/theme'
import { SCREEN_TYPES } from '../config/constants'

// useAnimalSwipeから統一型をインポート
import { AnimalSwipeResult } from '@/hooks/useAnimalSwipe'

// アニマルマッチアプリのプロップス
export interface AnimalMatchAppProps<T extends BaseAnimal> {
  animals: T[]
  loading?: boolean
  error?: string | null
  refetch?: () => void
  swipeState: AnimalSwipeResult<T>
  theme: ThemeType
  animalType: string // "犬" | "猫" など
  animalEmoji: string // "🐕" | "🐱" など
  renderCard: (animal: T) => React.ReactNode
}

// 画面の種類
type Screen = 'swipe' | 'liked' | 'superliked'

// 汎用アニマルマッチアプリコンポーネント
export function AnimalMatchApp<T extends BaseAnimal>({
  animals,
  loading = false,
  error = null,
  refetch,
  swipeState,
  theme,
  animalType,
  animalEmoji,
  renderCard
}: AnimalMatchAppProps<T>) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('swipe')
  
  // デバッグログ追加
  console.log('🎪 AnimalMatchApp - 受信データ:', {
    animalsCount: animals.length,
    loading,
    error,
    animalType,
    firstAnimal: animals[0] ? { id: animals[0].id, name: animals[0].name } : null
  })

  const {
    likedCount,
    superLiked,
    liked,
    reset,
    isComplete
  } = swipeState

  // テーマを適用
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // ローディング状態
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-theme-background">
        <Loader2 className="h-8 w-8 animate-spin mb-4" style={{ color: 'var(--theme-primary)' }} />
        <p className="text-lg font-medium text-theme-text">{animalType}データを読み込み中...</p>
      </div>
    )
  }

  // エラー状態
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-theme-background">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-theme-text">データの読み込みに失敗しました</h2>
          <p className="text-theme-textSecondary">{error}</p>
          {refetch && (
            <Button 
              onClick={refetch} 
              className="gap-2"
              style={{ 
                backgroundColor: 'var(--theme-primary)',
                color: 'white'
              }}
            >
              <RotateCcw className="h-4 w-4" />
              再試行
            </Button>
          )}
        </div>
      </div>
    )
  }

  // データが空の場合
  if (animals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-theme-background">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">{animalEmoji}</div>
          <h2 className="text-2xl font-bold text-theme-text">{animalType}が見つかりませんでした</h2>
          <p className="text-theme-textSecondary">現在表示可能な{animalType}がいません</p>
          {refetch && (
            <Button 
              onClick={refetch} 
              className="gap-2"
              style={{ 
                backgroundColor: 'var(--theme-primary)',
                color: 'white'
              }}
            >
              <RotateCcw className="h-4 w-4" />
              再読み込み
            </Button>
          )}
        </div>
      </div>
    )
  }

  // 完了画面コンポーネント
  const CompletionScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-theme-background">
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">{animalEmoji}</div>
        <h2 className="text-3xl font-bold text-theme-text">すべての{animalType}を確認しました！</h2>
        <p className="text-theme-textSecondary text-lg">
          気になる{animalType}: {likedCount + superLiked.length}匹
        </p>
        <div className="flex flex-col gap-3 max-w-xs">
          <Button 
            onClick={() => setCurrentScreen(SCREEN_TYPES.LIKED)} 
            className="gap-2 w-full"
            style={{ 
              backgroundColor: 'var(--theme-like)',
              color: 'white'
            }}
          >
            <Heart className="h-4 w-4" />
            気になる{animalType} ({likedCount})
          </Button>
          <Button 
            onClick={() => setCurrentScreen(SCREEN_TYPES.SUPERLIKED)} 
            variant="outline" 
            className="gap-2 w-full"
            style={{ 
              borderColor: 'var(--theme-superlike)',
              color: 'var(--theme-superlike)'
            }}
          >
            <Sparkles className="h-4 w-4" />
            特に気になる{animalType} ({superLiked.length})
          </Button>
          <Button 
            onClick={reset}
            variant="ghost" 
            className="gap-2 w-full text-theme-textSecondary"
          >
            <RotateCcw className="h-4 w-4" />
            最初からやり直す
          </Button>
        </div>
      </div>
    </div>
  )

  // 画面コンポーネントマッピング
  const screenComponents = {
    [SCREEN_TYPES.SWIPE]: () => 
      isComplete ? (
        <CompletionScreen />
      ) : (
        <GenericSwipeScreen
          swipeState={swipeState}
          onShowLiked={() => setCurrentScreen(SCREEN_TYPES.LIKED)}
          onShowSuperLiked={() => setCurrentScreen(SCREEN_TYPES.SUPERLIKED)}
          renderCard={renderCard}
        />
      ),
    [SCREEN_TYPES.LIKED]: () => (
      <GenericAnimalList
        animals={liked}
        title={`気になる${animalType}`}
        emptyMessage={`まだ気になる${animalType}がいません`}
        onBack={() => setCurrentScreen(SCREEN_TYPES.SWIPE)}
      />
    ),
    [SCREEN_TYPES.SUPERLIKED]: () => (
      <GenericAnimalList
        animals={superLiked}
        title={`特に気になる${animalType}`}
        emptyMessage={`まだ特に気になる${animalType}がいません`}
        onBack={() => setCurrentScreen(SCREEN_TYPES.SWIPE)}
      />
    )
  } as const

  const renderScreen = () => {
    return screenComponents[currentScreen]?.() || null
  }

  return renderScreen()
}