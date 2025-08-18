# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PawMatch is a Tinder-style pet adoption platform with two specialized apps: DogMatch and CatMatch. The application uses Next.js 14 with App Router, TypeScript, and TailwindCSS. The project follows a monorepo structure with the main application code in the `packages/` directory.

## Common Development Commands

### Development Server
```bash
# Run development server (both apps)
npm run dev

# Run DogMatch app only
npm run dev:dog

# Run CatMatch app only
npm run dev:cat
```

### Build and Production
```bash
# Build for production
npm run build

# Build DogMatch specifically
npm run build:dog

# Build CatMatch specifically
npm run build:cat

# Start production server
npm run start
```

### Code Quality
```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Clean build cache
npm run clean
```

### Deployment
```bash
# Deploy to Vercel
npm run deploy
```

## Architecture

### App Switching Mechanism
The application switches between DogMatch and CatMatch using the `NEXT_PUBLIC_PET_TYPE` environment variable:
- Set to `'dog'` for DogMatch
- Set to `'cat'` for CatMatch

This affects:
- Data loading in `src/data/petDataLoader.ts`
- Configuration in `src/config/petConfig.ts`
- Type definitions (`src/types/dog.ts` vs `src/types/cat.ts`)

### State Management
- Uses React hooks for local state management
- `useLocalStorage` hook for persistent storage
- `usePetSwipeState` hook for managing swipe interactions
- No external state management library

### Data Flow
1. Mock data is loaded from `src/data/dog/` or `src/data/cat/` based on pet type
2. `petDataLoader.ts` dynamically imports the correct dataset
3. Components receive typed data (Dog or Cat types)
4. User interactions are saved to localStorage

### Component Architecture
- `PetMatchApp` is the main container component
- `PetSwipeCard` handles the swipeable card interface
- `PetDetailModal` shows detailed pet information
- `LocationModal` manages location selection
- All components are TypeScript functional components

### PWA Configuration
- Service Worker at `public/sw.js` for offline functionality
- Manifest at `public/manifest.json` for app metadata
- Uses `next-pwa` for PWA generation

### Type System
- Base `Pet` interface in `src/types/pet.ts`
- Extended by `Dog` and `Cat` types with specific attributes
- Strict TypeScript configuration with no implicit any

## Key Implementation Details

### Pet Type Switching
The pet type is determined at build time or runtime through environment variables. Components and data loading adapt dynamically based on this configuration.

### Location System
- Hierarchical structure: Region → Prefecture → City
- Data stored in `locations.ts` and `regions.ts` files
- Separate location data for dogs and cats

### Swipe Functionality
- Uses framer-motion for animations
- Tracks swipe history in localStorage
- Implements like/pass actions with visual feedback

### Responsive Design
- Mobile-first approach using TailwindCSS
- Breakpoints: mobile (<768px), tablet (768px-1024px), desktop (>1024px)
- Touch-optimized interactions

## Important Notes

- Always work within the `packages/` directory for application code
- The project uses Bun as the package manager (see `bunfig.toml`)
- Path alias `@/*` maps to `./src/*` in the packages directory
- Development server runs on port 3004 by default
- The app is designed to work as a PWA with offline capabilities