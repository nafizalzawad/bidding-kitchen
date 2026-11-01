# Bidding Kitchen — Design System Specification

## 1. Design Philosophy

- **Art Direction**: "Bright Bouncy Cartoon Kitchen" with chunky tactile surfaces, thick ink borders (`border-2 border-[#1E1B18]`), and responsive physical feedback.
- **Mobile First**: Built specifically for single-thumb mobile play in portrait orientation (360px to 430px), scaling cleanly to 768px tablet and 1280px desktop.
- **Accessibility Invariant**: High contrast ratios compliant with WCAG AA (>= 4.5:1 for normal text, >= 3.0:1 for large text). Non-reliance on color alone for FlavorTags, stock scarcity, or fallback states.
- **Zero Cumulative Layout Shift (CLS = 0)**: Reserved container heights on DishVisualizer (`min-h-[88px]` mobile, `min-h-[220px]` desktop), BidControls dock (`min-h-[116px]`), and TimerBar (`h-[28px]`).

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

- **Minimum Touch Target**: 44px x 44px (`min-h-[44px] min-w-[44px]`) on all interactive buttons, steppers, and cards.
- **Target Viewports**:
  - `360 x 640` (mobile-sm: Small Android)
  - `390 x 844` (mobile-md: Modern iPhone)
  - `768 x 1024` (tablet: iPad Portrait)
  - `1280 x 800` (desktop: Standard Laptop / Netbook)
- **One-Thumb Mobile Zone**: Primary controls (IngredientCard selection, BidControls `-$1` / `+$1` / slider, and "Lock In Bid" CTA) remain within the bottom 60% of portrait screens.
- **Horizontal Overflow Invariant**: `document.documentElement.scrollWidth <= window.innerWidth` across all viewports.

---

## 6. Microcopy Specification Table

| Screen / Component | Element | Canonical Copy | Tone & Intent |
| :--- | :--- | :--- | :--- |
| `LandingScreen` | Header | "Bidding Kitchen" | Welcoming, energetic |
| `LandingScreen` | Subtitle | "Two-player auction cooking battle! Out-bid, out-flavor, build the champion burger." | Clear value proposition |
| `LandingScreen` | Nickname Input | "Enter Chef Nickname (e.g. ChefNafiz)" | Prompting & friendly |
| `LandingScreen` | Create Room CTA | "Create New Kitchen" | Direct action |
| `LandingScreen` | Join Room CTA | "Join Kitchen" | Secondary action |
| `LandingScreen` | Quick Match Pill | "Quick Match (v1.5 Coming Soon)" | Informational roadmap |
| `LobbyScreen` | Room Code Badge | "Room Code: BURG42" | High-visibility shareable code |
| `LobbyScreen` | Copy Link CTA | "Copy Invite Link" (Toasts "Invite link copied to clipboard!") | Fast multiplayer sharing |
| `LobbyScreen` | Waiting State | "Waiting for friend to join..." | Patient, expectant |
| `LobbyScreen` | Ready CTA | "Ready Up / Start Match" | Clear host/guest commitment |
| `TierConfirmed` | Countdown | "Both Chefs Ready! Starting in 3..." | Anticipation builder |
| `MatchIntro` | Banner | "Round 1 of 5: The Bun Auction!" | Transition excitement |
| `AuctionRound` | Timer Bar | "11s remaining" (Turns yellow at 5s, red pulsating at 3s) | Urgent, clear |
| `AuctionRound` | Opponent Header | "ChefMaya Locked In!" / "ChefMaya is thinking..." | Dynamic presence |
| `AuctionRound` | Free Fallback Tag | "FREE Basic Fallback ($0)" | Reassuring safety net |
| `AuctionRound` | Bid Controls Lock | "Lock In Bid ($9 on Wagyu)" | Unambiguous commitment |
| `AuctionRound` | Waiting State | "Bid Locked ($9) — Waiting for opponent..." | Reassuring state feedback |
| `Resolve` | Collision Clash | "COLLISION! Both chefs bid on Wagyu!" | High-stakes drama |
| `Resolve` | High Bid Win | "ChefNafiz won Wagyu for $9!" | Clear outcome |
| `Resolve` | Fallback Award | "ChefMaya keeps $18 and gets Basic Beef ($0)!" | Emphasizes budget retention |
| `FinalReveal` | Reveal Title | "THE GRAND TASTING" | Epic culinary showdown |
| `FinalReveal` | Dish Name | "The Smoky Wagyu Royale" | Playful, culinary flair |
| `FinalReveal` | Winner Title | "ChefMaya takes the Golden Spatula!" | Celebratory |
| `PostMatch` | Key Moment | "Biggest Bid: $9 on Wagyu in Round 2" | Memorable match recap |
| `PostMatch` | Rematch CTA | "Cook Again (Rematch)" | Retention driver |
| `ConnectionBanner` | Disconnect Alert| "Opponent disconnected — waiting for reconnection (28s remaining)..." | Transparent timer |

---

## 7. Responsive Layout Wireframes

### 7.1 Mobile Portrait (360px & 390px)
```text
+------------------------------------+
|  Logo  [Sound] [Rules] [P2 Status] | -> 48px Header
|------------------------------------|
|  TimerBar (28px fixed) [00:11]      | -> Urgency colored
|------------------------------------|
|  Opponent Header ($18, Locked!)    | -> 44px
|------------------------------------|
|  DishVisualizer (min-h: 88px)      | -> Culinary burger stack
|  [ Bottom Bun ]                    |
|------------------------------------|
|  Round 2: Patty (Select Variant)   |
|  [Basic $0]   [Crispy $4]          | -> 2-col responsive grid
|  [Smash $5]   [*Wagyu $8*]         |    min 44px touch targets
|------------------------------------|
|  Sticky BidControls Dock (116px)   | -> Lower 60% thumb zone
|  [- $1]   === [Slider: $9] === [+$1]
|  [      Lock In Bid ($9)          ] | -> 52px Primary CTA
+------------------------------------+
```

### 7.2 Desktop (1280px)
```text
+-------------------------------------------------------------------------+
|  🍔 Bidding Kitchen    [Sound] [Combos]               ChefMaya: $18 🔒   |
+-------------------------------------------------------------------------+
|  TimerBar: 11s remaining [██████████████████████████████████░░░░░░]     |
+------------------------------------+------------------------------------+
|  LEFT: Your Kitchen Dish           |  RIGHT: Auction Floor              |
|                                    |                                    |
|  [ DishVisualizer: min-h: 220px ]  |  Round 2: Patty Selection          |
|  Burger Plate Canvas:              |  [Basic Beef $0] [Chicken $4]      |
|  Brioche Bun Stack                 |  [Smash Beef $5] [Wagyu $8 (1)]    |
|                                    |                                    |
|  Budget: $16 / $20                 |  Bid Controls & Commitment Dock:   |
|                                    |  [- $1]   [ Slider: $9 ]   [+ $1]   |
|  Opponent: ChefMaya ($18)          |  [      Lock In Bid ($9)         ] |
+------------------------------------+------------------------------------+
```

---

## 8. Live Interaction & Networking UX Specifications (Phase 5)

### 8.1 Deep-Link & Invite Flow (`/?room=CODE`)
1. **Host Generation**:
   - Creating a room displays a 6-character room code in high-contrast chunky font (`text-3xl font-extrabold tracking-widest`).
   - "Copy Link" copies `${window.location.origin}/?room=${roomCode}` and displays a success toast (`Invite link copied!`).
2. **Guest Opening Deep Link**:
   - When opened with `/?room=BURG42`, `LandingScreen` switches banner mode to `"Joining Kitchen Room: BURG42"`.
   - `data-testid="join-room-code-input"` is pre-filled with `"BURG42"`.
   - Nickname input is pre-filled from `localStorage['bk_nickname']` (or blank if new).
   - "Join Kitchen BURG42" CTA button is highlighted.

### 8.2 Optimistic Button States
- Interactive action buttons immediately enter a disabled, active state upon click:
  - `Create New Kitchen` -> `"Creating Kitchen..."`
  - `Join Kitchen` -> `"Joining Kitchen..."`
  - `Ready Up & Start Match` -> `"Getting Ready..."`
  - `Lock In Bid` -> `"Locking Bid..."`
- Prevents double-clicks while Socket.IO round-trip acks return (< 30ms typical).

### 8.3 Mid-Match Reconnect & Tab Refresh UX
- On app mount, if `sessionStorage['bk_active_session']` contains `{ roomCode, playerId, reconnectToken }`, a brief `"Reconnecting to Kitchen {roomCode}..."` card is shown while `room:reconnect` executes.
- If reconnection succeeds: Resumes active match state without layout shift. If the user had already locked a bid, restores `"Bid Locked! Waiting for Opponent..."`.
- If reconnection fails (`ROOM_NOT_FOUND`, `ROOM_EXPIRED`, or `UNAUTHORIZED_RECONNECT`): Clears `sessionStorage`, displays a toast (`"Previous match ended or expired"`), and returns to `LandingScreen`.
- Disconnect banner: Displays 30-second countdown in `ConnectionBanner` when opponent disconnects. Transitions to Forfeit victory screen if timeout expires.

---

## 9. Animation, Audio & Juice Specifications (Phase 6)

### 9.1 Mystery Bid Card Back (Pre-Flip at t < 275ms of RESOLVE)
- **Background**: Ink Charcoal `#1E1B18` with `#FFB703` (mustard yellow) dashed border.
- **Centerpiece**: Chef Hat / Cloche crest SVG emblem with `#FFB703` stroke.
- **Microcopy**: `"SEALED BID"` in uppercase bold tracked display font.
- **Contrast**: `#FFB703` on `#1E1B18` yields `10.8:1` contrast (exceeds WCAG AAA).

### 9.2 Revealed Bid Card Face (Post-Flip at t >= 275ms of RESOLVE)
- **Background**: White `#FFFFFF` with 2px solid `#1E1B18` border and drop shadow `shadow-[0_4px_0_#1E1B18]`.
- **Content**: Player nickname badge, `IngredientArt` (48px), ingredient variant name, large tabular bid amount (`$9`).
- **Winner Outcome Ring**: `#1D7A4C` green border ring, gold badge `"Won for $9!"`.
- **Loser Outcome Pill**: `#FFB703` amber badge with shield `"Free Basic ($0)"`.

### 9.3 Floating Cash Deduction Pill (`BudgetBar`)
- When `budgetDelta < 0` (e.g. `-$9` spent on Wagyu):
  - Floating pill `-$$pricePaid` rendered in `#E63946` (Tomato Red) with white bold text.
  - Floats upward by `16px` while fading out over `450ms`.
  - Budget track width drains synchronously using `easeOutCubic`.

### 9.4 Stepwise Scoreboard Progression (`FinalRevealScreen`)
1. **Step 1 (0–650ms)**: "1. Ingredient Taste Points" highlights and counts up from `0` to `tastePoints`.
2. **Step 2 (650–1300ms)**: "2. Combo Bonuses" reveals earned combo pills (`SMOKEHOUSE +4`, `HOT & DECADENT +3`).
3. **Step 3 (1300–1950ms)**: "3. Customer Order" reveals bonus (`+0` in MVP).
4. **Step 4 (1950–2600ms)**: "4. Leftover Cash Bonus" highlights unspent dollars converted to points.
5. **Step 5 (>= 2600ms)**: Final total scores pop up, winner crown is stamped, and confetti bursts.

---

## 10. Accessibility & Keyboard Navigation Specifications (Phase 7)

### 10.1 Keyboard Focus & High-Contrast Ring
- All interactive controls (buttons, inputs, sliders, cards, drawer toggles) implement explicit `:focus-visible` styling:
  - Outline: `3px solid #2563EB` (Royal Blue) with `outline-offset: 2px` and `border-radius: inherit`.
  - Contrast ratio of `#2563EB` on default background `#FFFDF8` exceeds `4.8:1` (WCAG AA).
  - Mouse/touch clicks suppress the outline (`:focus:not(:focus-visible)`).

### 10.2 Keyboard Navigation Loop (Auction Round)
1. **Ingredient Selection**:
   - Each `IngredientCard` is an interactive native `<button>` element with `type="button"`.
   - `aria-pressed="true"` when selected, `"false"` otherwise.
   - Comprehensive `aria-label`: e.g. `"Brioche Bun, Price: $4, Taste: 6 points, Tag: Rich, Stock: 2 remaining"`.
   - `Tab` / `Shift+Tab` navigates between cards; `Space` or `Enter` selects.
2. **Bid Slider & Stepper**:
   - Native `<input type="range">` with `aria-label="Bid dollar amount"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext`.
   - `ArrowLeft` / `ArrowDown` decrements by \$1, `ArrowRight` / `ArrowUp` increments by \$1.
   - Quick-increment buttons (`-$1`, `+$1`, `Max`) have descriptive labels.
3. **Lock In Bid Button**:
   - `Tab` lands on `Lock In Bid ($X)`.
   - `Enter` submits and locks bid.

### 10.3 Screen Reader Live Region (`sr-only` & `aria-live`)
- Dedicated live region (`<div className="sr-only" aria-live="polite" aria-atomic="true">`) announces:
  - Round phase transitions: *"Round 2: Patty Auction. 15 seconds to place your bid."*
  - Lock confirmation: *"Your bid of $5 on Smash Beef is locked. Waiting for opponent."*
  - Resolution outcomes: *"Round resolved! High bid collision: You won Wagyu Patty for $8. Opponent received basic fallback."*
  - Final results: *"Match complete! Final winner: Chef Alice with 22 points to 18 points."*

### 10.4 Colorblindness & Palette Invariants
- Red-green distinction is never purely color-coded:
  - Winner status always combines green background with text label `"WINNER"`, checkmark icon, and gold crown.
  - Fallback loss always combines amber background with `"Free Basic"` text badge and shield icon.
  - Basic fallback items feature distinct dashed borders and `FREE` badges.

### 10.5 Share Result Spec (`PostMatchScreen`)
- "Share Result" button (`data-testid="post-match-share-btn"`) allows 1-click clipboard copying of a clean text summary:
  ```text
  🍔 Bidding Kitchen Match Result
  🏆 Winner: Chef Alice (22 pts) vs Chef Bob (18 pts)
  🍔 Alice's Burger: The Wagyu Smokehouse Tower
  💰 Budget Leftover: $3
  Play Bidding Kitchen: https://biddingkitchen.com
  ```
- Copies to system clipboard via `navigator.clipboard.writeText` and presents a confirmation toast (`"Match summary copied to clipboard!"`).
- Dispatches telemetry event `SHARE_CLICKED`.



