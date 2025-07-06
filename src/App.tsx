import { useState } from 'react'
import { AppSelector } from '@/components/AppSelector'
import { DogMatchApp } from '@/components/DogMatchApp'
import { CatMatchApp } from '@/components/CatMatchApp'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

type AppMode = 'selector' | 'dog' | 'cat'

function App() {
  const [currentApp, setCurrentApp] = useState<AppMode>('selector')

  const renderApp = () => {
    switch (currentApp) {
      case 'selector':
        return (
          <AppSelector
            onSelectDog={() => setCurrentApp('dog')}
            onSelectCat={() => setCurrentApp('cat')}
          />
        )
      case 'dog':
        return (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 left-4 z-50 bg-white/80 backdrop-blur-sm"
              onClick={() => setCurrentApp('selector')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              戻る
            </Button>
            <DogMatchApp />
          </div>
        )
      case 'cat':
        return (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 left-4 z-50 bg-white/80 backdrop-blur-sm"
              onClick={() => setCurrentApp('selector')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              戻る
            </Button>
            <CatMatchApp />
          </div>
        )
      default:
        return null
    }
  }

  return <div className="min-h-screen">{renderApp()}</div>
}

export default App