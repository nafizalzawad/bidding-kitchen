# Bidding Kitchen Phase 2 Visual QA Report — Engine Sandbox Inspector

- **Date:** 2026-11-01
- **Phase:** Phase 2 — Game Engine & Bot Simulator
- **Status:** PASS (100% Green, 0 Regressions)
- **Playwright Test Suite:** `apps/web/e2e/phase2-engine.spec.ts` & `apps/web/e2e/phase1-foundation.spec.ts` (10 of 10 passed in 5.1s)
- **Engine Unit Test Coverage:** 97.13% Lines, 91.24% Branches, 100% Functions

---

## 1. Executive Summary

Phase 2 introduces the **Engine Sandbox Inspector**, allowing real-time interactive simulation of 5-round auction-cooking matches directly in the browser using the pure, deterministic game rules engine.

Visual verification confirms responsive fidelity, high-contrast typography, clear collision and tiebreaker pill states, and zero layout overflow across all four canonical viewports (360x640, 390x844, 768x1024, 1280x800) plus an interactive collision scenario preset.

---

## 2. Screenshot Manifest & Viewport Invariants

| Viewport | Dimensions | Screenshot Artifact | Status | Key Visual Invariants Verified |
| :--- | :---: | :--- | :---: | :--- |
| **Mobile Sm** | 360 x 640 | `screenshots/phase-2/engine-sandbox-mobile-sm.png` | PASS | Compact toolbar wrapping, legible tabular numbers, winner banner with title pill, 100% touch-target compliance ($\ge 44\times 44\text{px}$). |
| **Mobile Md** | 390 x 844 | `screenshots/phase-2/engine-sandbox-mobile-md.png` | PASS | High-contrast winner title, side-by-side player score cards stacking neatly on single column, clear round cards. |
| **Tablet** | 768 x 1024 | `screenshots/phase-2/engine-sandbox-tablet.png` | PASS | 2-column side-by-side final score breakdown cards, balanced round log columns, responsive navigation tabs. |
| **Desktop** | 1280 x 800 | `screenshots/phase-2/engine-sandbox-desktop.png` | PASS | 4-column toolbar grid, spacious side-by-side player cards, clear round outcome cards with status pills and budget transitions. |
| **Collision Preset** | 390 x 844 | `screenshots/phase-2/engine-sandbox-collision-mobile-md.png` | PASS | Wagyu collision ($8 base, $9 vs $8 bid) renders amber flame pill ("⚡ Collision: High Bid Win"), winner receives Wagyu, loser receives Basic Beef fallback for $0. |

---

## 3. UI Component Breakdown & Accessibility

### 3.1 Controls Toolbar
- **PRNG Seed Input (`data-testid="sim-seed-input"`):** Monospace font with high contrast focus outline (`focus:border-amber-400`).
- **Archetype Selectors (`data-testid="sim-bot-a-select"`, `data-testid="sim-bot-b-select"`):** Native dropdowns offering `COMBO`, `GREEDY`, and `RANDOM` algorithms.
- **Simulate Button (`data-testid="btn-simulate-match"`):** Amber primary button (`#FFB703`) with active micro-scale transition (`active:scale-[0.98]`).
- **Preset Quick-Action Buttons (`btn-test-collision`, `btn-test-tiebreak`):** Distinct iconography (⚡, ⚖️) and hover states for collision and tiebreak scenario testing.

### 3.2 Match Result Banner
- **Winner Trophy & Avatar:** Prominent trophy badge (`data-testid="match-winner-badge"`) displaying the victorious chef's nickname.
- **Victory Title (`data-testid="match-winner-title"`):** Context-aware honorary badge ("Flavor Alchemist", "Grand Master Chef", "Frugal Gourmet", "Burger Champion").
- **Win Reason:** Explicit rule declaration (`SCORE`, `SPENT_LESS_TIEBREAK`, `COINFLIP_TIEBREAK`, `FORFEIT`).
- **Key Moment Recap:** Narrative sentence explaining the critical round or tiebreaker that decided the match.

### 3.3 Score Breakdown Cards
- **Score Big-Number Display (`data-testid="p0-final-score"`, `data-testid="p1-final-score"`):** Monospace 3xl font in player brand colors (Amber for Seat 0, Purple for Seat 1).
- **Dish Title (`data-testid="p0-dish-name"`, `data-testid="p1-dish-name"`):** Procedural culinary dish name based on ingredients ("The Truffle Wagyu Reserve", "The Smokehouse Kingpin").
- **Component Breakdown Grid:** Explicit 2x2 grid displaying Taste Points, Combos Bonus, Order Bonus, and Leftover Money Bonus (with leftover budget in parentheses).
- **Synergy Badges:** Glowing pill badges for each completed combo (`Smokehouse +4`, `Hot and Decadent +3`, `Crunch Contrast +3`, `Chef's Pride +3`).

### 3.4 5 Round Cards (`data-testid="round-card-0"` through `data-testid="round-card-4"`)
- **Round Number & Slot Badge:** Monospace round indicator (`R1` through `R5`) with slot name (`BUN`, `PATTY`, `SAUCE`, `CHEESE`, `TOPPING`).
- **Collision Status Badge:** Colorblind-safe styling:
  - `NO_COLLISION`: Emerald green pill with leaf silhouette ("Clear Win")
  - `COLLISION_HIGH_BID`: Amber pill with lightning bolt ("⚡ Collision: High Bid Win")
  - `COLLISION_TIE_BUDGET`: Purple pill with scales ("⚖️ Collision: Budget Tiebreak")
  - `COLLISION_TIE_COINFLIP`: Blue pill with coin ("🪙 Collision: Coinflip Tiebreak")
- **Chef's Tip Badge:** Pink pill ("👨‍🍳 Chef's Tip +$2") awarded in Round 3 for $\ge 3$ taste point deficits.
- **Player Outcome Columns:** Chosen bid vs awarded item, price paid, wonVia indicator, and before/after budget transitions (`$20 → $16`).

---

## 4. Performance & Test Execution

- **Vite Web App Production Build:** 200.27 kB JS, 19.58 kB CSS (gzip: 61 kB JS, 4.2 kB CSS).
- **Playwright Test Execution:** 10 end-to-end tests across all viewports completed in 5.1 seconds.
- **Vitest Unit & Property Suites:** 36 tests passing in 1.25s (including 2,000 property-based iterations).
- **10,000-Match Simulation:** 40,000 total simulated matches completed in 317ms (>31,500 matches/sec).

---

## 5. Visual QA Sign-Off Checklist

- [x] All 5 required screenshot files exist on disk in `docs/visual-qa/screenshots/phase-2/`.
- [x] No text clipping or horizontal scrollbar on 360px viewport.
- [x] All interactive elements satisfy minimum $44\times 44\text{px}$ touch target size.
- [x] Fastify server `/health` returns `engineVerified: true` and `/api/sim-match` runs deterministically.
- [x] Phase 1 Contract Diagnostics remain accessible via the top tab bar.
