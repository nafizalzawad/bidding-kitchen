# Bidding Kitchen MVP — 50,000-Match Balance Report (Street Tier $20 Burger)

- **Date:** 2026-11-01
- **Simulation Matches per Pairing:** 50,000
- **Base Seed:** 2026
- **Tier:** Street Tier ($20 Burger, 5 Rounds)
- **Stock Mode:** ALL_COLLISIONS_CONTEST
- **Uncontested Pricing:** Base Price ($0 for basic, variant base price for non-basic)

---

## 1. Executive Summary

This balance report analyzes 50,000 simulated head-to-head matches evaluating the competitive human-heuristic model (**SmartBluffBot**), synergistic value play (**ComboValueBot**), greedy value targeting (**GreedyTasteBot**), and baseline noise (**RandomBot**).

### Key Findings:
1. **Target First-Round Snowball Band Verified:** In competitive self-play (**SmartBluffBot vs SmartBluffBot**), the Round-1 winner goes on to win the match **50.3%** of the time (precisely within the **50.0%–55.5%** target band). Out of 50,000 matches, 50,000 had a distinct Round-1 leader, while 0 were tied Plain Bun ($0) openings.
2. **Strategy Dominance Hierarchy:** Competitive heuristics beat greedy stat stacking (**64.3%** win rate) and random noise (**81.7%** win rate), demonstrating that flavor tag synergy and budget conservation beat naive stat chasing.
3. **Collision Economy Pressure:** Round collisions occur in **71.3%** of competitive rounds, enforcing meaningful economic scarcity and tactical reliance on free Basic fallbacks.
4. **No Non-Basic Pick Outliers:** Across all 19 Street variants, every non-Basic ingredient maintains a pick rate between **5.0%** and **65.0%**, ensuring broad strategic diversity without dead picks or mandatory must-buys.
5. **Execution Performance:** 50,000 matches simulated in **1392ms** (35920 matches/sec) with zero memory leaks and 100% determinism.

---

## 2. Matchup Matrix

| Matchup (Bot A vs Bot B) | Bot A Win Rate | Bot B Win Rate | Ties | Avg Score A | Avg Score B | Avg Spent A | Avg Spent B |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **SmartBluff** vs **SmartBluff (Mirror)** | **49.5%** | 50.5% | 0 | 25.6 | 25.6 | $11.1 | $11.1 |
| **SmartBluff** vs **Greedy** | **64.3%** | 35.7% | 0 | 27.3 | 26.3 | $11.6 | $17.6 |
| **SmartBluff** vs **Random** | **81.7%** | 18.3% | 0 | 29.5 | 24.1 | $13.3 | $11.5 |
| **Combo** vs **Greedy** | **81.2%** | 18.8% | 0 | 28.5 | 25.0 | $15.8 | $13.6 |

---

## 3. Collision & Economy Health (Competitive Self-Play)

- **Total Rounds Evaluated:** 250,000
- **Contested Collisions:** 178,322
- **Collision Frequency:** 71.3% of all rounds
- **Round-1 Winner Match Win Rate:** **50.3%** (Target Band: 50.0%–55.5%)
- **Round-1 Distinct Leader Matches:** 50,000
- **Round-1 Tied Openings:** 0

### Leftover Budget Statistics (End of Match):
- **Mean Leftover Money:** $8.88
- **Median Leftover Money:** $9
- **Min Leftover Money:** $0
- **Max Leftover Money:** $20

### Score Distribution Percentiles (Competitive Self-Play):
- **p10:** 21 pts
- **p25:** 23 pts
- **p50 (Median):** 26 pts
- **p75:** 28 pts
- **p90:** 30 pts

---

## 4. Street Tier ($20 Burger) Ingredient Analysis

Analysis across 50,000 competitive self-play matches:

| Slot | Ingredient | Base Price | Taste | Tags | Pick Rate | Win Rate When Picked |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| BUN | **Plain (Basic)** | $0 | 2 | *(None)* | 50.0% | 49.7% |
| BUN | Sesame | $2 | 4 | *(None)* | 37.5% | 44.4% |
| BUN | Brioche | $4 | 6 | RICH | 12.5% | 68.0% |
| PATTY | **Basic Beef (Basic)** | $0 | 3 | *(None)* | 44.1% | 46.2% |
| PATTY | Smash Beef | $5 | 7 | SMOKY | 12.5% | 63.6% |
| PATTY | Crispy Chicken | $4 | 6 | CRISPY | 11.3% | 43.0% |
| PATTY | Wagyu | $8 | 10 | RICH | 32.1% | 52.3% |
| SAUCE | **None (Basic)** | $0 | 0 | *(None)* | 24.5% | 41.0% |
| SAUCE | Ketchup | $1 | 2 | *(None)* | 8.6% | 0.0% |
| SAUCE | Spicy Mayo | $2 | 4 | SPICY | 35.5% | 65.8% |
| SAUCE | Truffle Aioli | $3 | 5 | RICH | 31.4% | 53.0% |
| CHEESE | **None (Basic)** | $0 | 0 | *(None)* | 34.1% | 20.7% |
| CHEESE | American | $1 | 3 | *(None)* | 12.5% | 14.3% |
| CHEESE | Cheddar | $2 | 4 | SMOKY | 14.2% | 71.0% |
| CHEESE | Blue Cheese | $3 | 5 | RICH | 39.2% | 79.3% |
| TOPPING | **None (Basic)** | $0 | 0 | *(None)* | 26.1% | 24.7% |
| TOPPING | Lettuce and Tomato | $1 | 3 | FRESH | 19.9% | 23.4% |
| TOPPING | Bacon | $3 | 5 | SMOKY | 13.5% | 85.8% |
| TOPPING | Jalapeno | $2 | 4 | SPICY | 40.5% | 67.4% |

---

## 5. Combo Frequency Distribution

Distribution of completed combos across all player dishes in competitive self-play:

| Combo | Description | Points | Total Triggered | Trigger Rate / Match |
| :--- | :--- | :---: | :---: | :---: |
| **Smokehouse** | Two or more Smoky items | +4 | 13,483 | 0.27 |
| **Hot and Decadent** | At least 1 Spicy & 1 Rich item | +3 | 52,783 | 1.06 |
| **Crunch Contrast** | At least 1 Crispy & 1 Fresh item | +3 | 10,678 | 0.21 |
| **Chef's Pride** | Complete dish with zero Basic items | +3 | 6,552 | 0.13 |

---

## 6. Verification Against Balance Rules

- [x] **Rule 1 (Scarcity Invariant):** Max base prices sum to $21 ($4 Brioche + $8 Wagyu + $3 Truffle + $3 Blue Cheese + $3 Bacon) > $20 starting budget. Neither player can buy all top items uncontested.
- [x] **Rule 2 (No Snowball Runaway):** Round 1 winner match win rate is 50.3% (within the 50.0%–55.5% target band).
- [x] **Rule 3 (Non-Basic Pick Range):** No non-Basic ingredient has < 5.0% or > 65.0% pick rate.
- [x] **Rule 4 (Meaningful Fallback Reliance):** Fallbacks are triggered in collision losses and budget exhaustion, keeping all players in the game.
- [x] **Rule 5 (Skill Expression):** Competitive heuristics beat naive greedy stat stacking by +28.5% win rate.
