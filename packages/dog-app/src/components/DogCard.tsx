import { Dog } from '@pawmatch/shared'
import { Badge } from '@pawmatch/shared'
import { Zap, Users, Home } from 'lucide-react'
import { getDogSizeColor, getExerciseColor } from '@pawmatch/shared'
import { BaseAnimalCard } from '@pawmatch/shared'

type DogCardProps = {
  dog: Dog
}

export function DogCard({ dog }: DogCardProps) {

  // プライマリバッジ（左上）
  const primaryBadges = (
    <>
      <Badge className={getDogSizeColor(dog.size)}>
        🐕 {dog.size}
      </Badge>
      <Badge variant="secondary" className="bg-white/90 text-black">
        {dog.breed}
      </Badge>
    </>
  )

  // セカンダリバッジ（右上）
  const secondaryBadges = (
    <Badge 
      variant="secondary"
      className={`${getExerciseColor(dog.exerciseLevel)} text-white`}
    >
      <Zap className="w-3 h-3 mr-1" />
      運動量: {dog.exerciseLevel}
    </Badge>
  )

  // 条件付きバッジ（左下）
  const conditionalBadges = dog.needsYard ? (
    <Badge variant="destructive" className="bg-orange-500">
      <Home className="w-3 h-3 mr-1" />
      庭必要
    </Badge>
  ) : null

  // 犬固有の追加情報
  const additionalInfo = <span>{dog.walkFrequency}</span>

  // 犬固有のパーソナリティタグ
  const dogSpecificTags = dog.goodWithKids ? (
    <Badge variant="outline" className="text-xs bg-pink-50">
      <Users className="w-3 h-3 mr-1" />
      子供OK
    </Badge>
  ) : null

  return (
    <BaseAnimalCard
      animal={dog}
      primaryBadges={primaryBadges}
      secondaryBadges={secondaryBadges}
      conditionalBadges={conditionalBadges}
      additionalInfo={additionalInfo}
      additionalTags={dogSpecificTags}
    />
  )
}