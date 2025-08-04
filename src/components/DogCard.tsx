import { Dog } from '@/types/dog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, MapPin, Calendar, Info, Zap, Users, Home } from 'lucide-react'
import { DOG_SIZE_COLORS, EXERCISE_LEVEL_COLORS, DEFAULT_VALUES, UI_CONSTANTS, LAYOUT_CONSTANTS, ANIMATION_CONSTANTS } from '@/config/constants'

type DogCardProps = {
  dog: Dog
}

export function DogCard({ dog }: DogCardProps) {
  const getSizeColor = (size: string) => {
    return DOG_SIZE_COLORS[size as keyof typeof DOG_SIZE_COLORS] || DEFAULT_VALUES.DOG_SIZE_COLOR
  }

  const getExerciseColor = (level: string) => {
    return EXERCISE_LEVEL_COLORS[level as keyof typeof EXERCISE_LEVEL_COLORS] || DEFAULT_VALUES.EXERCISE_LEVEL_COLOR
  }

  return (
    <Card className={`w-full h-full overflow-hidden ${ANIMATION_CONSTANTS.CARD_SHADOW}`}>
      <div className={`relative ${LAYOUT_CONSTANTS.CARD_HEIGHT_RATIO}`}>
        <img
          src={dog.imageUrl}
          alt={dog.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge className={getSizeColor(dog.size)}>
            🐕 {dog.size}
          </Badge>
          <Badge variant="secondary" className="bg-white/90 text-black">
            {dog.breed}
          </Badge>
        </div>
        <div className="absolute top-4 right-4">
          <Badge 
            variant="secondary"
            className={`${getExerciseColor(dog.exerciseLevel)} text-white`}
          >
            <Zap className="w-3 h-3 mr-1" />
            運動量: {dog.exerciseLevel}
          </Badge>
        </div>
        {dog.needsYard && (
          <div className="absolute bottom-4 left-4">
            <Badge variant="destructive" className="bg-orange-500">
              <Home className="w-3 h-3 mr-1" />
              庭必要
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className={`${LAYOUT_CONSTANTS.PADDING_STANDARD} ${LAYOUT_CONSTANTS.CONTENT_HEIGHT_RATIO} flex flex-col justify-between`}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold">{dog.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {dog.age}歳
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <MapPin className="h-4 w-4" />
            {dog.location} • {dog.walkFrequency}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {dog.description}
          </p>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {dog.personality.slice(0, UI_CONSTANTS.MAX_PERSONALITY_TAGS).map((trait, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {trait}
              </Badge>
            ))}
            {dog.goodWithKids && (
              <Badge variant="outline" className="text-xs bg-pink-50">
                <Users className="w-3 h-3 mr-1" />
                子供OK
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {dog.shelterName}
          </span>
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            ¥{dog.adoptionFee.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}