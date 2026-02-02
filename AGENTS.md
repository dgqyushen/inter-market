# AGENTS.md - Development Guidelines

## Project Overview
前端项目用于比较交易对比值，定时推送价格信息给用户。

## Tech Stack
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint 9 + TypeScript ESLint
- **Formatting**: Prettier 3

## Build Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix       # Auto-fix issues

# Formatting
npm run format         # Format all files
npm run format:check   # Check formatting
```

## Test Commands

```bash
# Run all tests in watch mode
npm run test

# Run tests once (CI mode)
npm run test:run

# Run single test file
npm run test:run -- src/components/Button.test.tsx

# Run tests with coverage
npm run test:coverage

# Run specific test by name
npm run test:run -- -t "should render"
```

## Code Style Guidelines

### Imports
- Group imports: 1) External libs 2) Internal modules 3) Types
- Use `@/` prefix for path aliases (e.g., `@/components/Button`)
- Alphabetically sort imports within groups

```typescript
import { useState } from 'react'

import { Button } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'

import type { User } from '@/types/user'
```

### Formatting
- No semicolons
- Single quotes
- 2 spaces indentation
- Max line length: 100
- Trailing commas in multiline

### Types
- Use TypeScript for all code
- Explicit return types for exported functions
- Use `interface` for objects, `type` for unions
- Avoid `any`, use `unknown` when needed

```typescript
interface TradePair {
  symbol: string
  price: number
  timestamp: Date
}

type PriceChange = 'up' | 'down' | 'stable'

function calculateRatio(a: number, b: number): number {
  return a / b
}
```

### Naming Conventions
- **Components**: PascalCase (e.g., `PriceChart.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `usePrice.ts`)
- **Utils**: camelCase (e.g., `formatPrice.ts`)
- **Constants**: SCREAMING_SNAKE_CASE
- **Types**: PascalCase (e.g., `TradePair`)

### Error Handling
- Use try/catch for async operations
- Create custom errors for domain logic
- Log errors with context

```typescript
try {
  const data = await fetchPrice(symbol)
  return data
} catch (error) {
  console.error(`Failed to fetch ${symbol}:`, error)
  throw error
}
```

### Component Guidelines
- One component per file
- Functional components with hooks
- Define Props interface

```typescript
interface PriceCardProps {
  symbol: string
  price: number
  change?: number
}

export function PriceCard({ symbol, price, change = 0 }: PriceCardProps) {
  return <div>...</div>
}
```

## Project Structure

```
src/
  components/     # Reusable UI components
  hooks/         # Custom React hooks
  services/      # API calls and services
  stores/        # State management
  types/         # TypeScript types
  utils/         # Helper functions
  pages/         # Page components
  assets/        # Static assets
  test/          # Test utilities
```

## Git Workflow
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
- Branch naming: `feature/`, `fix/`, `refactor/`

## Environment Variables
- Prefix with `VITE_`
- Use `.env.local` for secrets (never commit)
- Document in `.env.example`
