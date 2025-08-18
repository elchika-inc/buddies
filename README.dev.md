# PawMatch - Developer Documentation 🛠️

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Technical Stack](#technical-stack)
- [Development Workflow](#development-workflow)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🏗️ Architecture Overview

PawMatch is a monorepo containing specialized pet adoption applications built with modern web technologies.

### Core Principles
- **Type Safety** - Full TypeScript coverage
- **Component-Based** - Reusable React components
- **Mobile-First** - Responsive design patterns
- **Performance** - Optimized bundle sizes and lazy loading
- **Accessibility** - WCAG 2.1 compliance

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0 or Bun >= 1.0.0
- Git
- npm/yarn/bun package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/pawmatch.git
cd pawmatch

# Install dependencies
bun install
# or
npm install
```

## 💻 Development Setup

### Running the Development Server

```bash
# Run both apps (default)
npm run dev

# Run DogMatch app only
npm run dev:dog

# Run CatMatch app only  
npm run dev:cat
```

The applications will be available at:
- DogMatch: http://localhost:3000 (with NEXT_PUBLIC_PET_TYPE=dog)
- CatMatch: http://localhost:3000 (with NEXT_PUBLIC_PET_TYPE=cat)

### Environment Variables

Create a `.env.local` file in the packages directory:

```env
# Pet type configuration
NEXT_PUBLIC_PET_TYPE=dog # or 'cat'

# API endpoints (future)
NEXT_PUBLIC_API_URL=https://api.pawmatch.jp

# Analytics (optional)
NEXT_PUBLIC_GA_ID=GA_MEASUREMENT_ID
```

## 📁 Project Structure

```
pawmatch/
├── packages/                 # Main application directory
│   ├── src/
│   │   ├── app/             # Next.js app directory
│   │   │   ├── layout.tsx   # Root layout
│   │   │   └── page.tsx     # Home page
│   │   ├── components/      # React components
│   │   │   ├── PetCard.tsx
│   │   │   ├── PetSwipeCard.tsx
│   │   │   ├── PetDetailModal.tsx
│   │   │   ├── LocationModal.tsx
│   │   │   └── ...
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useLocalStorage.ts
│   │   │   └── usePetSwipeState.ts
│   │   ├── types/           # TypeScript definitions
│   │   │   ├── pet.ts       # Base pet interface
│   │   │   ├── dog.ts       # Dog-specific types
│   │   │   └── cat.ts       # Cat-specific types
│   │   ├── data/            # Mock data and loaders
│   │   │   ├── dog/         # Dog-specific data
│   │   │   ├── cat/         # Cat-specific data
│   │   │   └── petDataLoader.ts
│   │   └── config/          # App configuration
│   │       └── petConfig.ts
│   ├── public/              # Static assets
│   │   ├── sw.js           # Service Worker
│   │   └── manifest.json   # PWA manifest
│   └── package.json
├── functions/               # Serverless functions
│   └── api/
│       ├── matches.ts
│       └── swipe.ts
├── __docs__/               # Documentation
│   └── prd/               # Product requirements
└── package.json           # Root package.json
```

## 🛠️ Technical Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.0
- **Styling**: TailwindCSS 3.3
- **State Management**: React Hooks + Local Storage
- **Build Tool**: Next.js built-in bundler

### Key Dependencies
```json
{
  "react": "^18.2.0",
  "next": "^14.0.0",
  "typescript": "^5.0.2",
  "tailwindcss": "^3.3.0",
  "@radix-ui/react-*": "UI primitives",
  "framer-motion": "Animation library"
}
```

### Development Tools
- **Linting**: ESLint with Next.js config
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Lefthook (optional)

## 🔄 Development Workflow

### Component Development

1. Create new components in `src/components/`
2. Define types in `src/types/`
3. Use existing hooks or create new ones in `src/hooks/`
4. Follow the existing component patterns

Example component structure:
```typescript
// src/components/NewComponent.tsx
import React from 'react'
import { Pet } from '../types/pet'

interface NewComponentProps {
  pet: Pet
  onAction: (id: string) => void
}

export const NewComponent: React.FC<NewComponentProps> = ({ pet, onAction }) => {
  // Component logic
  return <div>{/* JSX */}</div>
}
```

### Adding New Pet Attributes

1. Update type definitions in `src/types/dog.ts` or `src/types/cat.ts`
2. Update mock data in `src/data/`
3. Modify components to display new attributes
4. Update filters if searchable

### Code Style Guidelines

- Use functional components with TypeScript
- Implement proper error boundaries
- Follow React best practices (memo, useCallback, useMemo)
- Keep components small and focused
- Use semantic HTML elements
- Ensure keyboard navigation support

## 📡 API Documentation

### Current Implementation
The app currently uses mock data from `src/data/`. Future API integration points:

### Planned Endpoints

```typescript
// GET /api/pets
interface GetPetsParams {
  type: 'dog' | 'cat'
  location?: string
  limit?: number
  offset?: number
}

// POST /api/swipe
interface SwipeAction {
  petId: string
  action: 'like' | 'pass'
  userId: string
}

// GET /api/matches
interface GetMatches {
  userId: string
}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

### Testing Strategy

- **Unit Tests**: Component logic and utilities
- **Integration Tests**: Component interactions
- **E2E Tests**: Critical user flows

### Writing Tests

```typescript
// Example test file
import { render, screen } from '@testing-library/react'
import { PetCard } from '../PetCard'

describe('PetCard', () => {
  it('displays pet information', () => {
    const pet = { /* mock data */ }
    render(<PetCard pet={pet} />)
    expect(screen.getByText(pet.name)).toBeInTheDocument()
  })
})
```

## 🚢 Deployment

### Build Process

```bash
# Build for production
npm run build

# Analyze bundle size
npm run analyze
```

### Deployment Platforms

#### Vercel (Recommended)
```bash
# Deploy to Vercel
npm run deploy
```

#### Self-Hosted
```bash
# Build and start production server
npm run build
npm run start
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Build passes without errors
- [ ] All tests passing
- [ ] Bundle size optimized
- [ ] SEO meta tags updated
- [ ] PWA manifest configured
- [ ] SSL certificate active
- [ ] Monitoring setup

## 🤝 Contributing

### Development Process

1. **Fork & Clone** - Fork the repo and clone locally
2. **Branch** - Create a feature branch (`feature/amazing-feature`)
3. **Develop** - Make your changes
4. **Test** - Ensure tests pass
5. **Commit** - Use conventional commits
6. **Push** - Push to your fork
7. **PR** - Open a pull request

### Commit Convention

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

### Code Review Process

- All code must be reviewed
- Tests must pass
- Follow TypeScript best practices
- Maintain consistent code style

## 📚 Additional Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

### Tools & Extensions

Recommended VS Code extensions:
- ESLint
- Prettier
- TypeScript Vue Plugin
- Tailwind CSS IntelliSense
- GitLens

### Troubleshooting

Common issues and solutions:

**Issue**: Build fails with type errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

**Issue**: Development server not starting
```bash
# Check port availability
lsof -i :3000
# Kill process if needed
kill -9 <PID>
```

**Issue**: Styles not updating
```bash
# Clear TailwindCSS cache
npm run clean
npm run dev
```

## 📞 Support

For development questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

*Happy coding! 🚀*