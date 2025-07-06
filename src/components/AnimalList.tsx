import { Animal } from '@/types/animal'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Calendar, Heart, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type AnimalListProps = {
  animals: Animal[]
  title: string
  onBack: () => void
  icon?: React.ReactNode
}

export function AnimalList({ animals, title, onBack, icon }: AnimalListProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-sm p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            {icon}
            <h1 className="text-xl font-bold">{title}</h1>
            <Badge variant="secondary">
              {animals.length}匹
            </Badge>
          </div>
        </div>
      </header>

      {/* 動物リスト */}
      <div className="p-4">
        {animals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">まだ動物がいません</p>
            <p className="text-muted-foreground text-sm mt-1">
              スワイプして気になる動物を見つけましょう！
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {animals.map((animal) => (
              <div key={animal.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex">
                  <div className="w-24 h-24 flex-shrink-0">
                    <img
                      src={animal.imageUrl}
                      alt={animal.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{animal.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {animal.species}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                          <Calendar className="h-3 w-3" />
                          {animal.age}歳 • {animal.breed}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <MapPin className="h-3 w-3" />
                          {animal.location}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {animal.personality.slice(0, 2).map((trait, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {trait}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">¥{animal.adoptionFee.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{animal.shelterName}</p>
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