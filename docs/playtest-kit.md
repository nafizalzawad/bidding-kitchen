# Bidding Kitchen: 10-Pair Playtest Kit (MVP $20 Street Burger)

This document provides the structured protocol, facilitator script, observation rubric, post-match survey, and telemetry gates for the 10-pair (20-participant) qualitative playtest pass of the $20 Street Burger tier.

---

## 1. Playtest Objective & Hypothesis

### Objective
Evaluate onboarding friction, simultaneous bidding tension, card-reveal comprehension, score buildup legibility, and rematch appetite across 10 paired matches (20 distinct human participants) on mobile and desktop web viewports.

### Primary Hypotheses
1. **Rule Comprehension**: Players understand within 1 round that collision results in high bid winning, ties coin-flipping, and losers receiving a free $0 basic fallback with budget intact.
2. **Bidding Tension**: Players experience emotional tension during the 15-second countdown and card-flip reveal without experiencing debilitating cognitive overload.
3. **Comeback Feasibility**: Players who lose Round 1 do not surrender or disengage, recognizing that their conserved budget enables late-round dominance.
4. **Rematch Appetite**: At least 40% of pairs opt to play an immediate rematch.

---

## 2. Participant Profile & Setup

### Cohort Breakdown (10 Pairs / 20 Participants)
- **Pairs 1–3 (Casual Mobile Users)**: Tested on mobile smartphones (iOS Safari / Chrome Android, 360px–390px viewport).
- **Pairs 4–6 (Competitive Gamers)**: Board game / card game / poker / auto-battler players on desktop Chrome/Edge (1280px+ viewport).
- **Pairs 7–8 (Mixed Devices)**: 1 player on mobile smartphone, 1 player on desktop/laptop.
- **Pairs 9–10 (Accessibility & Keyboard)**: 1 player using keyboard navigation (`Tab`, `Space`, `Enter`, Arrow keys) and screen-reader assistance.

### Room & Device Setup
- Two players in adjacent seats or remote video call (no direct screen peeking).
- Server running production or staging build with authoritative timers.
- Facilitator observing and recording audio/notes.

---

## 3. Facilitator Protocol & Script

### Pre-Match Briefing (2 minutes)
> *"Welcome to Bidding Kitchen! You are competing head-to-head in a fast-paced 5-round culinary auction to craft the tastiest Street Burger.*
> 
> *Here are the golden rules:*
> 1. *Both chefs start with \$20.*
> 2. *Each round presents 3–4 burger ingredients (Bun, Patty, Cheese, Topping, Sauce). One is always a free \$0 basic fallback.*
> 3. *You choose an ingredient and lock in a secret dollar bid within 15 seconds.*
> 4. *If you bid on different items, you both win at your bid price.*
> 5. *If you bid on the same item, the higher bid wins! The loser pays \$0 and gets the free basic fallback item with full budget saved.*
> 6. *Complete secret customer orders and ingredient combos for massive bonus points!*
> 7. *Leftover cash at the end gives bonus points (\$1 = 0.5 pts), so spend wisely!*
> 
> *Chef 1, tap 'Create Room' and share the 6-letter room code or link with Chef 2. When you're both ready, hit 'Ready Up'!"*

### In-Match Facilitator Observations (Passive Observation)
- Do NOT guide or advise players during bidding.
- Note verbal reactions at the moment of:
  - First card flip (Round 1)
  - First contested collision
  - Tiebreak coin flip
  - Chef's Pride or Combo trigger
  - Final score reveal and dish naming

### Post-Match Wrap-Up (3 minutes)
1. Direct both players to review their Burger score breakdown.
2. Ask both players to complete the 5-question survey.
3. Prompt: *"Would you like to rematch or swap roles?"* Note whether they click Rematch.

---

## 4. Facilitator Observation Rubric

Rate each item for each pair (Yes / Partial / No) with timestamped field notes:

| Criterion | Target Behavior | Observations / Friction Notes |
| :--- | :--- | :--- |
| **Room Join Speed** | Joined within 30 seconds via 6-letter code or invite URL | |
| **Tutorial Comprehension** | Completed 4-step tutorial overlay without getting stuck | |
| **First Bid Decision** | Locked first bid within 8 seconds without timing out | |
| **Collision Comprehension** | Understood why fallback was awarded without asking facilitator | |
| **Secret Order Awareness** | Checked Customer Order card / Combo drawer during draft | |
| **Budget Conservation** | Recognized leftover money bonus on post-match screen | |
| **Rematch Instinct** | Clicked rematch or expressed desire for a second game | |

---

## 5. Post-Match Player Survey (5-Point Likert)

Each participant completes this 1-minute survey immediately following their match:

1. **Clarity of Rules**: "I immediately understood how bidding collisions and basic fallbacks worked."
   - `[ 1 - Strongly Disagree ] [ 2 ] [ 3 ] [ 4 ] [ 5 - Strongly Agree ]`
2. **Pacing & Tension**: "The 15-second bidding timer and card flip created exciting tension without rushing me."
   - `[ 1 - Strongly Disagree ] [ 2 ] [ 3 ] [ 4 ] [ 5 - Strongly Agree ]`
3. **Strategic Depth**: "I felt I had meaningful comeback potential even if I lost early rounds."
   - `[ 1 - Strongly Disagree ] [ 2 ] [ 3 ] [ 4 ] [ 5 - Strongly Agree ]`
4. **Visual & Audio Delight**: "The burger stacking, animations, audio chimes, and dish titles felt satisfying."
   - `[ 1 - Strongly Disagree ] [ 2 ] [ 3 ] [ 4 ] [ 5 - Strongly Agree ]`
5. **Replay Appeal**: "I want to play another match right now."
   - `[ 1 - Strongly Disagree ] [ 2 ] [ 3 ] [ 4 ] [ 5 - Strongly Agree ]`

**Qualitative Open Question**:
- *"What was the most exciting or surprising moment of your match?"*
- *"What was confusing or frustrating, if anything?"*

---

## 6. Telemetry Verification Gates

Following the 10-pair playtest, server telemetry retrieved from `GET /metrics` must satisfy the following acceptance thresholds:

| Metric | Target Gate | Verification Formula / Source |
| :--- | :--- | :--- |
| **Rematch Rate** | $\ge 40\%$ | `rematchesStarted / matchesCompleted >= 0.40` |
| **Tutorial Completion** | $\ge 90\%$ | Completed first-time onboarding flow |
| **Avg Time to First Bid** | $\le 7000\text{ ms}$ | `avgTimeToFirstBidMs <= 7000` |
| **Round 1 Snowball Gate** | $50.0\% - 55.5\%$ | `firstRoundWinnerWinRate` within balanced band |
| **Ingredient Diversity** | $0$ unused items | Every variant has pick count $\ge 1$ across 10 matches |
| **Avg Leftover Money** | $\$3.00 - \$10.00$ | `avgLeftoverMoney` reflects healthy economic pacing |
| **Disconnect Rate** | $\le 5.0\%$ | `disconnectRate <= 0.05` |
| **Server Round Resolve** | $\le 50\text{ ms}$ | `avgRoundResolveMs <= 50` |
