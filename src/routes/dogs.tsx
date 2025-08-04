import { createFileRoute } from '@tanstack/react-router'
import { DogMatchApp } from '../components/DogMatchApp'

export const Route = createFileRoute('/dogs')({
  component: () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <DogMatchApp />
      </div>
    )
  },
})