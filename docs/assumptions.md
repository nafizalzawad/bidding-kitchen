# Bidding Kitchen — System Assumptions & Master Plan Clarifications

## 1. Six Core Master Plan Clarifications

1. **Sealed Simultaneous Bidding**:
   - Both players submit bids secretly during the 15-second round window.
   - Opponent's choice of ingredient and bid amount remain strictly on the server (`privateBids`) until both players lock or the round timer expires. Clients only receive an opaque `round:player_locked` indicator.

2. **Inaction & Timeout Auto-Bid**:
   - If the 15-second countdown ends without an explicit `bid:lock` submission, the server auto-submits a `$0` bid on that Slot's Basic fallback with `isAutoTimeoutBid: true`.
   - The match never stalls or kicks the inactive player.

3. **Collision & Tiebreak Precedence**:
   - If players target different variants, each wins their pick and pays list `basePrice` (when `MatchConfig.uncontestedPaysBasePrice` is true).
   - If players target the same non-basic variant (Collision), the higher bid wins and pays the bid; the loser keeps 100% of their money and receives the free Basic fallback (`$0`).
   - If bids are tied on a collision, the tie is broken deterministically:
     1. Strictly higher remaining budget prior to the round wins.
     2. If pre-round budgets are equal, a seeded server PRNG coinflip (`Match.seed`) decides.

4. **Deterministic Scoring Formula**:
   - `Final Score = Taste Points + Combo Bonuses + Order Bonus + Leftover Money Bonus`
   - `Leftover Money Bonus = Math.round(remainingBudget * 0.5)`.
   - Ties on final score are broken by total money spent (less spent wins), and if still equal, seeded coinflip.

5. **Economic Scarcity Invariant ($21 Max vs $20 Budget)**:
   - Sum of the highest-cost variants across the 5 Street Tier slots:
     - Brioche Bun: $4
     - Wagyu Patty: $8
     - Truffle Aioli: $3
     - Blue Cheese: $3
     - Bacon Topping: $3
     - Total = **$21**
   - Because $21 strictly exceeds `TIERS.STREET.startingBudget` ($20), a player cannot blindly buy the top item in every slot, enforcing strategic trade-offs and bluffing.

6. **Network Fault Tolerance & Reconnection**:
   - Disconnections trigger a 30,000ms (`RECONNECT_WINDOW_MS = 30000`) reconnect window.
   - If the player reconnects with valid `reconnectToken`, match state is synchronized seamlessly.
   - If the timer expires without reconnection, the remaining player wins by forfeit.

7. **Socket Event AckResponse TypeScript Definition**:
   - `AckResponse<T = Record<string, never>>`: In modern TypeScript, strict intersection `({ ok: true } & Record<string, never>)` evaluates property `ok` to `true & never` = `never` because `Record<string, never>` specifies no properties may exist. To preserve the default zero-parameter signature `AckResponse` across event callbacks while accepting empty payload `{ ok: true }`, the type is refined conditionally: `({ ok: true } & (T extends Record<string, never> ? Record<string, unknown> : T)) | { ok: false; error: GameError }`.
