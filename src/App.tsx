import { useState } from 'react'
import { AppSelector } from '@/components/AppSelector'
import { DogMatchApp } from '@/components/DogMatchApp'
import { CatMatchApp } from '@/components/CatMatchApp'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { APP_MODES } from '@/config/constants'

type AppMode = 'selector' | 'dog' | 'cat'

// アプリコンポーネントのマッピング
const AppBackButton = ({ onBack }: { onBack: () => void }) => (
  <Button
    variant="ghost"
    size="sm"
    className="absolute top-4 left-4 z-50 bg-white/80 backdrop-blur-sm"
    onClick={onBack}
  >
    <ArrowLeft className="h-4 w-4 mr-1" />
    戻る
  </Button>
)

const APP_COMPONENTS = {
  [APP_MODES.SELECTOR]: (handlers: { onSelectDogs: () => void; onSelectCats: () => void }) => (
    <AppSelector
      onSelectDogs={handlers.onSelectDogs}
      onSelectCats={handlers.onSelectCats}
    />
  ),
  [APP_MODES.DOG]: (handlers: { onBack: () => void }) => (
    <div className="relative">
      <AppBackButton onBack={handlers.onBack} />
      <DogMatchApp />
    </div>
  ),
  [APP_MODES.CAT]: (handlers: { onBack: () => void }) => (
    <div className="relative">
      <AppBackButton onBack={handlers.onBack} />
      <CatMatchApp />
    </div>
  )
} as const

function App() {
  const [currentApp, setCurrentApp] = useState<AppMode>(APP_MODES.SELECTOR)

  const renderApp = () => {
    const goToSelector = () => setCurrentApp(APP_MODES.SELECTOR)
    
    const componentMap = {
      [APP_MODES.SELECTOR]: () => APP_COMPONENTS[APP_MODES.SELECTOR]({
        onSelectDogs: () => setCurrentApp(APP_MODES.DOG),
        onSelectCats: () => setCurrentApp(APP_MODES.CAT)
      }),
      [APP_MODES.DOG]: () => APP_COMPONENTS[APP_MODES.DOG]({ onBack: goToSelector }),
      [APP_MODES.CAT]: () => APP_COMPONENTS[APP_MODES.CAT]({ onBack: goToSelector })
    }

    return componentMap[currentApp]?.() || null
  }

  return <div className="min-h-screen">{renderApp()}</div>
}

export default App