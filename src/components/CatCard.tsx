import { Cat } from '@/types/cat'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, MapPin, Calendar, Info, Volume2, Users, Moon, Sun } from 'lucide-react'
import { SOCIAL_LEVEL_COLORS, ACTIVITY_ICONS, DEFAULT_VALUES, UI_CONSTANTS, LAYOUT_CONSTANTS, ANIMATION_CONSTANTS } from '@/config/constants'

type CatCardProps = {
  cat: Cat
}

export function CatCard({ cat }: CatCardProps) {
  const getCoatColor = (length: string) => {
    return length === '長毛' 
      ? 'bg-purple-100 text-purple-800' 
      : 'bg-blue-100 text-blue-800'
  }

  const getSocialColor = (level: string) => {
    return SOCIAL_LEVEL_COLORS[level as keyof typeof SOCIAL_LEVEL_COLORS] || DEFAULT_VALUES.SOCIAL_LEVEL_COLOR
  }

  const activityIconMap = {
    sun: <Sun className="w-3 h-3" />,
    moon: <Moon className="w-3 h-3" />
  }

  const getActivityIcon = (time: string) => {
    const iconType = ACTIVITY_ICONS[time as keyof typeof ACTIVITY_ICONS] || 'sun'
    return activityIconMap[iconType]
  }

  return (
    <Card className={`w-full h-full overflow-hidden ${ANIMATION_CONSTANTS.CARD_SHADOW}`}>
      <div className={`relative ${LAYOUT_CONSTANTS.CARD_HEIGHT_RATIO}`}>
        <img
          src={cat.imageUrl}
          alt={cat.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge className={getCoatColor(cat.coatLength)}>
            🐱 {cat.coatLength}
          </Badge>
          <Badge variant="secondary" className="bg-white/90 text-black">
            {cat.breed}
          </Badge>
        </div>
        <div className="absolute top-4 right-4">
          <Badge 
            variant="secondary"
            className={`${getSocialColor(cat.socialLevel)} text-white`}
          >
            <Users className="w-3 h-3 mr-1" />
            {cat.socialLevel}
          </Badge>
        </div>
        {cat.vocalizationLevel !== '静か' && (
          <div className="absolute bottom-4 left-4">
            <Badge variant="outline" className="bg-white/90">
              <Volume2 className="w-3 h-3 mr-1" />
              {cat.vocalizationLevel}
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className={`${LAYOUT_CONSTANTS.PADDING_STANDARD} ${LAYOUT_CONSTANTS.CONTENT_HEIGHT_RATIO} flex flex-col justify-between`}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold">{cat.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {cat.age}歳
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <MapPin className="h-4 w-4" />
            {cat.location} • {cat.indoorOutdoor}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {cat.description}
          </p>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {cat.personality.slice(0, UI_CONSTANTS.MAX_PERSONALITY_TAGS).map((trait, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {trait}
              </Badge>
            ))}
            {cat.goodWithMultipleCats && (
              <Badge variant="outline" className="text-xs bg-pink-50">
                <Users className="w-3 h-3 mr-1" />
                多頭OK
              </Badge>
            )}
            <Badge variant="outline" className="text-xs bg-yellow-50">
              {getActivityIcon(cat.activityTime)}
              {cat.activityTime}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {cat.shelterName}
          </span>
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            ¥{cat.adoptionFee.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}