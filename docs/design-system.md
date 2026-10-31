# Bidding Kitchen — Design System Specification

## 1. Design Philosophy

- **Art Direction**: "Bright Bouncy Cartoon Kitchen" with chunky tactile surfaces, ink borders, and responsive physical feedback.
- **Mobile First**: Built specifically for single-thumb mobile play in portrait orientation (360px to 430px), scaling smoothly to tablet and desktop.
- **Accessibility Invariant**: High contrast ratios compliant with WCAG AA (>= 4.5:1 for normal text, >= 3.0:1 for large text). Non-reliance on color alone for FlavorTags, stock scarcity, or fallback states.

---

## 2. Surface & Palette Tokens

### 2.1 Surfaces & Neutrals

| Token | Hex | Role | Contrast Ratio |
| :--- | :--- | :--- | :--- |
| `bg-kitchen-cream` | `#FFFDF7` | Warm parchment canvas background | 16.4:1 with `ink-charcoal` |
| `bg-kitchen-tile` | `#F4EFE2` | Secondary panel / filter surface | 14.8:1 with `ink-charcoal` |
| `surface-card` | `#FFFFFF` | Primary card surface with 2px ink border & shadow `0 4px 0 #1E1B18` | 18.2:1 with `ink-charcoal` |
| `ink-charcoal` | `#1E1B18` | Primary text and cartoon ink borders | N/A |
| `ink-muted` | `#57514A` | Secondary copy, metadata, and labels | 7.2:1 on cream |

### 2.2 Brand & Action Colors

| Token | Hex | Role | Contrast Ratio |
| :--- | :--- | :--- | :--- |
| `brand-tomato` | `#E63946` | Primary CTA, bids, urgency alerts | 4.6:1 with `#FFFFFF` text |
| `brand-mustard` | `#FFB703` | Currency, coins, active highlight | 10.8:1 with `#1E1B18` text |
| `brand-lettuce` | `#1D7A4C` | Success, taste points, locked state | 5.3:1 with `#FFFFFF` text |
| `brand-blueberry` | `#2563EB` | Info, tier indicators, opponent signals | 5.1:1 with `#FFFFFF` text |

---

## 3. Colorblind-Safe FlavorTag Visual Language

Every FlavorTag features dual-coding: a high-contrast background plus an explicit geometric SVG shape icon and a visible uppercase text label.

| Tag | Background | Text | Border | SVG Icon & Geometric Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SMOKY`** | `#3D2C2E` | `#FFFDF7` | `#1E1B18` | `'flame-smoke'` (wavy campfire) | Woodsmoke char, BBQ, bacon |
| **`SPICY`** | `#991B1B` | `#FFFDF7` | `#1E1B18` | `'chili-pepper'` (triangle chili) | Chili heat, jalapenos, spicy mayo |
| **`RICH`** | `#6B21A8` | `#FFFDF7` | `#1E1B18` | `'crown-diamond'` (diamond/crown) | Wagyu umami, truffle aioli, cheese |
| **`CRISPY`** | `#B45309` | `#FFFDF7` | `#1E1B18` | `'spark-burst'` (6-point star) | Crispy chicken, textured crust |
| **`FRESH`** | `#065F46` | `#FFFDF7` | `#1E1B18` | `'leaf-sprout'` (leaf sprout) | Crisp lettuce, tomato, garden herbs |

---

## 4. Typography Scale

- **Display & Headings**: `'Fredoka', 'Plus Jakarta Sans', system-ui, sans-serif` (weights: 600, 700). Chunky cartoon header styling.
- **Body & Controls**: `'Plus Jakarta Sans', system-ui, sans-serif` (weights: 500, 600, 700).
- **Numbers & Timers**: `font-variant-numeric: tabular-nums` (`.tabular-nums`) to ensure currency increments and round countdowns never jitter horizontally.

---

## 5. Touch Targets & Responsive Viewports

- **Minimum Touch Target**: 44px x 44px (`min-h-[44px] min-w-[44px]`) on all interactive buttons, filter pills, and cards.
- **Target Viewports**:
  - `360 x 640` (mobile-sm: Small Android)
  - `390 x 844` (mobile-md: Modern iPhone)
  - `768 x 1024` (tablet: iPad Mini portrait)
  - `1280 x 800` (desktop: Widescreen)

---

## 6. Phase 1 Diagnostic Screen Layout Specification

- **Header Bar**: Game title ("Bidding Kitchen"), subtitle ("Phase 1: Contracts & Token Swatch"), and live server `/health` status badge.
- **Section 1**: Colorblind-safe TagPill showcase rendering all 5 FlavorTag badges with distinct SVG icons.
- **Section 2**: Tier summary cards for STREET ($20), BISTRO ($30), and CHEFS_TABLE ($40).
- **Section 3**: Responsive grid of all 19 canonical Street Tier ($20 Burger) ingredients grouped by Slot (BUN, PATTY, SAUCE, CHEESE, TOPPING) with name, basePrice, tasteScore, stock badge, and TagPills.

---

## 6. Engine Sandbox Inspector (Phase 2 Component)

The Engine Sandbox Inspector provides interactive browser-side execution of pure game rules:
- **Seed & Archetype Controls**: Numeric seed input, Bot A/B dropdowns (`COMBO`, `GREEDY`, `RANDOM`), and a primary "Simulate Match" button.
- **Collision Presets**: One-click scenario triggers for Wagyu collision testing and Truffle budget tiebreak testing.
- **Match Winner Banner**: High-contrast banner highlighting the winner, win reason, victory title, and key moment recap.
- **Side-by-Side Player Score Cards**: Detailed point tally (Taste + Combos + Secret Order + Leftover Money Bonus) and dish name.
- **5 Round Resolution Cards**: Distinct badge styling for collision types:
  - `NO_COLLISION`: Emerald green pill ("Clear Win")
  - `COLLISION_HIGH_BID`: Amber flame pill ("⚡ Collision: High Bid Win")
  - `COLLISION_TIE_BUDGET`: Purple scale pill ("⚖️ Collision: Budget Tiebreak")
  - `COLLISION_TIE_COINFLIP`: Blue coin pill ("🪙 Collision: Coinflip Tiebreak")
  - `CHEF'S TIP`: Pink chef pill ("👨‍🍳 Chef's Tip +$2") awarded in Round 3 for $\ge 3$ taste point deficits.
