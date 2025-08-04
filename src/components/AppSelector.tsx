import { Button } from '@/components/ui/button'
import { UI_CONSTANTS, ANIMATION_CONSTANTS } from '@/config/constants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from '@tanstack/react-router'

type AppSelectorProps = {
  onSelectDogs?: () => void
  onSelectCats?: () => void
}

export function AppSelector({ onSelectDogs, onSelectCats }: AppSelectorProps) {
  const navigate = useNavigate()
  
  const handleSelectDogs = () => {
    if (onSelectDogs) {
      onSelectDogs()
    } else {
      navigate({ to: '/dogs' })
    }
  }
  
  const handleSelectCats = () => {
    if (onSelectCats) {
      onSelectCats()
    } else {
      navigate({ to: '/cats' })
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            PawMatch
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            保護動物との新しい出会いを見つけよう
          </p>
          <p className="text-sm text-gray-500">
            Tinder風スワイプで理想のパートナーを発見
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 犬アプリ */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={handleSelectDogs}>
            <CardHeader className="text-center">
              <div className={`text-${UI_CONSTANTS.EMOJI_SIZE} mb-4 ${ANIMATION_CONSTANTS.HOVER_TRANSFORM} transition-transform`}>🐕</div>
              <CardTitle className="text-2xl text-orange-600">DogMatch</CardTitle>
              <CardDescription className="text-base">
                保護犬専門マッチングアプリ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-600">
                <h4 className="font-semibold mb-2">特徴：</h4>
                <ul className="space-y-1 text-xs">
                  <li>• 運動量・しつけレベル別フィルター</li>
                  <li>• 散歩頻度・住環境マッチング</li>
                  <li>• 犬種特有の性格・ケア情報</li>
                  <li>• 子供・他犬との相性表示</li>
                </ul>
              </div>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                ワンちゃんを探す
              </Button>
            </CardContent>
          </Card>

          {/* 猫アプリ */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={handleSelectCats}>
            <CardHeader className="text-center">
              <div className={`text-${UI_CONSTANTS.EMOJI_SIZE} mb-4 ${ANIMATION_CONSTANTS.HOVER_TRANSFORM} transition-transform`}>🐱</div>
              <CardTitle className="text-2xl text-purple-600">CatMatch</CardTitle>
              <CardDescription className="text-base">
                保護猫専門マッチングアプリ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-600">
                <h4 className="font-semibold mb-2">特徴：</h4>
                <ul className="space-y-1 text-xs">
                  <li>• 社会性・活動時間別フィルター</li>
                  <li>• 室内外適性・多頭飼い情報</li>
                  <li>• 毛の長さ・グルーミング要件</li>
                  <li>• 鳴き声レベル・性格マッチング</li>
                </ul>
              </div>
              <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white">
                ネコちゃんを探す
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 text-xs text-gray-500">
          <p>このアプリは保護動物の譲渡を促進するサンプルアプリケーションです</p>
        </div>
      </div>
    </div>
  )
}