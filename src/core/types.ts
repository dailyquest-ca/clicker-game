// Shared types for the game rules. Nothing in src/core or src/content may touch the browser,
// so the simulator and tests can run the exact same rules headless.

export type Stat = 'power' | 'guard';
export type ChoreId = 'hay' | 'dodge' | 'goat' | 'punch';
export type Slot = 'head' | 'body' | 'weapon' | 'feet' | 'trinket';
export type UpgradeId = 'porridge' | 'bucket' | 'whetstone' | 'padding' | 'haggle' | 'eyes';
export type PerkId =
  | 'habit'
  | 'strongBack'
  | 'thickSkin'
  | 'secondWind'
  | 'deepLungs'
  | 'packMule'
  | 'magpie'
  | 'autoMerge'
  | 'connections';
export type Feature = 'market' | 'adventure' | 'rebirth';

/** Every source of bonuses speaks this shape. Percentages are additive within their group (25 = +25%). */
export interface Bonuses {
  powerFlat: number;
  guardFlat: number;
  powerPct: number;
  guardPct: number;
  goldPct: number;
  dropPct: number;
  regenPct: number;
  capPct: number;
}

export interface ChoreDef {
  id: ChoreId;
  name: string;
  stat: Stat;
  perLevel: number;
  baseCost: number;
  unlock?: { chore: ChoreId; level: number };
  flavor: string;
}

export type Archetype = 'Tanky' | 'Hard hitter' | 'Balanced';

export interface BossDef {
  name: string;
  archetype: Archetype;
  hp: number;
  atk: number;
  gold: number;
  memories: number;
  taunt: string;
  defeat: string;
  /** Shown in the log when this boss beats you. */
  victory: string;
}

export interface ZoneDef {
  name: string;
  unlockBoss: number; // bosses beaten this life required
  enemies: string[];
  hp: number;
  atk: number;
  gold: number;
  dropChance: number;
  loot: { item: string; weight: number }[];
  flavor: string;
}

export interface ItemDef {
  id: string;
  name: string;
  slot: Slot;
  stats: Partial<Bonuses>;
  flavor: string;
}

export interface SetDef {
  id: string;
  name: string;
  items: string[];
  bonus: Partial<Bonuses>;
  flavor: string;
}

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  /** Bonus granted per level. */
  perLevel: Partial<Bonuses>;
  baseCost: number;
  growth: number;
  flavor: string;
}

export interface PerkDef {
  id: PerkId;
  name: string;
  desc: string;
  perLevel?: Partial<Bonuses>;
  baseCost: number;
  growth: number;
  maxLevel: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  secret: boolean;
}

export interface ItemInstance {
  uid: number;
  id: string;
  level: number;
}

export type LogKind = 'info' | 'good' | 'bad' | 'loot' | 'secret';

export interface LogEntry {
  t: number;
  text: string;
  kind: LogKind;
}

export interface FightState {
  boss: number;
  bossHp: number;
  hp: number;
  maxHp: number;
  t: number;
  result: null | 'win' | 'lose';
  dealt: number;
}

export interface AdventureState {
  zone: number | null;
  enemy: string;
  enemyHp: number;
  hp: number;
  deadFor: number;
  kills: number;
}

export interface LifeRecord {
  life: number;
  seconds: number;
  bosses: number;
  memories: number;
  power: number;
  guard: number;
  epitaph: string;
}

export interface GameState {
  v: number;
  rngState: number;
  nextUid: number;
  /** Real wall-clock ms of the last tick, for offline catch-up. */
  lastSeen: number;

  totalTime: number;
  lifeTime: number;
  rebirths: number;

  stamina: { idle: number; assigned: Record<ChoreId, number> };
  chores: Record<ChoreId, { level: number; progress: number }>;
  gold: number;

  bossesBeaten: number; // this life
  fight: FightState | null;
  adventure: AdventureState;

  inventory: ItemInstance[];
  equipped: Record<Slot, ItemInstance | null>;

  upgrades: Record<UpgradeId, number>;
  memories: number;
  perks: Record<PerkId, number>;

  unlocked: Record<Feature, boolean>;
  discoveredSets: string[];
  seenItems: string[];
  achievements: string[];

  life: {
    bossTimes: number[];
    peakRate: number;
    peakRateAt: number;
    fightsStarted: number;
    /** totalTime when we last complained about a full sack (keeps the log readable). */
    sackFullNotice?: number;
  };
  records: {
    bestBossEver: number;
    /** totalTime when each boss was first beaten (any life). */
    firstReach: number[];
    totalKills: number;
    totalGold: number;
    itemsFound: number;
    memoriesEarned: number;
  };
  chronicle: LifeRecord[];
  log: LogEntry[];
}
