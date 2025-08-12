// Components
export { BaseAnimalCard } from './components/BaseAnimalCard'
export { AnimalMatchApp } from './components/AnimalMatchApp'
export { GenericSwipeScreen } from './components/GenericSwipeScreen'
export { SwipeableCard } from './components/SwipeableCard'
export { SwipeIndicator } from './components/SwipeIndicator'
export { SuperLikeConfirmModal } from './components/SuperLikeConfirmModal'

// UI Components
export { Button } from './ui/button'
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
export { Badge } from './ui/badge'

// Hooks
export { useAnimalSwipe } from './hooks/useAnimalSwipe'
export { useAnimals } from './hooks/useAnimals'
export { useSwipeGesture } from './hooks/useSwipeGesture'

// Config
export type { ThemeType } from './config/theme'
export * from './config/constants'
export * from './config/environment'
export * from './config/swipeConfig'

// Types
export type { Animal } from './types/animal'
export type { Dog } from './types/dog'
export type { Cat } from './types/cat'
export type { BaseAnimal } from './types/common'
export type { 
  SwipeAction, 
  SwipeDirection, 
  SwipeState, 
  DragOffset, 
  SwipeHistoryEntry 
} from './types/swipe'

// Services
export * from './services/swipeApi'

// Utils
export * from './lib/utils'
export * from './lib/cardUtils'
export { determineSwipeType } from './components/SwipeIndicator'