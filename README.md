# Bidding Kitchen

A two-player, mobile-first browser auction-cooking game built with TypeScript, Fastify, Socket.IO, React, and Tailwind CSS.

## Overview

Players compete in rapid sealed-bid auctions to acquire ingredients for their dish across a sequence of rounds. Balance your budget, anticipate your opponent's picks, claim synergies, satisfy secret customer orders, and build the highest-scoring culinary masterpiece!

## Monorepo Architecture

- **`packages/shared`** (`@bidding-kitchen/shared`): Pure TypeScript contracts, domain models, state machine transition tables, and canonical datasets (Street $20 Burger, Bistro $30 Pizza, Chef's Table $40 Steak). Zero runtime dependencies.
- **`apps/server`** (`@bidding-kitchen/server`): Fastify + Socket.IO authoritative realtime game server with Zod schema validation and structured Pino logging.
- **`apps/web`** (`@bidding-kitchen/web`): React 18 + Vite + Tailwind CSS client with colorblind-safe design tokens, Framer Motion physics, and Playwright visual QA.

## Game Tiers (v1.5)

| Tier | Theme | Starting Budget | Rounds | Distinct Slots | Uncontested Rule |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`STREET`** | Street Burger | $20 | 5 | Bun, Patty, Sauce, Cheese, Topping | Pays Base Price |
| **`BISTRO`** | Bistro Pizza | $30 | 5 | Dough, Pizza Sauce, Pizza Cheese, Main Topping, Finish | Pays Base Price |
| **`CHEFS_TABLE`** | Chef's Table | $40 | 6 | Cut, Side, Steak Sauce, Garnish, Drink, Dessert | Free Uncontested ($0) |

## Key Mechanics & v1.5 Features

- **Simultaneous Sealed-Bid Auctions**: Hidden bids revealed synchronously with 3D card flips.
- **Fair Collision Resolution**: Highest bid takes the ingredient; ties coin-flipped; losers receive free basic fallback ($0).
- **Customer Orders**: Secret constraints revealed at match start yielding a +5 point bonus if fulfilled.
- **Chef's Tip Rubber Band**: The trailing chef receives +$2 cash grant after Round 3, curbing snowball strategies.
- **Quick Match Matchmaking**: Cross-tier isolated FIFO queue (`queue:join`, `queue:leave`, `queue:matched`).
- **High-Res PNG Dish Cards**: In-browser HTML5 Canvas export generating downloadable 16:9 share cards.
- **Procedural Audio & Juice**: Zero-asset Web Audio API sound synthesizer and mobile haptics.
- **Production Hardened**: Full WCAG 2.1 AA accessibility, strict bundle size budget (< 180 KB), and 50,000+ bot-simulated balance verified.

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
# Full monorepo verification gate (typecheck, lint, test, build, bundle check)
pnpm verify

# Multi-tier 30,000-match balance simulation (generates docs/balance-report-v1.5.md)
pnpm sim:all --matches 10000 --seed 2026

# Run all Playwright E2E suites across viewports & WCAG AA audits
pnpm test:e2e
```
