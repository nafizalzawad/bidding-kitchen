# Bidding Kitchen

A two-player, mobile-first browser auction-cooking game built with TypeScript, Fastify, Socket.IO, React, and Tailwind CSS.

## Overview

Players compete in rapid sealed-bid auctions to acquire ingredients for their dish across a sequence of rounds. Balance your budget, anticipate your opponent's picks, claim synergies, satisfy secret customer orders, and build the highest-scoring culinary masterpiece!

## Monorepo Architecture

- **`packages/shared`** (`@bidding-kitchen/shared`): Pure TypeScript contracts, domain models, state machine transition tables, and canonical datasets (Street $20 Burger, Bistro $30 Pizza, Chef's Table $40 Steak). Zero runtime dependencies.
- **`apps/server`** (`@bidding-kitchen/server`): Fastify + Socket.IO authoritative realtime game server with Zod schema validation and structured Pino logging.
- **`apps/web`** (`@bidding-kitchen/web`): React 18 + Vite + Tailwind CSS client with colorblind-safe design tokens, Framer Motion physics, and Playwright visual QA.

## Quick Start

### Prerequisites
- Node.js >= 22
- pnpm >= 10 (`npm install -g pnpm`)

### Installation & Development
```bash
# Install dependencies across all workspaces
pnpm install

# Start both server (:3001) and web client (:5173) in watch mode
pnpm dev
```

### Verification & Testing
```bash
# Typecheck all workspaces (strict: true, noUncheckedIndexedAccess: true)
pnpm typecheck

# Run linter
pnpm lint

# Run Vitest unit & contract invariant tests
pnpm test

# Build all packages & apps
pnpm build

# Run Playwright E2E and multi-viewport visual test
pnpm test:e2e
```

## Phase 1 Deliverables
- [x] Pure TypeScript monorepo with `pnpm` workspaces
- [x] Strict TypeScript configuration with shared base
- [x] Canonical 19 Street Tier ingredients & 3 Tier definitions
- [x] 4 Combos & 6 Secret Customer Orders
- [x] 10-State authoritative state machine transition table with timeouts
- [x] Fastify server exposing `GET /health` contract
- [x] React client with Phase 1 Contract Diagnostic & Design Token Preview
- [x] Colorblind-safe FlavorTag pills (Color + SVG shape icons)
- [x] Playwright multi-viewport visual regression harness
- [x] GitHub Actions CI pipeline (`.github/workflows/ci.yml`)
