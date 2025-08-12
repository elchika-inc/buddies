import { Heart, X, Star } from "lucide-react"
import { Button } from '../ui/button'
import { SwipeAction } from '../types/animal'

type ActionButtonsProps = {
  onAction: (action: SwipeAction) => void
  disabled?: boolean
}

export function ActionButtons({ onAction, disabled = false }: ActionButtonsProps) {
  return (
    <div className="flex justify-center gap-6 mt-6">
      <Button
        variant="destructive"
        size="lg"
        className="w-16 h-16 rounded-full p-0 shadow-lg"
        onClick={() => onAction("pass")}
        disabled={disabled}
      >
        <X className="h-8 w-8" />
      </Button>
      
      <Button
        className="w-16 h-16 rounded-full p-0 bg-purple-500 hover:bg-purple-600 shadow-lg"
        onClick={() => onAction("superlike")}
        disabled={disabled}
      >
        <Star className="h-8 w-8" />
      </Button>
      
      <Button
        className="w-16 h-16 rounded-full p-0 bg-green-500 hover:bg-green-600 shadow-lg"
        onClick={() => onAction("like")}
        disabled={disabled}
      >
        <Heart className="h-8 w-8" />
      </Button>
    </div>
  )
}