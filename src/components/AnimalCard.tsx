import { Animal } from '@/types/animal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, MapPin, Calendar, Info } from 'lucide-react'

type AnimalCardProps = {
  animal: Animal
}

export function AnimalCard({ animal }: AnimalCardProps) {
  return (
    <Card className="w-full h-full overflow-hidden shadow-xl">
      <div className="relative h-2/3">
        <img
          src={animal.imageUrl}
          alt={animal.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4">
          <Badge variant="secondary" className="bg-white/90 text-black">
            {animal.species}
          </Badge>
        </div>
        <div className="absolute top-4 right-4">
          <Badge 
            variant={animal.activityLevel === '高' ? 'destructive' : animal.activityLevel === '中' ? 'default' : 'secondary'}
            className="bg-white/90"
          >
            活動レベル: {animal.activityLevel}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4 h-1/3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold">{animal.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {animal.age}歳
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <MapPin className="h-4 w-4" />
            {animal.location} • {animal.breed}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {animal.description}
          </p>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {(animal.personality || []).slice(0, 3).map((trait, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {trait}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {animal.shelterName}
          </span>
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            ¥{(animal.adoptionFee || 0).toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}