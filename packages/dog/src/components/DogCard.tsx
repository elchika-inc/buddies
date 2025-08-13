import { Zap, Users, Home } from 'lucide-react'
import { Dog } from '@/types/dog'

type DogCardProps = {
  dog: Dog
}

function Badge({ children, className = "", variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "secondary" | "outline" }) {
  const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
  const variantClasses = {
    default: "bg-blue-100 text-blue-800",
    secondary: "bg-gray-100 text-gray-800", 
    outline: "border border-gray-200 bg-white text-gray-700"
  }
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function DogCard({ dog }: DogCardProps) {
  const getDogSizeColor = (size: string) => {
    switch (size) {
      case '小型犬': return 'bg-green-100 text-green-800'
      case '中型犬': return 'bg-blue-100 text-blue-800'
      case '大型犬': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getExerciseColor = (level: string) => {
    switch (level) {
      case '高': return 'bg-red-500'
      case '中': return 'bg-yellow-500'
      case '低': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-sm mx-auto">
      {/* 画像部分 */}
      <div className="relative">
        <img 
          src={dog.imageUrl} 
          alt={dog.name}
          className="w-full h-64 object-cover"
        />
        
        {/* 左上のバッジ */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <Badge className={getDogSizeColor(dog.size)}>
            🐕 {dog.size}
          </Badge>
          <Badge variant="secondary" className="bg-white/90 text-black">
            {dog.breed}
          </Badge>
        </div>

        {/* 右上のバッジ */}
        <div className="absolute top-4 right-4">
          <Badge 
            variant="secondary"
            className={`${getExerciseColor(dog.exerciseLevel)} text-white`}
          >
            <Zap className="w-3 h-3 mr-1" />
            運動: {dog.exerciseLevel}
          </Badge>
        </div>
      </div>

      {/* コンテンツ部分 */}
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800">{dog.name}</h3>
          <p className="text-gray-600">{dog.age}歳 • {dog.gender} • {dog.location}</p>
        </div>

        <p className="text-gray-700 mb-4 text-sm">{dog.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {dog.personality.slice(0, 3).map((trait, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {trait}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {dog.goodWithKids && (
            <Badge variant="outline" className="text-xs bg-pink-50">
              <Users className="w-3 h-3 mr-1" />
              子供OK
            </Badge>
          )}
          {dog.goodWithDogs && (
            <Badge variant="outline" className="text-xs bg-green-50">
              <Users className="w-3 h-3 mr-1" />
              多頭OK
            </Badge>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">保護団体:</span>
            <span className="font-medium">{dog.shelterName}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-gray-600">譲渡費用:</span>
            <span className="font-medium">¥{dog.adoptionFee.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}