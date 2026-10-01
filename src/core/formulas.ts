import { BALANCE } from './balance';
import { BOSSES } from '../content/bosses';
import { CHORES } from '../content/chores';
import { ITEMS, SETS, itemDef } from '../content/items';
import { ACHIEVEMENTS, ACHIEVEMENT_BONUS_PCT, PERKS, UPGRADES } from '../content/upgrades';
import type {
  Bonuses,
  BossDef,
  ChoreDef,
  GameState,
  ItemInstance,
  PerkDef,
  SetDef,
  Slot,
  UpgradeDef,
  ZoneDef,
} from './types';

export const SLOTS: Slot[] = ['head', 'body', 'weapon', 'feet', 'trinket'];

export function emptyBonuses(): Bonuses {
  return { powerFlat: 0, guardFlat: 0, powerPct: 0, guardPct: 0, goldPct: 0, dropPct: 0, regenPct: 0, capPct: 0 };
}

function addInto(target: Bonuses, src: Partial<Bonuses>, times = 1): void {
  for (const key of Object.keys(src) as (keyof Bonuses)[]) {
    target[key] += (src[key] ?? 0) * times;
  }
}

// ---------- Chores ----------

export function choreCost(def: ChoreDef, level: number, rebirths: number): number {
  return def.baseCost * Math.pow(level + 1, BALANCE.choreCostExponent) * Math.pow(BALANCE.muscleMemory, rebirths);
}

export function choreUnlocked(state: GameState, def: ChoreDef): boolean {
  if (!def.unlock) return true;
  return state.chores[def.unlock.chore].level >= def.unlock.level;
}

/** Stat gained per unit of stamina-second at the chore's current level. Smart players compare these. */
export function choreEfficiency(state: GameState, def: ChoreDef): number {
  return def.perLevel / choreCost(def, state.chores[def.id].level, state.rebirths);
}

// ---------- Items ----------

export function scaledItemStats(item: ItemInstance): Partial<Bonuses> {
  const def = itemDef(item.id);
  const mult = 1 + (BALANCE.itemLevelPct / 100) * item.level;
  const out: Partial<Bonuses> = {};
  for (const key of Object.keys(def.stats) as (keyof Bonuses)[]) {
    const v = def.stats[key] ?? 0;
    // Downsides don't grow with level; upsides do.
    out[key] = v > 0 ? v * mult : v;
  }
  return out;
}

export function activeSets(equipped: Record<Slot, ItemInstance | null>): SetDef[] {
  const ids = new Set(SLOTS.map((s) => equipped[s]?.id).filter((x): x is string => !!x));
  return SETS.filter((set) => set.items.every((i) => ids.has(i)));
}

export function inventorySize(state: GameState): number {
  return BALANCE.baseInventory + BALANCE.packMuleSlots * state.perks.packMule;
}

// ---------- Bonus groups ----------
// Three separate multiplier groups: gear (items, sets, achievements), market, perks (expressed as an equivalent %).
// Percentages add inside a group and multiply across groups, so +10% in an empty group can beat +15% in a crowded one.

export interface BonusGroups {
  gear: Bonuses;
  market: Bonuses;
  perks: Bonuses;
}

export function bonusGroups(state: GameState): BonusGroups {
  const gear = emptyBonuses();
  for (const slot of SLOTS) {
    const item = state.equipped[slot];
    if (item) addInto(gear, scaledItemStats(item));
  }
  for (const set of activeSets(state.equipped)) addInto(gear, set.bonus);
  const ach = state.achievements.length * ACHIEVEMENT_BONUS_PCT;
  gear.powerPct += ach;
  gear.guardPct += ach;

  const market = emptyBonuses();
  for (const up of UPGRADES) addInto(market, up.perLevel, state.upgrades[up.id]);

  // Perks compound: each level multiplies (×1.15, ×1.15², …). That is the snowball rebirths are for.
  const perks = emptyBonuses();
  for (const perk of PERKS) {
    if (!perk.perLevel) continue;
    for (const key of Object.keys(perk.perLevel) as (keyof Bonuses)[]) {
      const per = perk.perLevel[key] ?? 0;
      const compounded = (1 + perks[key] / 100) * Math.pow(1 + per / 100, state.perks[perk.id]);
      perks[key] = (compounded - 1) * 100;
    }
  }

  return { gear, market, perks };
}

function mult(groups: BonusGroups, key: keyof Bonuses): number {
  const m = (pct: number) => Math.max(0.1, 1 + pct / 100);
  return m(groups.gear[key]) * m(groups.market[key]) * m(groups.perks[key]);
}

export interface Stats {
  chorePower: number;
  choreGuard: number;
  power: number;
  guard: number;
  maxHp: number;
  cap: number;
  regen: number;
  goldMult: number;
  dropMult: number;
  recovery: number;
  powerMult: number;
  guardMult: number;
}

export function computeStats(state: GameState): Stats {
  let chorePower = 0;
  let choreGuard = 0;
  for (const def of CHORES) {
    const gained = state.chores[def.id].level * def.perLevel;
    if (def.stat === 'power') chorePower += gained;
    else choreGuard += gained;
  }
  const groups = bonusGroups(state);
  const powerMult = mult(groups, 'powerPct');
  const guardMult = mult(groups, 'guardPct');
  const power = Math.max(0, (chorePower + groups.gear.powerFlat) * powerMult);
  const guard = Math.max(0, (choreGuard + groups.gear.guardFlat) * guardMult);
  return {
    chorePower,
    choreGuard,
    power,
    guard,
    maxHp: maxHp(guard),
    cap: BALANCE.staminaCap * mult(groups, 'capPct'),
    regen: BALANCE.staminaRegen * mult(groups, 'regenPct'),
    goldMult: mult(groups, 'goldPct'),
    dropMult: mult(groups, 'dropPct'),
    recovery: recoveryTime(guard),
    powerMult,
    guardMult,
  };
}

// ---------- Combat ----------

export function maxHp(guard: number): number {
  return BALANCE.baseHp + BALANCE.hpPerGuard * guard;
}

/** Damage per second you take. Guard has diminishing returns: atk² / (atk + guard). */
export function damageTaken(atk: number, guard: number): number {
  if (atk <= 0) return 0;
  return (atk * atk) / (atk + guard);
}

export function recoveryTime(guard: number): number {
  return BALANCE.recoveryBase + (BALANCE.recoveryExtra * BALANCE.recoveryGuardScale) / (BALANCE.recoveryGuardScale + guard);
}

export interface FightPrediction {
  /** Seconds for you to beat the boss. */
  ttk: number;
  /** Seconds the boss needs to beat you. */
  ttd: number;
  win: boolean;
}

export function predictFight(stats: Stats, boss: BossDef): FightPrediction {
  const ttk = stats.power > 0 ? boss.hp / stats.power : Infinity;
  const taken = damageTaken(boss.atk, stats.guard);
  const ttd = taken > 0 ? stats.maxHp / taken : Infinity;
  return { ttk, ttd, win: ttk < ttd && ttk <= BALANCE.fightTimeout };
}

export function nextBoss(state: GameState): BossDef | null {
  return BOSSES[state.bossesBeaten] ?? null;
}

// ---------- Economy ----------

export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.growth, level));
}

export function perkCost(def: PerkDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.growth, level));
}

/** Memories before the age factor: bosses beaten this life plus a little for chore levels. */
export function rawMemories(state: GameState): number {
  let total = 0;
  for (let i = 0; i < state.bossesBeaten; i++) total += BOSSES[i]?.memories ?? 0;
  let levels = 0;
  for (const def of CHORES) levels += state.chores[def.id].level;
  return total + Math.floor(levels / BALANCE.choreLevelsPerMemory);
}

/**
 * Fraction of memories you keep. They ripen with age (squared, so a life cut short loses a lot),
 * fully at memoryRipenSeconds. After that, staying only pays if another boss is within reach.
 */
export function ripeness(lifeTime: number): number {
  return Math.min(1, Math.pow(lifeTime / BALANCE.memoryRipenSeconds, 2));
}

export function memoriesIfRebirth(state: GameState): number {
  return Math.floor(rawMemories(state) * ripeness(state.lifeTime));
}

/** Memories per minute if you rebirth now (unrounded). Its peak marks the best moment to rebirth. */
export function memoryRate(state: GameState): number {
  if (state.lifeTime <= 0) return 0;
  return (rawMemories(state) * ripeness(state.lifeTime)) / (state.lifeTime / 60);
}

export function canRebirth(state: GameState): boolean {
  return state.bossesBeaten >= BALANCE.rebirthMinBosses;
}

export function ageYears(lifeTime: number): number {
  return Math.floor(BALANCE.startAge + lifeTime / BALANCE.secondsPerYear);
}

export function connectionsGold(level: number): number {
  return level <= 0 ? 0 : BALANCE.connectionsGold * Math.pow(4, level - 1);
}

// ---------- "What if" previews for tooltips ----------

/** Shallow copy with the parts that affect stats copied, so a hypothetical change can be scored. */
export function cloneForPreview(state: GameState): GameState {
  return {
    ...state,
    chores: { ...state.chores, hay: { ...state.chores.hay }, dodge: { ...state.chores.dodge }, goat: { ...state.chores.goat }, punch: { ...state.chores.punch } },
    upgrades: { ...state.upgrades },
    perks: { ...state.perks },
    equipped: { ...state.equipped },
    achievements: [...state.achievements],
  };
}

export function previewStats(state: GameState, change: (s: GameState) => void): { before: Stats; after: Stats } {
  const before = computeStats(state);
  const copy = cloneForPreview(state);
  change(copy);
  return { before, after: computeStats(copy) };
}

export function validateContent(): string[] {
  const problems: string[] = [];
  const itemIds = new Set(ITEMS.map((i) => i.id));
  for (const set of SETS) for (const i of set.items) if (!itemIds.has(i)) problems.push(`set ${set.id} references ${i}`);
  for (const set of SETS) {
    const slots = set.items.map((i) => itemDef(i).slot);
    if (new Set(slots).size !== slots.length) problems.push(`set ${set.id} needs two items in one slot`);
  }
  if (new Set(ACHIEVEMENTS.map((a) => a.id)).size !== ACHIEVEMENTS.length) problems.push('duplicate achievement id');
  return problems;
}

// ---------- Adventure forecasts (shown in the UI; the simulator uses the same maths) ----------

export interface ZoneForecast {
  /** Fraction of time you're on your feet (the rest is recovery). */
  alive: number;
  killsPerMin: number;
  goldPerMin: number;
  dropsPerMin: number;
}

export function zoneForecast(stats: Stats, zone: ZoneDef): ZoneForecast {
  const net = damageTaken(zone.atk, stats.guard) - (BALANCE.adventureRegenPct / 100) * stats.maxHp;
  let alive = 1;
  if (net > 0) {
    const aliveTime = stats.maxHp / net;
    alive = aliveTime / (aliveTime + stats.recovery);
  }
  const killsPerMin = (60 * alive * stats.power) / zone.hp;
  return {
    alive,
    killsPerMin,
    goldPerMin: killsPerMin * zone.gold * stats.goldMult,
    dropsPerMin: killsPerMin * Math.min(0.95, zone.dropChance * stats.dropMult),
  };
}
