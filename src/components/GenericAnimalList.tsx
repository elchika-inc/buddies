import { BaseAnimal } from '@/types/common'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type GenericAnimalListProps<T extends BaseAnimal> = {
  animals: T[]
  title: string
  emptyMessage: string
  onBack: () => void
  icon?: React.ReactNode
}

export function GenericAnimalList<T extends BaseAnimal>({ 
  animals, 
  title, 
  emptyMessage,
  onBack, 
  icon 
}: GenericAnimalListProps<T>) {
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

      {/* コンテンツ */}
      <main className="p-4 pb-8">
        {animals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">{emptyMessage}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {animals.map((animal) => (
              <div
                key={animal.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-gray-200 overflow-hidden">
                  <img
                    src={animal.imageUrl}
                    alt={animal.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{animal.name}</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{animal.age}歳</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{animal.location}</span>
                    </div>
                  </div>
                  <p className="text-sm mt-2 line-clamp-2">{animal.description}</p>
                  {animal.tags && animal.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {animal.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}