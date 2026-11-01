import {
  STREET_INGREDIENTS,
  CUSTOMER_ORDERS,
  COMBOS,
  type PublicMatchView,
  type PublicPlayerView,
  type RoundResolution,
  type GameError,
  type Ingredient,
  type AwardedIngredient,
  type MatchConfig,
  type Result,
  type ScoreBreakdown,
} from '@bidding-kitchen/shared';

export type HarnessStateKey =
  | 'LANDING'
  | 'LOBBY_HOST'
  | 'LOBBY_GUEST_READY'
  | 'TIER_CONFIRMED_COUNTDOWN'
  | 'MATCH_INTRO'
  | 'TUTORIAL_OVERLAY'
  | 'BIDDING_ACTIVE'
  | 'BIDDING_LOCKED_WAITING'
  | 'ROUND_RESOLVE_COLLISION'
  | 'ROUND_END_BREATHER'
  | 'FINAL_REVEAL'
  | 'POST_MATCH'
  | 'OPPONENT_DISCONNECTED'
  | 'ERROR_EMPTY_STATE';

export interface HarnessStateData {
  key: HarnessStateKey;
  label: string;
  match: PublicMatchView | null;
  myPlayerId: string;
  opponentPlayerId: string;
  error?: GameError;
  toastMessage?: string;
  showTutorial?: boolean;
  countdownSeconds?: number;
}

const streetConfig: MatchConfig = {
  stockMode: 'ALL_COLLISIONS_CONTEST',
  uncontestedPaysBasePrice: true,
  enableCustomerOrders: true,
  enableChefsTip: true,
  showOpponentBudget: true,
  biddingDurationMs: 15000,
  reconnectWindowMs: 30000,
};

// Canonical Ingredients
const brioche = STREET_INGREDIENTS.find((i) => i.id === 'street_bun_brioche')!;
const sesame = STREET_INGREDIENTS.find((i) => i.id === 'street_bun_sesame')!;
const basicPatty = STREET_INGREDIENTS.find((i) => i.id === 'street_patty_basic')!;
const wagyu = STREET_INGREDIENTS.find((i) => i.id === 'street_patty_wagyu')!;
const truffleSauce = STREET_INGREDIENTS.find((i) => i.id === 'street_sauce_truffle')!;
const chipotleSauce = STREET_INGREDIENTS.find((i) => i.id === 'street_sauce_chipotle')!;
const cheddarCheese = STREET_INGREDIENTS.find((i) => i.id === 'street_cheese_aged_cheddar')!;
const americanCheese = STREET_INGREDIENTS.find((i) => i.id === 'street_cheese_american')!;
const baconTopping = STREET_INGREDIENTS.find((i) => i.id === 'street_topping_bacon')!;
const picklesTopping = STREET_INGREDIENTS.find((i) => i.id === 'street_topping_pickles')!;

const pattyVariants: Ingredient[] = STREET_INGREDIENTS.filter((i) => i.slot === 'PATTY');
const sauceVariants: Ingredient[] = STREET_INGREDIENTS.filter((i) => i.slot === 'SAUCE');

// Round 1 Resolution (Brioche $4 vs Sesame $2 - uncontested)
const r1Resolution: RoundResolution = {
  roundIndex: 0,
  slot: 'BUN',
  bidsByPlayer: {
    p1: { playerId: 'p1', roundIndex: 0, ingredientId: 'street_bun_brioche', amount: 4, lockedAt: 1000, isAutoTimeoutBid: false },
    p2: { playerId: 'p2', roundIndex: 0, ingredientId: 'street_bun_sesame', amount: 2, lockedAt: 1200, isAutoTimeoutBid: false },
  },
  outcomeType: 'NO_COLLISION',
  awardsByPlayer: {
    p1: { roundIndex: 0, slot: 'BUN', ingredient: brioche, wonVia: 'UNCONTESTED', pricePaid: 4 },
    p2: { roundIndex: 0, slot: 'BUN', ingredient: sesame, wonVia: 'UNCONTESTED', pricePaid: 2 },
  },
  budgetsBeforeRound: { p1: 20, p2: 20 },
  budgetsAfterRound: { p1: 16, p2: 18 },
  chefsTipAwardedToPlayerId: null,
};

// Round 2 Resolution (Collision on Wagyu: P1 bid 9 won, P2 bid 8 got basic fallback)
const r2Resolution: RoundResolution = {
  roundIndex: 1,
  slot: 'PATTY',
  bidsByPlayer: {
    p1: { playerId: 'p1', roundIndex: 1, ingredientId: 'street_patty_wagyu', amount: 9, lockedAt: 2000, isAutoTimeoutBid: false },
    p2: { playerId: 'p2', roundIndex: 1, ingredientId: 'street_patty_wagyu', amount: 8, lockedAt: 2100, isAutoTimeoutBid: false },
  },
  outcomeType: 'COLLISION_HIGH_BID',
  awardsByPlayer: {
    p1: { roundIndex: 1, slot: 'PATTY', ingredient: wagyu, wonVia: 'HIGH_BID', pricePaid: 9 },
    p2: { roundIndex: 1, slot: 'PATTY', ingredient: basicPatty, wonVia: 'FALLBACK_LOSS', pricePaid: 0 },
  },
  budgetsBeforeRound: { p1: 16, p2: 18 },
  budgetsAfterRound: { p1: 7, p2: 18 },
  chefsTipAwardedToPlayerId: null,
};

// Round 3 Resolution (Chipotle vs Truffle)
const r3Resolution: RoundResolution = {
  roundIndex: 2,
  slot: 'SAUCE',
  bidsByPlayer: {
    p1: { playerId: 'p1', roundIndex: 2, ingredientId: 'street_sauce_chipotle', amount: 2, lockedAt: 3000, isAutoTimeoutBid: false },
    p2: { playerId: 'p2', roundIndex: 2, ingredientId: 'street_sauce_truffle', amount: 3, lockedAt: 3100, isAutoTimeoutBid: false },
  },
  outcomeType: 'NO_COLLISION',
  awardsByPlayer: {
    p1: { roundIndex: 2, slot: 'SAUCE', ingredient: chipotleSauce, wonVia: 'UNCONTESTED', pricePaid: 2 },
    p2: { roundIndex: 2, slot: 'SAUCE', ingredient: truffleSauce, wonVia: 'UNCONTESTED', pricePaid: 3 },
  },
  budgetsBeforeRound: { p1: 7, p2: 18 },
  budgetsAfterRound: { p1: 5, p2: 15 },
  chefsTipAwardedToPlayerId: null,
};

// Round 4 Resolution (American vs Cheddar)
const r4Resolution: RoundResolution = {
  roundIndex: 3,
  slot: 'CHEESE',
  bidsByPlayer: {
    p1: { playerId: 'p1', roundIndex: 3, ingredientId: 'street_cheese_american', amount: 2, lockedAt: 4000, isAutoTimeoutBid: false },
    p2: { playerId: 'p2', roundIndex: 3, ingredientId: 'street_cheese_aged_cheddar', amount: 2, lockedAt: 4100, isAutoTimeoutBid: false },
  },
  outcomeType: 'NO_COLLISION',
  awardsByPlayer: {
    p1: { roundIndex: 3, slot: 'CHEESE', ingredient: americanCheese, wonVia: 'UNCONTESTED', pricePaid: 2 },
    p2: { roundIndex: 3, slot: 'CHEESE', ingredient: cheddarCheese, wonVia: 'UNCONTESTED', pricePaid: 2 },
  },
  budgetsBeforeRound: { p1: 5, p2: 15 },
  budgetsAfterRound: { p1: 3, p2: 13 },
  chefsTipAwardedToPlayerId: null,
};

// Round 5 Resolution (Pickles vs Bacon)
const r5Resolution: RoundResolution = {
  roundIndex: 4,
  slot: 'TOPPING',
  bidsByPlayer: {
    p1: { playerId: 'p1', roundIndex: 4, ingredientId: 'street_topping_pickles', amount: 1, lockedAt: 5000, isAutoTimeoutBid: false },
    p2: { playerId: 'p2', roundIndex: 4, ingredientId: 'street_topping_bacon', amount: 4, lockedAt: 5100, isAutoTimeoutBid: false },
  },
  outcomeType: 'NO_COLLISION',
  awardsByPlayer: {
    p1: { roundIndex: 4, slot: 'TOPPING', ingredient: picklesTopping, wonVia: 'UNCONTESTED', pricePaid: 1 },
    p2: { roundIndex: 4, slot: 'TOPPING', ingredient: baconTopping, wonVia: 'UNCONTESTED', pricePaid: 4 },
  },
  budgetsBeforeRound: { p1: 3, p2: 13 },
  budgetsAfterRound: { p1: 2, p2: 9 },
  chefsTipAwardedToPlayerId: null,
};

// Completed Dishes for Worked Example 4
const p1DishFull: AwardedIngredient[] = [
  { roundIndex: 0, slot: 'BUN', ingredient: brioche, wonVia: 'UNCONTESTED', pricePaid: 4 },
  { roundIndex: 1, slot: 'PATTY', ingredient: wagyu, wonVia: 'HIGH_BID', pricePaid: 9 },
  { roundIndex: 2, slot: 'SAUCE', ingredient: chipotleSauce, wonVia: 'UNCONTESTED', pricePaid: 2 },
  { roundIndex: 3, slot: 'CHEESE', ingredient: americanCheese, wonVia: 'UNCONTESTED', pricePaid: 2 },
  { roundIndex: 4, slot: 'TOPPING', ingredient: picklesTopping, wonVia: 'UNCONTESTED', pricePaid: 1 },
];

const p2DishFull: AwardedIngredient[] = [
  { roundIndex: 0, slot: 'BUN', ingredient: sesame, wonVia: 'UNCONTESTED', pricePaid: 2 },
  { roundIndex: 1, slot: 'PATTY', ingredient: basicPatty, wonVia: 'FALLBACK_LOSS', pricePaid: 0 },
  { roundIndex: 2, slot: 'SAUCE', ingredient: truffleSauce, wonVia: 'UNCONTESTED', pricePaid: 3 },
  { roundIndex: 3, slot: 'CHEESE', ingredient: cheddarCheese, wonVia: 'UNCONTESTED', pricePaid: 2 },
  { roundIndex: 4, slot: 'TOPPING', ingredient: baconTopping, wonVia: 'UNCONTESTED', pricePaid: 4 },
];

const p1ScoreBreakdown: ScoreBreakdown = {
  playerId: 'p1',
  tastePoints: 21,
  combos: [COMBOS.HOT_AND_DECADENT],
  comboPoints: 3,
  orderCompleted: true,
  orderBonusPoints: 5,
  leftoverBudget: 2,
  leftoverMoneyRawBonus: 1.0,
  leftoverMoneyBonus: 1,
  totalSpent: 18,
  finalScore: 31,
  generatedDishName: 'The Smoky Wagyu Deluxe',
};

const p2ScoreBreakdown: ScoreBreakdown = {
  playerId: 'p2',
  tastePoints: 24,
  combos: [COMBOS.SMOKEHOUSE, COMBOS.CRUNCH_CONTRAST],
  comboPoints: 7,
  orderCompleted: false,
  orderBonusPoints: 0,
  leftoverBudget: 9,
  leftoverMoneyRawBonus: 4.5,
  leftoverMoneyBonus: 5,
  totalSpent: 11,
  finalScore: 37,
  generatedDishName: 'The Smoky Wagyu Royale',
};

const workedExampleResult: Result = {
  winnerId: 'p2',
  winReason: 'SCORE',
  forfeitedByPlayerId: null,
  winnerTitle: 'Master Chef',
  scoresByPlayer: {
    p1: p1ScoreBreakdown,
    p2: p2ScoreBreakdown,
  },
  roundHistory: [r1Resolution, r2Resolution, r3Resolution, r4Resolution, r5Resolution],
  keyMomentText: 'ChefMaya won with 37 points and took the Golden Spatula!',
};

const baseP1: PublicPlayerView = {
  id: 'p1',
  nickname: 'ChefNafiz',
  seat: 0,
  ready: false,
  connected: true,
  disconnectedAt: null,
  budget: 20,
  dish: [],
  secretOrder: null,
  chefsTipGranted: false,
};

const baseP2: PublicPlayerView = {
  id: 'p2',
  nickname: 'ChefMaya',
  seat: 1,
  ready: false,
  connected: true,
  disconnectedAt: null,
  budget: 20,
  dish: [],
  secretOrder: null,
  chefsTipGranted: false,
};

export const MOCK_HARNESS_STATES: Record<HarnessStateKey, HarnessStateData> = {
  LANDING: {
    key: 'LANDING',
    label: '1. Landing Screen (Create / Join)',
    match: null,
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
  },

  LOBBY_HOST: {
    key: 'LOBBY_HOST',
    label: '2. Lobby (Host Waiting for Guest)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    match: {
      id: 'match_burg42',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'LOBBY',
      config: streetConfig,
      roundIndex: 0,
      myPlayerId: 'p1',
      players: [{ ...baseP1, ready: false }, null],
      currentRound: null,
      remainingStock: { street_patty_wagyu: 1 },
      result: null,
      serverNow: Date.now(),
      stateEnteredAt: Date.now(),
      stateDeadlineAt: Date.now() + 15000,
    },
  },

  LOBBY_GUEST_READY: {
    key: 'LOBBY_GUEST_READY',
    label: '3. Lobby (Both Seated, Guest Ready)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    match: {
      id: 'match_burg42',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'LOBBY',
      config: streetConfig,
      roundIndex: 0,
      myPlayerId: 'p1',
      players: [{ ...baseP1, ready: false }, { ...baseP2, ready: true }],
      currentRound: null,
      remainingStock: { street_patty_wagyu: 1 },
      result: null,
      serverNow: Date.now(),
      stateEnteredAt: Date.now(),
      stateDeadlineAt: Date.now() + 15000,
    },
  },

  TIER_CONFIRMED_COUNTDOWN: {
    key: 'TIER_CONFIRMED_COUNTDOWN',
    label: '4. Tier Confirmed (Countdown Starting in 3s)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    countdownSeconds: 3,
    match: {
      id: 'match_burg42',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'TIER_CONFIRMED',
      config: streetConfig,
      roundIndex: 0,
      myPlayerId: 'p1',
      players: [{ ...baseP1, ready: true }, { ...baseP2, ready: true }],
      currentRound: null,
      remainingStock: { street_patty_wagyu: 1 },
      result: null,
      serverNow: Date.now(),
      stateEnteredAt: Date.now(),
      stateDeadlineAt: Date.now() + 3000,
    },
  },

  MATCH_INTRO: {
    key: 'MATCH_INTRO',
    label: '5. Match Intro (Face-to-Face Chefs)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    match: {
      id: 'match_burg42',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'MATCH_INTRO',
      config: streetConfig,
      roundIndex: 0,
      myPlayerId: 'p1',
      players: [{ ...baseP1, ready: true }, { ...baseP2, ready: true }],
      currentRound: null,
      remainingStock: { street_patty_wagyu: 1 },
      result: null,
      serverNow: Date.now(),
      stateEnteredAt: Date.now(),
      stateDeadlineAt: Date.now() + 3000,
    },
  },

  TUTORIAL_OVERLAY: {
    key: 'TUTORIAL_OVERLAY',
    label: '6. Tutorial Overlay (3-Step Onboarding)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    showTutorial: true,
    match: {
      id: 'match_burg42',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'MATCH_INTRO',
      config: streetConfig,
      roundIndex: 0,
      myPlayerId: 'p1',
      players: [{ ...baseP1, ready: true }, { ...baseP2, ready: true }],
      currentRound: null,
      remainingStock: { street_patty_wagyu: 1 },
      result: null,
      serverNow: Date.now(),
      stateEnteredAt: Date.now(),
      stateDeadlineAt: Date.now() + 3000,
    },
  },

  BIDDING_ACTIVE: {
    key: 'BIDDING_ACTIVE',
    label: '7. Bidding Active (Round 2 Patty, 11s left, P2 locked)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    countdownSeconds: 11,
    match: {
      id: 'match_burg42',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'BIDDING',
      config: streetConfig,
      roundIndex: 1,
      myPlayerId: 'p1',
      players: [
        {
          ...baseP1,
          budget: 16,
          dish: [{ roundIndex: 0, slot: 'BUN', ingredient: brioche, wonVia: 'UNCONTESTED', pricePaid: 4 }],
        },
        {
          ...baseP2,
          budget: 18,
          dish: [{ roundIndex: 0, slot: 'BUN', ingredient: sesame, wonVia: 'UNCONTESTED', pricePaid: 2 }],
        },
      ],
      currentRound: {
        roundIndex: 1,
        slot: 'PATTY',
        availableIngredients: pattyVariants,
        bidsLockedByPlayer: { p1: false, p2: true },
        myLockedBid: null,
        resolution: null,
        startedAt: Date.now() - 4000,
        deadlineAt: Date.now() + 11000,
      },
      remainingStock: { street_patty_wagyu: 1 },
      result: null,
      serverNow: Date.now(),
      stateEnteredAt: Date.now() - 4000,
      stateDeadlineAt: Date.now() + 11000,
    },
  },

  BIDDING_LOCKED_WAITING: {
    key: 'BIDDING_LOCKED_WAITING',
    label: '8. Bidding Locked (Waiting for Opponent)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    countdownSeconds: 8,
    match: {
      id: 'match_burg42',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'BIDDING',
      config: streetConfig,
      roundIndex: 1,
      myPlayerId: 'p1',
      players: [
        {
          ...baseP1,
          budget: 16,
          dish: [{ roundIndex: 0, slot: 'BUN', ingredient: brioche, wonVia: 'UNCONTESTED', pricePaid: 4 }],
        },
        {
          ...baseP2,
          budget: 18,
          dish: [{ roundIndex: 0, slot: 'BUN', ingredient: sesame, wonVia: 'UNCONTESTED', pricePaid: 2 }],
        },
      ],
      currentRound: {
        roundIndex: 1,
        slot: 'PATTY',
        availableIngredients: pattyVariants,
        bidsLockedByPlayer: { p1: true, p2: false },
        myLockedBid: {
          playerId: 'p1',
          roundIndex: 1,
          ingredientId: 'street_patty_wagyu',
          amount: 9,
          lockedAt: Date.now() - 1000,
          isAutoTimeoutBid: false,
        },
        resolution: null,
        startedAt: Date.now() - 7000,
        deadlineAt: Date.now() + 8000,
      },
      remainingStock: { street_patty_wagyu: 1 },
      result: null,
      serverNow: Date.now(),
      stateEnteredAt: Date.now() - 7000,
      stateDeadlineAt: Date.now() + 8000,
    },
  },

  ROUND_RESOLVE_COLLISION: {
    key: 'ROUND_RESOLVE_COLLISION',
    label: '9. Round Resolve (Collision on Wagyu $9 vs $8)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    countdownSeconds: 3,
    match: {
      id: 'match_burg42',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'RESOLVE',
      config: streetConfig,
      roundIndex: 1,
      myPlayerId: 'p1',
      players: [
        {
          ...baseP1,
          budget: 7,
          dish: [
            { roundIndex: 0, slot: 'BUN', ingredient: brioche, wonVia: 'UNCONTESTED', pricePaid: 4 },
            { roundIndex: 1, slot: 'PATTY', ingredient: wagyu, wonVia: 'HIGH_BID', pricePaid: 9 },
          ],
        },
        {
          ...baseP2,
          budget: 18,
          dish: [
            { roundIndex: 0, slot: 'BUN', ingredient: sesame, wonVia: 'UNCONTESTED', pricePaid: 2 },
            { roundIndex: 1, slot: 'PATTY', ingredient: basicPatty, wonVia: 'FALLBACK_LOSS', pricePaid: 0 },
          ],
        },
      ],
      currentRound: {
        roundIndex: 1,
        slot: 'PATTY',
        availableIngredients: pattyVariants,
        bidsLockedByPlayer: { p1: true, p2: true },
        myLockedBid: {
          playerId: 'p1',
          roundIndex: 1,
          ingredientId: 'street_patty_wagyu',
          amount: 9,
          lockedAt: Date.now() - 3000,
          isAutoTimeoutBid: false,
        },
        resolution: r2Resolution,
        startedAt: Date.now() - 2000,
        deadlineAt: Date.now() + 3000,
      },
      remainingStock: { street_patty_wagyu: 0 },
      result: null,
      serverNow: Date.now(),
      stateEnteredAt: Date.now() - 2000,
      stateDeadlineAt: Date.now() + 3000,
    },
  },

  ROUND_END_BREATHER: {
    key: 'ROUND_END_BREATHER',
    label: '10. Round End Breather (After Round 2, Sauce Next)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    countdownSeconds: 3,
    match: {
      id: 'match_burg42',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'ROUND_END',
      config: streetConfig,
      roundIndex: 1,
      myPlayerId: 'p1',
      players: [
        {
          ...baseP1,
          budget: 7,
          dish: [
            { roundIndex: 0, slot: 'BUN', ingredient: brioche, wonVia: 'UNCONTESTED', pricePaid: 4 },
            { roundIndex: 1, slot: 'PATTY', ingredient: wagyu, wonVia: 'HIGH_BID', pricePaid: 9 },
          ],
        },
        {
          ...baseP2,
          budget: 18,
          dish: [
            { roundIndex: 0, slot: 'BUN', ingredient: sesame, wonVia: 'UNCONTESTED', pricePaid: 2 },
            { roundIndex: 1, slot: 'PATTY', ingredient: basicPatty, wonVia: 'FALLBACK_LOSS', pricePaid: 0 },
          ],
        },
      ],
      currentRound: null,
      remainingStock: { street_patty_wagyu: 0 },
      result: null,
      serverNow: Date.now(),
      stateEnteredAt: Date.now(),
      stateDeadlineAt: Date.now() + 3000,
    },
  },

  FINAL_REVEAL: {
    key: 'FINAL_REVEAL',
    label: '11. Final Reveal (Worked Example 4, Maya Wins)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    match: {
      id: 'match_burg42',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'FINAL_REVEAL',
      config: streetConfig,
      roundIndex: 4,
      myPlayerId: 'p1',
      players: [
        {
          ...baseP1,
          budget: 2,
          secretOrder: CUSTOMER_ORDERS[0] ?? null,
          dish: p1DishFull,
        },
        {
          ...baseP2,
          budget: 9,
          secretOrder: CUSTOMER_ORDERS[1] ?? null,
          dish: p2DishFull,
        },
      ],
      currentRound: null,
      remainingStock: {},
      result: workedExampleResult,
      serverNow: Date.now(),
      stateEnteredAt: Date.now(),
      stateDeadlineAt: Date.now() + 8000,
    },
  },

  POST_MATCH: {
    key: 'POST_MATCH',
    label: '12. Post Match (Stats, Bid History, Rematch)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    match: {
      id: 'match_burg42',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'POST_MATCH',
      config: streetConfig,
      roundIndex: 4,
      myPlayerId: 'p1',
      players: [
        {
          ...baseP1,
          budget: 2,
          secretOrder: CUSTOMER_ORDERS[0] ?? null,
          dish: p1DishFull,
        },
        {
          ...baseP2,
          budget: 9,
          secretOrder: CUSTOMER_ORDERS[1] ?? null,
          dish: p2DishFull,
        },
      ],
      currentRound: null,
      remainingStock: {},
      result: workedExampleResult,
      serverNow: Date.now(),
      stateEnteredAt: Date.now(),
      stateDeadlineAt: 0,
    },
  },

  OPPONENT_DISCONNECTED: {
    key: 'OPPONENT_DISCONNECTED',
    label: '13. Opponent Disconnected (28s Reconnect Timer)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    toastMessage: 'ChefMaya disconnected — waiting for reconnection...',
    countdownSeconds: 28,
    match: {
      id: 'match_burg42',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'BIDDING',
      config: streetConfig,
      roundIndex: 2,
      myPlayerId: 'p1',
      players: [
        {
          ...baseP1,
          budget: 7,
          dish: [
            { roundIndex: 0, slot: 'BUN', ingredient: brioche, wonVia: 'UNCONTESTED', pricePaid: 4 },
            { roundIndex: 1, slot: 'PATTY', ingredient: wagyu, wonVia: 'HIGH_BID', pricePaid: 9 },
          ],
        },
        {
          ...baseP2,
          budget: 18,
          connected: false, // Disconnected
          disconnectedAt: Date.now() - 2000,
          dish: [
            { roundIndex: 0, slot: 'BUN', ingredient: sesame, wonVia: 'UNCONTESTED', pricePaid: 2 },
            { roundIndex: 1, slot: 'PATTY', ingredient: basicPatty, wonVia: 'FALLBACK_LOSS', pricePaid: 0 },
          ],
        },
      ],
      currentRound: {
        roundIndex: 2,
        slot: 'SAUCE',
        availableIngredients: sauceVariants,
        bidsLockedByPlayer: { p1: false, p2: false },
        myLockedBid: null,
        resolution: null,
        startedAt: Date.now() - 2000,
        deadlineAt: Date.now() + 13000,
      },
      remainingStock: {},
      result: null,
      serverNow: Date.now(),
      stateEnteredAt: Date.now() - 2000,
      stateDeadlineAt: Date.now() + 13000,
    },
  },

  ERROR_EMPTY_STATE: {
    key: 'ERROR_EMPTY_STATE',
    label: '14. Error / Empty State (Room Not Found)',
    myPlayerId: 'p1',
    opponentPlayerId: 'p2',
    match: null,
    error: {
      code: 'ROOM_NOT_FOUND',
      message: 'Kitchen room "BURG42" was not found or has expired. Please check the code and try again.',
    },
  },
};
