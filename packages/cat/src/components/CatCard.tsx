import { Volume2, Users, Moon, Sun } from 'lucide-react'
import { Cat } from '@/types/cat'

type CatCardProps = {
  cat: Cat
}

function Badge({ children, className = "", variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "secondary" | "outline" }) {
  const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
  const variantClasses = {
    default: "bg-pink-100 text-pink-800",
    secondary: "bg-gray-100 text-gray-800", 
    outline: "border border-gray-200 bg-white text-gray-700"
  }
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function CatCard({ cat }: CatCardProps) {
  const getActivityIcon = (time: string) => {
    return time === '夜型' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />
  }

  const getSocialColor = (level: string) => {
    switch (level) {
      case '人懐っこい': return 'bg-green-500'
      case 'シャイ': return 'bg-yellow-500'
      case '警戒心強い': return 'bg-red-500'
      default: return 'bg-blue-500'
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-sm mx-auto">
      {/* 画像部分 */}
      <div className="relative">
        <img 
          src={cat.imageUrl} 
          alt={cat.name}
          className="w-full h-64 object-cover"
        />
        
        {/* 左上のバッジ */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <Badge className="bg-pink-100 text-pink-800">
            🐱 {cat.coatLength}
          </Badge>
          <Badge variant="secondary" className="bg-white/90 text-black">
            {cat.breed}
          </Badge>
        </div>

        {/* 右上のバッジ */}
        <div className="absolute top-4 right-4">
          <Badge 
            variant="secondary"
            className={`${getSocialColor(cat.socialLevel)} text-white`}
          >
            <Users className="w-3 h-3 mr-1" />
            {cat.socialLevel}
          </Badge>
        </div>

        {/* 左下のバッジ */}
        {cat.vocalizationLevel !== '静か' && (
          <div className="absolute bottom-4 left-4">
            <Badge variant="outline" className="bg-white/90">
              <Volume2 className="w-3 h-3 mr-1" />
              {cat.vocalizationLevel}
            </Badge>
          </div>
        )}
      </div>

      {/* コンテンツ部分 */}
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800">{cat.name}</h3>
          <p className="text-gray-600">{cat.age}歳 • {cat.gender} • {cat.location}</p>
          <p className="text-sm text-gray-500 mt-1">{cat.indoorOutdoor}</p>
        </div>

        <p className="text-gray-700 mb-4 text-sm">{cat.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {cat.personality.slice(0, 3).map((trait, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {trait}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {cat.goodWithMultipleCats && (
            <Badge variant="outline" className="text-xs bg-pink-50">
              <Users className="w-3 h-3 mr-1" />
              多頭OK
            </Badge>
          )}
          <Badge variant="outline" className="text-xs bg-yellow-50">
            {getActivityIcon(cat.activityTime)}
            <span className="ml-1">{cat.activityTime}</span>
          </Badge>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">保護団体:</span>
            <span className="font-medium">{cat.shelterName}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-gray-600">譲渡費用:</span>
            <span className="font-medium">¥{cat.adoptionFee.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}