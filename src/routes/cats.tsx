import { createFileRoute } from '@tanstack/react-router'
import { CatMatchApp } from '../components/CatMatchApp'

export const Route = createFileRoute('/cats')({
  component: () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <CatMatchApp />
      </div>
    )
  },
})