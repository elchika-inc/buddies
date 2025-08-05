import { ReactNode } from 'react'
import { BaseAnimal } from '@/types/common'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, MapPin, Calendar, Info } from 'lucide-react'
import { UI_CONSTANTS, LAYOUT_CONSTANTS, ANIMATION_CONSTANTS } from '@/config/constants'

export interface BaseAnimalCardProps<T extends BaseAnimal> {
  animal: T
  // 種別固有のバッジとアイコンをレンダリングするスロット
  primaryBadges?: ReactNode
  secondaryBadges?: ReactNode
  conditionalBadges?: ReactNode
  additionalInfo?: ReactNode
  // 種別固有の追加タグ
  additionalTags?: ReactNode
}

export function BaseAnimalCard<T extends BaseAnimal>({ 
  animal, 
  primaryBadges, 
  secondaryBadges, 
  conditionalBadges,
  additionalInfo,
  additionalTags
}: BaseAnimalCardProps<T>) {
  // デバッグログ追加
  console.log('🎴 BaseAnimalCard - 動物データ:', {
    id: animal.id,
    name: animal.name,
    age: animal.age,
    location: animal.location,
    imageUrl: animal.imageUrl,
    description: animal.description,
    personality: animal.personality,
    shelterName: animal.shelterName,
    adoptionFee: animal.adoptionFee
  })

  return (
    <Card className={`w-full h-full overflow-hidden ${ANIMATION_CONSTANTS.CARD_SHADOW}`}>
      <div className={`relative ${LAYOUT_CONSTANTS.CARD_HEIGHT_RATIO}`}>
        <img
          src={animal.imageUrl}
          alt={animal.name}
          className="w-full h-full object-cover"
        />
        
        {/* 左側のプライマリバッジ */}
        <div className="absolute top-4 left-4 flex gap-2">
          {primaryBadges}
        </div>
        
        {/* 右側のセカンダリバッジ */}
        <div className="absolute top-4 right-4">
          {secondaryBadges}
        </div>
        
        {/* 条件付きバッジ（左下） */}
        {conditionalBadges && (
          <div className="absolute bottom-4 left-4">
            {conditionalBadges}
          </div>
        )}
      </div>
      
      <CardContent className={`${LAYOUT_CONSTANTS.PADDING_STANDARD} ${LAYOUT_CONSTANTS.CONTENT_HEIGHT_RATIO} flex flex-col justify-between`}>
        <div>
          {/* 名前と年齢 */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold">{animal.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {animal.age}歳
            </div>
          </div>
          
          {/* 場所と追加情報 */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <MapPin className="h-4 w-4" />
            {animal.location}
            {additionalInfo && (
              <>
                <span> • </span>
                {additionalInfo}
              </>
            )}
          </div>
          
          {/* 説明 */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {animal.description}
          </p>
          
          {/* パーソナリティタグ */}
          <div className="flex flex-wrap gap-1 mb-3">
            {('personality' in animal ? animal.personality || [] : [])
              .slice(0, UI_CONSTANTS.MAX_PERSONALITY_TAGS)
              .map((trait: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {trait}
                </Badge>
              ))}
            {/* 種別固有の追加タグ */}
            {additionalTags}
          </div>
        </div>
        
        {/* フッター情報 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {'shelterName' in animal ? animal.shelterName || '保護団体' : '保護団体'}
          </span>
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            ¥{('adoptionFee' in animal ? animal.adoptionFee || 0 : 0).toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}