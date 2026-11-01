# Bidding Kitchen — Motion & Physics Specification

## 1. Principles of Cartoon Kitchen Physics

1. **Exaggerated Tactility**: Interactions carry simulated weight, inertia, and spring elasticity. Winning ingredients drop from above and slap onto the dish stack.
2. **Deterministic Time Budgets**: Every network-synchronized state animation has a fixed duration matching server state machine timeouts.
3. **Hardware Acceleration**: Only animate GPU-composited CSS properties (`transform` and `opacity`) to guarantee steady 60fps on mobile devices.
4. **Accessible Reduced-Motion Fallback**: When `prefers-reduced-motion: reduce` is detected, 3D flips and vertical drops are replaced by 120ms linear opacity cross-fades.

---

## 2. Signature Moments Specification Matrix

| # | Signature Element | Trigger / State | Duration (ms) | Easing / Spring Parameters | Delay / Stagger | Reduced-Motion Alternative | Audio Sync Frame | Communicative Purpose |
| :-: | :--- | :--- | :-: | :--- | :--- | :--- | :--- | :-: | :--- |
| **1** | **Round Ingredient Cards Slide-In** | `ROUND_REVEAL` | 350ms | `bouncyKitchen` (stiffness: 380, damping: 22, mass: 0.9) | `staggerChildren: 60ms` | 120ms linear opacity fade | Frame 0 (Slide whoosh) | Introduces round choices with rhythmic entry |
| **2** | **Bid Lock Stamp** | `BIDDING -> LOCKED` | 250ms | `bouncyKitchen` (`scale(1.15) -> scale(1.0)`) | Immediate on user tap | 100ms opacity pop | Frame 2 (Heavy rubber stamp thud) | Confirms bid lock-in with tactile certainty |
| **3** | **Simultaneous Bid Card 3D Flip** | `RESOLVE` start | 550ms | `snappyFlip` (stiffness: 300, damping: 26, `rotateY(0deg -> 180deg)`) | Synchronous for both players | 120ms cross-fade between front/back | Frame 6 (Card-flip snap) | Dramatic reveal of both players' secret bids |
| **4** | **Winner Celebration Pop vs Loser Fallback** | `RESOLVE` +550ms | 400ms | Winner: `scale(1.08)` + gold ring glow; Loser: desaturate 30% + slide in Basic badge | 0ms after flip completion | 120ms color tint shift | Frame 0 (Cash ding or subtle thud) | Signals collision outcome unambiguously |
| **5** | **Ingredient Slap onto Dish Stack** | `RESOLVE` +950ms | 480ms | `heavySlap` (stiffness: 520, damping: 18, mass: 1.1) from `translateY(-120px) scale(1.25)` to `translateY(0) scale(1.0)` with squash `scaleY(0.88) -> 1.0` | 0ms after winner pop | 120ms direct placement | Frame 12 (Juicy pan slap / burger impact) | The signature tactile reward of assembling the dish |
| **6** | **Budget Bar Drain** | `RESOLVE` +1100ms | 450ms | `easeOutCubic` (`[0.22, 1, 0.36, 1]`) width interpolation + tabular counter decrement | 150ms after slap | Instant numerical snap | Frame 0 (Cash register coin chink) | Clear cause-and-effect for money deduction |
| **7** | **Stepwise Final Score Count-Up** | `FINAL_REVEAL` | 2600ms total (4 steps of 650ms each) | `easeOutCubic` number ticker + pulse `scale(1.1) -> 1.0` | 650ms per step (Taste → Combos → Order → Leftover → Total) | 120ms immediate table reveal | Step 1-4 bell chimes ascending | Ramps emotional payoff through sequential category reveals |
| **8** | **Winner Confetti & Title Stamp** | `FINAL_REVEAL` completion | 2200ms | 60-particle canvas confetti burst + title banner stamp (`scale(1.3) -> 1.0`) | 100ms after total score tally | Static trophy icon display | Frame 0 (Celebration trumpet fanfare) | Celebrates match victor and climaxes the user journey |

---

## 3. Motion Tokens Code Interface

Exposed directly from `apps/web/src/tokens/motion-tokens.ts`:
```ts
export function getTransitionConfig(key: MotionKey, prefersReducedMotion: boolean): TransitionConfig;
```
- Under normal motion, returns the exact spring configuration and duration.
- Under reduced motion, returns `{ duration: 0.12, ease: 'linear', animateProperty: 'opacity' }`.

---

## 4. Phase 2 Resolve & Final Reveal Timeline Breakdown

```typescript
export const RESOLVE_TIMELINE_MS = {
  total: 4000,
  bidReveal: 1000,       // 0–1000ms: 3D flip card reveal of both secret bids
  collisionClash: 1200,   // 1000–2200ms: Collision badge pop / clash impact if same item
  winnerAward: 1000,      // 2200–3200ms: Winner variant slap & loser fallback badge
  budgetUpdate: 800,      // 3200–4000ms: Budget drain animation & Chef's Tip pulse if awarded
} as const;

export const FINAL_REVEAL_STEPS_MS = {
  total: 8000,
  tasteCount: 2000,      // 0–2000ms: Base ingredient taste scores ticker count-up
  comboBurst: 2500,      // 2000–4500ms: Combo synergy badges burst with point tallies
  orderBonus: 1500,      // 4500–6000ms: Customer secret order reveal & +5 bonus
  winnerCrown: 2000,     // 6000–8000ms: Winner crown stamp, confetti, and victory title
} as const;
```

Numerical count-up interpolation helper:
```typescript
export function interpolateCountUp(current: number, target: number, progress: number): number;
```

---

## 5. Phase 3 Timer Urgency & Reconnection Motion

```typescript
export const TIMER_URGENCY_THRESHOLDS_MS = {
  CALM: 5000,
  WARNING: 3000,
  CRITICAL: 1000,
} as const;

export type TimerUrgencyState = 'calm' | 'warning' | 'critical';

export function getTimerUrgencyState(remainingMs: number): TimerUrgencyState;
```

### Connection Banner Motion (`CONNECTION_BANNER_MOTION`)
- **Slide In**: Springs down from `translateY(-20px)` to `0` with spring `stiffness: 400, damping: 25`.
- **Pulse**: Warning amber pulse `scale: [1, 1.02, 1]` over 1.2s.
- **Urgent Shake**: Triggered on `remainingMs < 5000ms`, alternating horizontal micro-shakes (`[-3px, 3px]`) over 400ms cycles.
- **Exit**: Slides up with 200ms linear fade.
Calculates clamped linear interpolation for real-time React counter displays.


---

## 5. Reserved Container Heights & Zero Cumulative Layout Shift (CLS = 0)

To guarantee steady 60fps performance and zero layout shifts on mobile devices as ingredients are accumulated or swapped, all primary animated containers enforce fixed minimum dimensions:

| Component | Target Viewport | Reserved Dimension | CSS Rule | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`DishVisualizer`** | Mobile (360px & 390px) | Height: 88px | `min-h-[88px] max-h-[88px]` | Keeps the IngredientCard grid rock-solid as 0 to 5 burger layers are stacked |
| **`DishVisualizer`** | Desktop (1280px) | Height: 220px | `min-h-[220px]` | Generous ceramic plate hero canvas on desktop |
| **`BidControls`** | Mobile (360px & 390px) | Height: 116px | `min-h-[116px]` | Switching from $0 Basic to $8 Wagyu preserves Lock Bid button Y position |
| **`TimerBar`** | All Viewports | Height: 28px | `h-[28px]` | Fixed track height with tabular countdown to prevent header jitter |
| **`OpponentStatusHeader`** | All Viewports | Height: 44px | `min-h-[44px]` | Fixed HUD status bar preventing content jump on locked state change |

### 5.1 Verification Protocol for CLS
During Playwright visual QA (`static-screens.spec.ts`):
1. Select Basic Beef (`$0`). Measure bounding box `{ x, y, width, height }` of `data-testid="lock-bid-btn"`.
2. Select Wagyu (`$8`). Re-measure bounding box.
3. Assert `Math.abs(y1 - y2) === 0`.
