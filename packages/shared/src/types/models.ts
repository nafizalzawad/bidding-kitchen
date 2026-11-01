export type TierId = 'STREET' | 'BISTRO' | 'CHEFS_TABLE';

export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type SlotType =
  | 'BUN'
  | 'PATTY'
  | 'SAUCE'
  | 'CHEESE'
  | 'TOPPING'
  | 'DOUGH'
  | 'PIZZA_SAUCE'
  | 'PIZZA_CHEESE'
  | 'MAIN_TOPPING'
  | 'FINISH'
  | 'CUT'
  | 'SIDE'
  | 'STEAK_SAUCE'
  | 'GARNISH'
  | 'DRINK'
  | 'DESSERT';

export type FlavorTag = 'SMOKY' | 'SPICY' | 'RICH' | 'CRISPY' | 'FRESH';

export type MatchState =
  | 'LOBBY'
  | 'TIER_CONFIRMED'
  | 'MATCH_INTRO'
  | 'ROUND_REVEAL'
  | 'BIDDING'
  | 'LOCKED'
  | 'RESOLVE'
  | 'ROUND_END'
  | 'FINAL_REVEAL'
  | 'POST_MATCH';

export interface Ingredient {
  id: string;
  tier: TierId;
  slot: SlotType;
  name: string;
  basePrice: number;
  tasteScore: number;
  tags: FlavorTag[];
  stock: 1 | 2 | 99;
  isBasic: boolean;
  iconKey: string;
}

export interface TierDefinition {
  id: TierId;
  name: string;
  dishName: string;
  startingBudget: number;
  slots: SlotType[];
  roundsCount: number;
  mvpEnabled: boolean;
}

export interface CustomerOrder {
  id: string;
  title: string;
  description: string;
  bonusPoints: 5;
  requiredTags?: FlavorTag[];
  minTagCount?: number;
  forbiddenSlotNonBasic?: SlotType;
}

export interface Bid {
  playerId: string;
  roundIndex: number;
  ingredientId: string;
  amount: number;
  lockedAt: number;
  isAutoTimeoutBid: boolean;
}

export interface AwardedIngredient {
  roundIndex: number;
  slot: SlotType;
  ingredient: Ingredient;
  pricePaid: number;
  wonVia:
    | 'UNCONTESTED'
    | 'HIGH_BID'
    | 'TIEBREAK_BUDGET'
    | 'TIEBREAK_COINFLIP'
    | 'FALLBACK_LOSS'
    | 'TIMEOUT_BASIC';
}

export interface Player {
  id: string;
  reconnectToken: string;
  nickname: string;
  seat: 0 | 1;
  ready: boolean;
  connected: boolean;
  disconnectedAt: number | null;
  budget: number;
  dish: AwardedIngredient[];
  secretOrder: CustomerOrder | null;
  chefsTipGranted: boolean;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
}

export type CollisionOutcomeType =
  | 'NO_COLLISION'
  | 'COLLISION_HIGH_BID'
  | 'COLLISION_TIE_BUDGET'
  | 'COLLISION_TIE_COINFLIP';

export interface RoundResolution {
  roundIndex: number;
  slot: SlotType;
  bidsByPlayer: Record<string, Bid>;
  outcomeType: CollisionOutcomeType;
  awardsByPlayer: Record<string, AwardedIngredient>;
  budgetsBeforeRound: Record<string, number>;
  budgetsAfterRound: Record<string, number>;
  chefsTipAwardedToPlayerId: string | null;
}

export interface Round {
  roundIndex: number;
  slot: SlotType;
  availableIngredients: Ingredient[];
  bidsLockedByPlayer: Record<string, boolean>;
  privateBids: Record<string, Bid>;
  resolution: RoundResolution | null;
  startedAt: number;
  deadlineAt: number;
}

export type ComboId = 'SMOKEHOUSE' | 'HOT_AND_DECADENT' | 'CRUNCH_CONTRAST' | 'CHEFS_PRIDE';

export interface ComboAward {
  id: ComboId;
  name: string;
  points: number;
  description: string;
}

export interface ScoreBreakdown {
  playerId: string;
  tastePoints: number;
  combos: ComboAward[];
  comboPoints: number;
  orderCompleted: boolean;
  orderBonusPoints: number;
  leftoverBudget: number;
  leftoverMoneyRawBonus: number;
  leftoverMoneyBonus: number;
  totalSpent: number;
  finalScore: number;
  generatedDishName: string;
}

export interface Result {
  winnerId: string | null;
  winReason: 'SCORE' | 'SPENT_LESS_TIEBREAK' | 'COINFLIP_TIEBREAK' | 'FORFEIT';
  forfeitedByPlayerId: string | null;
  winnerTitle: string;
  scoresByPlayer: Record<string, ScoreBreakdown>;
  roundHistory: RoundResolution[];
  keyMomentText: string;
}

export interface MatchConfig {
  stockMode: 'ALL_COLLISIONS_CONTEST' | 'STOCK_LIMITED_ONLY';
  uncontestedPaysBasePrice: boolean;
  enableCustomerOrders: boolean;
  enableChefsTip: boolean;
  showOpponentBudget: boolean;
  biddingDurationMs: number;
  reconnectWindowMs: number;
}

export interface Match {
  id: string;
  roomCode: string;
  seed: number;
  tier: TierId;
  state: MatchState;
  config: MatchConfig;
  roundIndex: number;
  players: [Player | null, Player | null];
  rounds: Round[];
  remainingStock: Record<string, number>;
  result: Result | null;
  stateEnteredAt: number;
  stateDeadlineAt: number;
  createdAt: number;
}

export interface PublicPlayerView {
  id: string;
  nickname: string;
  seat: 0 | 1;
  ready: boolean;
  connected: boolean;
  disconnectedAt: number | null;
  budget: number | null;
  dish: AwardedIngredient[];
  secretOrder: CustomerOrder | null;
  chefsTipGranted: boolean;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
}

export interface PublicRoundView {
  roundIndex: number;
  slot: SlotType;
  availableIngredients: Ingredient[];
  bidsLockedByPlayer: Record<string, boolean>;
  myLockedBid: Bid | null;
  resolution: RoundResolution | null;
  startedAt: number;
  deadlineAt: number;
}

export interface PublicMatchView {
  id: string;
  roomCode: string;
  tier: TierId;
  state: MatchState;
  config: MatchConfig;
  roundIndex: number;
  myPlayerId: string;
  players: [PublicPlayerView | null, PublicPlayerView | null];
  currentRound: PublicRoundView | null;
  remainingStock: Record<string, number>;
  result: Result | null;
  serverNow: number;
  stateEnteredAt: number;
  stateDeadlineAt: number;
}
