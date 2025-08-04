import { createFileRoute } from '@tanstack/react-router'
import { AppSelector } from '../components/AppSelector'

export const Route = createFileRoute('/')({
  component: () => {
    return <AppSelector />
  },
})