import { Cat } from '@/types/cat'
import { Badge } from '@/components/ui/badge'
import { Volume2, Users, Moon, Sun } from 'lucide-react'
import { ACTIVITY_ICONS } from '@/config/constants'
import { getCatCoatColor, getSocialColor } from '@/lib/cardUtils'
import { BaseAnimalCard } from './BaseAnimalCard'

type CatCardProps = {
  cat: Cat
}

export function CatCard({ cat }: CatCardProps) {
  const activityIconMap = {
    sun: <Sun className="w-3 h-3" />,
    moon: <Moon className="w-3 h-3" />
  }

  const getActivityIcon = (time: string) => {
    const iconType = ACTIVITY_ICONS[time as keyof typeof ACTIVITY_ICONS] || 'sun'
    return activityIconMap[iconType]
  }

  // プライマリバッジ（左上）
  const primaryBadges = (
    <>
      <Badge className={getCatCoatColor(cat.coatLength)}>
        🐱 {cat.coatLength}
      </Badge>
      <Badge variant="secondary" className="bg-white/90 text-black">
        {cat.breed}
      </Badge>
    </>
  )

  // セカンダリバッジ（右上）
  const secondaryBadges = (
    <Badge 
      variant="secondary"
      className={`${getSocialColor(cat.socialLevel)} text-white`}
    >
      <Users className="w-3 h-3 mr-1" />
      {cat.socialLevel}
    </Badge>
  )

  // 条件付きバッジ（左下）
  const conditionalBadges = cat.vocalizationLevel !== '静か' ? (
    <Badge variant="outline" className="bg-white/90">
      <Volume2 className="w-3 h-3 mr-1" />
      {cat.vocalizationLevel}
    </Badge>
  ) : null

  // 猫固有の追加情報
  const additionalInfo = <span>{cat.indoorOutdoor}</span>

  // 猫固有のパーソナリティタグ
  const catSpecificTags = (
    <>
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
    </>
  )

  return (
    <BaseAnimalCard
      animal={cat}
      primaryBadges={primaryBadges}
      secondaryBadges={secondaryBadges}
      conditionalBadges={conditionalBadges}
      additionalInfo={additionalInfo}
      additionalTags={catSpecificTags}
    />
  )
}