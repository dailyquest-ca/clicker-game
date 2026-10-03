// Shared types for the game rules. Nothing in src/core or src/content may touch the browser,
// so the simulator and tests can run the exact same rules headless.

export type GoodId = 'hay' | 'egg' | 'log';
export type ChoreId = 'hay' | 'eggs' | 'logs' | 'rummage';
export type Slot = 'head' | 'body' | 'hands' | 'feet' | 'trinket';
export type ShopId = 'hen' | 'porridge' | 'whetstone' | 'basket' | 'axe' | 'saw' | 'henhouse' | 'barn' | 'rake';
export type TraditionId = 'shoulders' | 'knack' | 'gab' | 'hardy' | 'sentimental' | 'familyHen' | 'contacts';
export type TabId = 'work' | 'market' | 'shop' | 'manor' | 'belongings' | 'family' | 'fair' | 'stats';

/** Every source of bonuses speaks this shape. Percentages add within a source (25 = +25%). */
export interface Bonuses {
  hayPct: number;
  eggPct: number;
  logPct: number;
  rummagePct: number;
  workPct: number;
  pricePct: number;
  luckPct: number;
  pips: number;
  barn: number;
}

export interface GoodDef {
  id: GoodId;
  name: string;
  plural: string;
  price: number; // pennies
}

export interface ChoreDef {
  id: ChoreId;
  name: string;
  /** What one finished batch produces (rummage produces finds instead). */
  good: GoodId | null;
  work: number; // work units per batch
  bonus: keyof Bonuses;
  flavor: string;
}

export interface ShopDef {
  id: ShopId;
  name: string;
  desc: string;
  cost: number;
  growth: number;
  max: number;
  flavor: string;
}

export interface TraditionDef {
  id: TraditionId;
  name: string;
  desc: string;
  cost: number;
  growth: number;
  max: number;
}

export interface ItemDef {
  id: string;
  name: string;
  slot: Slot;
  stats: Partial<Bonuses>;
  flavor: string;
  /** Sale value in pennies when an heir sells it toward the debt. */
  value: number;
}

export interface SetDef {
  id: string;
  name: string;
  items: string[];
  bonus: Partial<Bonuses>;
  flavor: string;
}

export interface ItemInstance {
  uid: number;
  id: string;
  level: number;
}

export type LogKind = 'info' | 'good' | 'bad' | 'loot' | 'secret' | 'story';

export interface LogEntry {
  t: number;
  text: string;
  kind: LogKind;
}

export interface LifeRecord {
  life: number;
  name: string;
  seconds: number;
  paid: number;
  heriot: number;
  epitaph: string;
}

export interface Rumour {
  good: GoodId;
  mult: number;
}

export interface TitheResult {
  year: number;
  met: boolean;
  /** Pennies taken as a fine. */
  fine: number;
  /** Pennies written into the Steward's Book (added to the debt) because you couldn't pay the fine. */
  booked: number;
}

export interface FairResult {
  contest: string;
  score: number;
  target: number;
  won: boolean;
}

export interface GameState {
  v: number;
  rngState: number;
  nextUid: number;
  /** Real wall-clock ms of the last tick, for offline catch-up. */
  lastSeen: number;

  totalTime: number;
  lifeTime: number;
  life: number; // 1-based generation
  name: string;
  /** Waiting on the heir screen: nothing happens until the player passes the pitchfork on. */
  dead: boolean;

  // ---- this life ----
  pennies: number;
  goods: Record<GoodId, number>;
  owned: Record<ShopId, number>;
  pips: Record<ChoreId, number>; // stamina pips assigned to each chore
  progress: Record<ChoreId, number>; // work done toward the next batch
  batches: Record<ChoreId, number>; // batches finished this life
  practice: Record<ChoreId, number>; // pip-seconds worked this life
  yearsPaid: number; // Michaelmases passed this life
  paidThisLife: number;
  soldThisLife: number;
  earnedThisLife: number;
  savingFor: ShopId | null;
  standing: Record<GoodId, number | null>; // standing order: keep N, sell the rest (null = off)
  basket: boolean; // reserve goods for the coming tithe
  inventory: ItemInstance[];
  equipped: Record<Slot, ItemInstance | null>;
  peddler: { item: string; price: number } | null;
  fairContest: string | null;
  fairEntered: boolean;
  lastFair: FairResult | null;
  lastTithe: TitheResult | null;
  wastedGoods: number;

  // ---- the family (persists across lives) ----
  debtPaid: number;
  debtExtra: number; // added by missed tithes ("written in the Steward's Book")
  lore: number;
  loreGranted: number;
  traditions: Record<TraditionId, number>;
  knowHow: Record<ChoreId, number>; // best practice level any Hob reached
  milestones: number[]; // indexes reached
  demandsDone: string[];
  cardsSeen: string[];
  cardQueue: string[];
  tabs: TabId[];
  discoveredSets: string[];
  seenItems: string[];
  contestWins: Record<string, number>;
  titles: string[];
  rumour: Rumour | null; // takes effect next year
  prices: Partial<Record<GoodId, number>>; // this year's multipliers
  flags: Record<string, boolean>;
  chronicle: LifeRecord[];
  records: {
    soldTotal: number;
    earnedTotal: number;
    tithesMet: number;
    tithesMissed: number;
    itemsFound: number;
    purchases: number;
  };
  log: LogEntry[];
}
